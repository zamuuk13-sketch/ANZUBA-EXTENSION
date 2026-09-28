(() => {
  const STORAGE_KEY = "storage";
  const DEFAULT_STORAGE = {
    version: 1,
    quotaMB: 512,
    entries: {},
    updatedAt: null
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  function estimateBytes(value) {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return String(value ?? "").length;
    }
  }

  async function getState(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;

    if (!data[STORAGE_KEY] || typeof data[STORAGE_KEY] !== "object") {
      const initial = clone(DEFAULT_STORAGE);
      await window.ANZUBA_PROJECTS.setData({ [STORAGE_KEY]: initial }, pid);
      return initial;
    }

    const stored = data[STORAGE_KEY];
    return {
      ...clone(DEFAULT_STORAGE),
      ...clone(stored),
      quotaMB: Math.max(1, Number(stored.quotaMB || DEFAULT_STORAGE.quotaMB)),
      entries: stored.entries && typeof stored.entries === "object"
        ? clone(stored.entries)
        : {}
    };
  }

  async function saveState(state, id) {
    const pid = projectId(id);
    if (!pid || !state) return false;

    const next = {
      ...clone(DEFAULT_STORAGE),
      ...clone(state),
      quotaMB: Math.max(1, Number(state.quotaMB || DEFAULT_STORAGE.quotaMB)),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [STORAGE_KEY]: next }, pid);
    return true;
  }

  function normalizeKey(key) {
    const value = String(key ?? "").trim();
    if (!value || value.length > 256 || value.includes("..")) return null;
    return value;
  }

  async function get(key, id) {
    const state = await getState(id);
    const normalized = normalizeKey(key);
    if (!state || !normalized || !Object.prototype.hasOwnProperty.call(state.entries, normalized)) {
      return null;
    }
    return clone(state.entries[normalized].value);
  }

  async function set(key, value, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeKey(key);
    if (!state || !normalized) throw new Error("Chave de armazenamento inválida.");

    const nextEntry = {
      value: clone(value),
      sizeBytes: estimateBytes(value),
      updatedAt: new Date().toISOString()
    };

    const previousBytes = state.entries[normalized]?.sizeBytes || 0;
    const currentBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const nextBytes = currentBytes - previousBytes + nextEntry.sizeBytes;
    const quotaBytes = state.quotaMB * 1024 * 1024;

    if (nextBytes > quotaBytes) {
      throw new Error("Quota de armazenamento virtual excedida.");
    }

    state.entries[normalized] = nextEntry;
    await saveState(state, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-updated", {
      detail: { projectId: pid, key: normalized }
    }));

    return true;
  }

  async function remove(key, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeKey(key);
    if (!state || !normalized || !Object.prototype.hasOwnProperty.call(state.entries, normalized)) {
      return false;
    }

    delete state.entries[normalized];
    await saveState(state, pid);
    return true;
  }

  async function list(prefix = "", id) {
    const state = await getState(id);
    if (!state) return [];

    const value = String(prefix ?? "");
    return Object.keys(state.entries)
      .filter(key => key.startsWith(value))
      .sort();
  }

  async function clear(id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return false;

    state.entries = {};
    await saveState(state, pid);
    return true;
  }

  async function setQuota(quotaMB, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return null;

    const quota = Number(quotaMB);
    if (!Number.isInteger(quota) || quota < 1) {
      throw new Error("Quota de armazenamento inválida.");
    }

    const usedBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);

    if (usedBytes > quota * 1024 * 1024) {
      throw new Error("A nova quota é menor que o armazenamento em uso.");
    }

    state.quotaMB = quota;
    await saveState(state, pid);
    return state;
  }

  async function status(id) {
    const state = await getState(id);
    if (!state) return null;

    const usedBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const quotaBytes = state.quotaMB * 1024 * 1024;

    return {
      version: state.version,
      quotaMB: state.quotaMB,
      usedBytes,
      freeBytes: Math.max(0, quotaBytes - usedBytes),
      usagePercent: Math.round((usedBytes / quotaBytes) * 10000) / 100,
      entries: Object.keys(state.entries).length,
      updatedAt: state.updatedAt
    };
  }

  window.ANZUBA_STORAGE = {
    defaults: clone(DEFAULT_STORAGE),
    get,
    set,
    remove,
    list,
    clear,
    setQuota,
    status
  };

  window.ANZUBA_AI_BRIDGE?.on("storage.get", ({ key, id } = {}) => get(key, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.set", ({ key, value, id } = {}) => set(key, value, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.remove", ({ key, id } = {}) => remove(key, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.list", ({ prefix, id } = {}) => list(prefix, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.clear", ({ id } = {}) => clear(id));
  window.ANZUBA_AI_BRIDGE?.on("storage.quota.set", ({ quotaMB, id } = {}) => setQuota(quotaMB, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.status", ({ id } = {}) => status(id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) getState(active.id).catch(() => {});
  }, 0);
})();