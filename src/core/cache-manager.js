(() => {
  const CACHE_KEY = "cache";
  const DEFAULT_CACHE = {
    version: 1,
    quotaMB: 128,
    entries: {},
    updatedAt: null
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  async function getState(id) {
    const pid = projectId(id);
    if (!pid) return null;
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;
    const stored = data[CACHE_KEY];
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      const initial = clone(DEFAULT_CACHE);
      await window.ANZUBA_PROJECTS.setData({ [CACHE_KEY]: initial }, pid);
      return initial;
    }
    return {
      ...clone(DEFAULT_CACHE),
      ...clone(stored),
      quotaMB: Math.max(1, Number(stored.quotaMB || DEFAULT_CACHE.quotaMB)),
      entries: stored.entries && typeof stored.entries === "object" && !Array.isArray(stored.entries)
        ? clone(stored.entries) : {}
    };
  }

  async function saveState(state, id) {
    const pid = projectId(id);
    if (!pid || !state) return false;
    const next = {
      ...clone(DEFAULT_CACHE),
      ...clone(state),
      quotaMB: Math.max(1, Number(state.quotaMB || DEFAULT_CACHE.quotaMB)),
      updatedAt: new Date().toISOString()
    };
    await window.ANZUBA_PROJECTS.setData({ [CACHE_KEY]: next }, pid);
    return true;
  }

  function normalizeKey(key) {
    const value = String(key ?? "").trim();
    if (!value || value.length > 256 || value.includes("..")) return null;
    return value;
  }

  function estimateBytes(value) {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return String(value ?? "").length;
    }
  }

  function nowMs() {
    return Date.now();
  }

  function isExpired(entry, now = nowMs()) {
    return Number.isFinite(entry.expiresAt) && entry.expiresAt > 0 && entry.expiresAt <= now;
  }

  async function get(key, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeKey(key);
    if (!state || !normalized) return null;
    const entry = state.entries[normalized];
    if (!entry) return null;
    if (isExpired(entry)) {
      delete state.entries[normalized];
      await saveState(state, pid);
      return null;
    }
    entry.hits = Number(entry.hits || 0) + 1;
    entry.lastAccessedAt = new Date().toISOString();
    await saveState(state, pid);
    return clone(entry.value);
  }

  async function set(key, value, options = {}, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeKey(key);
    if (!state || !normalized) throw new Error("Chave de cache inválida.");

    const ttlMs = options.ttlMs == null ? 0 : Number(options.ttlMs);
    if (!Number.isFinite(ttlMs) || ttlMs < 0) throw new Error("TTL de cache inválido.");

    const nextEntry = {
      value: clone(value),
      sizeBytes: estimateBytes(value),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      hits: 0,
      expiresAt: ttlMs > 0 ? nowMs() + ttlMs : 0
    };

    const previousBytes = Number(state.entries[normalized]?.sizeBytes || 0);
    const currentBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const nextBytes = currentBytes - previousBytes + nextEntry.sizeBytes;
    if (nextBytes > state.quotaMB * 1024 * 1024) {
      throw new Error("Quota de cache virtual excedida.");
    }

    state.entries[normalized] = nextEntry;
    await saveState(state, pid);
    window.dispatchEvent(new CustomEvent("anzuba:cache-updated", {
      detail: { projectId: pid, key: normalized, action: "set" }
    }));
    return true;
  }

  async function remove(key, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeKey(key);
    if (!state || !normalized || !state.entries[normalized]) return false;
    delete state.entries[normalized];
    await saveState(state, pid);
    return true;
  }

  async function list(prefix = "", id) {
    const state = await getState(id);
    if (!state) return [];
    const normalized = String(prefix ?? "");
    return Object.entries(state.entries)
      .filter(([key, entry]) => !isExpired(entry) && key.startsWith(normalized))
      .map(([key, entry]) => ({
        key,
        sizeBytes: Number(entry?.sizeBytes || 0),
        createdAt: entry?.createdAt || null,
        updatedAt: entry?.updatedAt || null,
        lastAccessedAt: entry?.lastAccessedAt || null,
        hits: Number(entry?.hits || 0),
        expiresAt: Number(entry?.expiresAt || 0)
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  async function clear(id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return false;
    state.entries = {};
    await saveState(state, pid);
    window.dispatchEvent(new CustomEvent("anzuba:cache-updated", {
      detail: { projectId: pid, action: "clear" }
    }));
    return true;
  }

  async function purgeExpired(id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return null;
    const before = Object.keys(state.entries).length;
    Object.keys(state.entries).forEach(key => {
      if (isExpired(state.entries[key])) delete state.entries[key];
    });
    const removed = before - Object.keys(state.entries).length;
    if (removed > 0) await saveState(state, pid);
    return removed;
  }

  async function setQuota(quotaMB, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return null;
    const quota = Number(quotaMB);
    if (!Number.isInteger(quota) || quota < 1) throw new Error("Quota de cache inválida.");
    const usedBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    if (usedBytes > quota * 1024 * 1024) {
      throw new Error("A nova quota é menor que o cache em uso.");
    }
    state.quotaMB = quota;
    await saveState(state, pid);
    return status(pid);
  }

  async function status(id) {
    const state = await getState(id);
    if (!state) return null;
    const usedBytes = Object.values(state.entries)
      .filter(entry => !isExpired(entry))
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const quotaBytes = state.quotaMB * 1024 * 1024;
    return {
      version: state.version,
      quotaMB: state.quotaMB,
      usedBytes,
      freeBytes: Math.max(0, quotaBytes - usedBytes),
      usagePercent: Math.round((usedBytes / quotaBytes) * 10000) / 100,
      entries: Object.values(state.entries).filter(entry => !isExpired(entry)).length,
      updatedAt: state.updatedAt
    };
  }

  window.ANZUBA_CACHE = {
    defaults: clone(DEFAULT_CACHE),
    get,
    set,
    remove,
    list,
    clear,
    purgeExpired,
    setQuota,
    status
  };

  window.ANZUBA_AI_BRIDGE?.on("cache.get", ({ key, id } = {}) => get(key, id));
  window.ANZUBA_AI_BRIDGE?.on("cache.set", ({ key, value, options, id } = {}) => set(key, value, options, id));
  window.ANZUBA_AI_BRIDGE?.on("cache.remove", ({ key, id } = {}) => remove(key, id));
  window.ANZUBA_AI_BRIDGE?.on("cache.list", ({ prefix, id } = {}) => list(prefix, id));
  window.ANZUBA_AI_BRIDGE?.on("cache.clear", ({ id } = {}) => clear(id));
  window.ANZUBA_AI_BRIDGE?.on("cache.purge", ({ id } = {}) => purgeExpired(id));
  window.ANZUBA_AI_BRIDGE?.on("cache.quota.set", ({ quotaMB, id } = {}) => setQuota(quotaMB, id));
  window.ANZUBA_AI_BRIDGE?.on("cache.status", ({ id } = {}) => status(id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) getState(active.id).catch(() => {});
  }, 0);
})();