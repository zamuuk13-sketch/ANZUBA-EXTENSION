(() => {
  const STORAGE_KEY = "storage";
  const DEFAULT_STORAGE = {
    version: 2,
    quotaMB: 512,
    entries: {},
    volumes: {
      root: {
        name: "root",
        mount: "/",
        quotaMB: 512,
        mounted: true,
        createdAt: null,
        updatedAt: null
      }
    },
    snapshots: {},
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
      entries: stored.entries && typeof stored.entries === "object" ? clone(stored.entries) : {},
      volumes: stored.volumes && typeof stored.volumes === "object"
        ? clone(stored.volumes)
        : clone(DEFAULT_STORAGE.volumes),
      snapshots: stored.snapshots && typeof stored.snapshots === "object"
        ? clone(stored.snapshots)
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
      snapshots: clone(state.snapshots || {}),
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
    if (!state || !normalized || !Object.prototype.hasOwnProperty.call(state.entries, normalized)) return null;
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

    if (nextBytes > quotaBytes) throw new Error("Quota de armazenamento virtual excedida.");

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
    if (!state || !normalized || !Object.prototype.hasOwnProperty.call(state.entries, normalized)) return false;

    delete state.entries[normalized];
    await saveState(state, pid);
    return true;
  }

  async function list(prefix = "", id) {
    const state = await getState(id);
    if (!state) return [];

    const value = String(prefix ?? "");
    return Object.keys(state.entries).filter(key => key.startsWith(value)).sort();
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
    if (!Number.isInteger(quota) || quota < 1) throw new Error("Quota de armazenamento inválida.");

    const usedBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);

    if (usedBytes > quota * 1024 * 1024) {
      throw new Error("A nova quota é menor que o armazenamento em uso.");
    }

    state.quotaMB = quota;
    await saveState(state, pid);
    return state;
  }

  function normalizeVolumeName(name) {
    const value = String(name ?? "").trim().toLowerCase();
    if (!value || value.length > 64 || !/^[a-z0-9_-]+$/.test(value)) return null;
    return value;
  }

  function normalizeVolumeKey(key) {
    const value = normalizeKey(key);
    if (!value) return null;
    return value.replace(/^\/+/, "");
  }

  function volumeEntryKey(volume, key) {
    return `@volume/${volume}/${key}`;
  }

  async function listVolumes(id) {
    const state = await getState(id);
    if (!state) return [];
    return Object.values(state.volumes).map(volume => clone(volume));
  }

  async function createVolume(name, options = {}, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const volume = normalizeVolumeName(name);
    if (!state || !volume) throw new Error("Nome de volume inválido.");
    if (state.volumes[volume]) throw new Error("Volume já existe.");

    const quotaMB = Number(options.quotaMB ?? 128);
    const mount = String(options.mount ?? `/mnt/${volume}`).trim() || `/mnt/${volume}`;
    if (!Number.isInteger(quotaMB) || quotaMB < 1) throw new Error("Quota do volume inválida.");

    const now = new Date().toISOString();
    state.volumes[volume] = {
      name: volume,
      mount,
      quotaMB,
      mounted: false,
      createdAt: now,
      updatedAt: now
    };

    await saveState(state, pid);
    window.dispatchEvent(new CustomEvent("anzuba:storage-volume-updated", {
      detail: { projectId: pid, volume, action: "created" }
    }));
    return clone(state.volumes[volume]);
  }

  async function removeVolume(name, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const volume = normalizeVolumeName(name);
    if (!state || !volume || volume === "root" || !state.volumes[volume]) return false;

    const prefix = `@volume/${volume}/`;
    Object.keys(state.entries)
      .filter(key => key.startsWith(prefix))
      .forEach(key => delete state.entries[key]);

    delete state.volumes[volume];
    await saveState(state, pid);
    window.dispatchEvent(new CustomEvent("anzuba:storage-volume-updated", {
      detail: { projectId: pid, volume, action: "removed" }
    }));
    return true;
  }

  async function setVolumeMounted(name, mounted, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const volume = normalizeVolumeName(name);
    if (!state || !volume || !state.volumes[volume]) return false;

    state.volumes[volume].mounted = Boolean(mounted);
    state.volumes[volume].updatedAt = new Date().toISOString();
    await saveState(state, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-volume-updated", {
      detail: { projectId: pid, volume, action: mounted ? "mounted" : "unmounted" }
    }));
    return clone(state.volumes[volume]);
  }

  async function volumeStatus(name, id) {
    const state = await getState(id);
    const volume = normalizeVolumeName(name);
    if (!state || !volume || !state.volumes[volume]) return null;

    const prefix = `@volume/${volume}/`;
    const entries = Object.entries(state.entries)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, entry]) => entry);
    const usedBytes = entries.reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const quotaBytes = state.volumes[volume].quotaMB * 1024 * 1024;

    return {
      ...clone(state.volumes[volume]),
      usedBytes,
      freeBytes: Math.max(0, quotaBytes - usedBytes),
      usagePercent: Math.round((usedBytes / quotaBytes) * 10000) / 100,
      entries: entries.length
    };
  }

  async function volumeSet(name, key, value, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const volume = normalizeVolumeName(name);
    const normalized = normalizeVolumeKey(key);
    if (!state || !volume || !normalized || !state.volumes[volume]) {
      throw new Error("Volume ou chave inválida.");
    }
    if (!state.volumes[volume].mounted) throw new Error("Volume não está montado.");

    const entryKey = volumeEntryKey(volume, normalized);
    const nextEntry = {
      value: clone(value),
      sizeBytes: estimateBytes(value),
      updatedAt: new Date().toISOString()
    };
    const previousBytes = state.entries[entryKey]?.sizeBytes || 0;
    const volumePrefix = `@volume/${volume}/`;
    const currentBytes = Object.entries(state.entries)
      .filter(([key]) => key.startsWith(volumePrefix))
      .reduce((sum, [, entry]) => sum + Number(entry?.sizeBytes || 0), 0);
    const nextBytes = currentBytes - previousBytes + nextEntry.sizeBytes;
    const quotaBytes = state.volumes[volume].quotaMB * 1024 * 1024;
    const globalCurrentBytes = Object.values(state.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const globalNextBytes = globalCurrentBytes - previousBytes + nextEntry.sizeBytes;
    const globalQuotaBytes = state.quotaMB * 1024 * 1024;

    if (nextBytes > quotaBytes) throw new Error("Quota do volume excedida.");
    if (globalNextBytes > globalQuotaBytes) throw new Error("Quota de armazenamento virtual excedida.");

    state.entries[entryKey] = nextEntry;
    state.volumes[volume].updatedAt = new Date().toISOString();
    await saveState(state, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-volume-updated", {
      detail: { projectId: pid, volume, key: normalized, action: "write" }
    }));
    return true;
  }

  async function volumeGet(name, key, id) {
    const state = await getState(id);
    const volume = normalizeVolumeName(name);
    const normalized = normalizeVolumeKey(key);
    if (!state || !volume || !normalized || !state.volumes[volume] || !state.volumes[volume].mounted) return null;
    const entry = state.entries[volumeEntryKey(volume, normalized)];
    return entry ? clone(entry.value) : null;
  }

  async function volumeList(name, prefix = "", id) {
    const state = await getState(id);
    const volume = normalizeVolumeName(name);
    if (!state || !volume || !state.volumes[volume] || !state.volumes[volume].mounted) return [];

    const normalized = normalizeVolumeKey(prefix) || "";
    const base = `@volume/${volume}/`;
    return Object.keys(state.entries)
      .filter(key => key.startsWith(base))
      .map(key => key.slice(base.length))
      .filter(key => key.startsWith(normalized))
      .sort();
  }

  function normalizeSnapshotName(name) {
    const value = String(name ?? "").trim().toLowerCase();
    if (!value || value.length > 80 || !/^[a-z0-9_-]+$/.test(value)) return null;
    return value;
  }

  async function listSnapshots(id) {
    const state = await getState(id);
    if (!state) return [];
    return Object.values(state.snapshots || {})
      .map(snapshot => ({
        id: snapshot.id,
        name: snapshot.name,
        createdAt: snapshot.createdAt,
        entries: Object.keys(snapshot.entries || {}).length,
        volumes: Object.keys(snapshot.volumes || {}).length
      }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async function createSnapshot(name, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return null;

    const normalized = normalizeSnapshotName(name) || `snapshot-${Date.now()}`;
    if (state.snapshots[normalized]) throw new Error("Snapshot já existe.");

    const snapshot = {
      id: normalized,
      name: normalized,
      createdAt: new Date().toISOString(),
      entries: clone(state.entries),
      volumes: clone(state.volumes)
    };

    state.snapshots[normalized] = snapshot;
    await saveState(state, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-snapshot-updated", {
      detail: { projectId: pid, snapshotId: normalized, action: "created" }
    }));

    return {
      id: snapshot.id,
      name: snapshot.name,
      createdAt: snapshot.createdAt,
      entries: Object.keys(snapshot.entries).length,
      volumes: Object.keys(snapshot.volumes).length
    };
  }

  async function restoreSnapshot(name, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeSnapshotName(name);
    if (!state || !normalized || !state.snapshots[normalized]) return false;

    const snapshot = state.snapshots[normalized];
    state.entries = clone(snapshot.entries || {});
    state.volumes = clone(snapshot.volumes || DEFAULT_STORAGE.volumes);
    await saveState(state, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-snapshot-updated", {
      detail: { projectId: pid, snapshotId: normalized, action: "restored" }
    }));

    return true;
  }

  async function removeSnapshot(name, id) {
    const pid = projectId(id);
    const state = await getState(pid);
    const normalized = normalizeSnapshotName(name);
    if (!state || !normalized || !state.snapshots[normalized]) return false;

    delete state.snapshots[normalized];
    await saveState(state, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-snapshot-updated", {
      detail: { projectId: pid, snapshotId: normalized, action: "removed" }
    }));

    return true;
  }

  async function integrity(id, repair = false) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return null;

    const issues = [];
    const repaired = [];

    if (!state.entries || typeof state.entries !== "object" || Array.isArray(state.entries)) {
      issues.push("entries inválido");
      if (repair) {
        state.entries = {};
        repaired.push("entries");
      }
    }

    if (!state.volumes || typeof state.volumes !== "object" || Array.isArray(state.volumes)) {
      issues.push("volumes inválido");
      if (repair) {
        state.volumes = clone(DEFAULT_STORAGE.volumes);
        repaired.push("volumes");
      }
    }

    if (!state.snapshots || typeof state.snapshots !== "object" || Array.isArray(state.snapshots)) {
      issues.push("snapshots inválido");
      if (repair) {
        state.snapshots = {};
        repaired.push("snapshots");
      }
    }

    const entries = state.entries || {};
    Object.entries(entries).forEach(([key, entry]) => {
      if (!entry || typeof entry !== "object" || !Object.prototype.hasOwnProperty.call(entry, "value")) {
        issues.push(`entrada inválida: ${key}`);
        if (repair) {
          delete entries[key];
          repaired.push(`entry:${key}`);
        }
      }
    });

    const volumes = state.volumes || {};
    if (!volumes.root || typeof volumes.root !== "object") {
      issues.push("volume root ausente");
      if (repair) {
        volumes.root = clone(DEFAULT_STORAGE.volumes.root);
        repaired.push("volume:root");
      }
    }

    Object.entries(state.snapshots || {}).forEach(([name, snapshot]) => {
      if (!snapshot || typeof snapshot !== "object" ||
          !snapshot.entries || typeof snapshot.entries !== "object" ||
          !snapshot.volumes || typeof snapshot.volumes !== "object") {
        issues.push(`snapshot inválido: ${name}`);
        if (repair) {
          delete state.snapshots[name];
          repaired.push(`snapshot:${name}`);
        }
      }
    });

    if (repair && repaired.length) await saveState(state, pid);

    return {
      ok: issues.length === 0,
      repaired: repaired.length > 0,
      issues,
      repairedItems: repaired,
      projectId: pid
    };
  }

  async function exportStorage(id) {
    const pid = projectId(id);
    const state = await getState(pid);
    if (!state) return null;

    return {
      format: "anzuba-storage",
      version: 1,
      exportedAt: new Date().toISOString(),
      projectId: pid,
      storage: clone(state)
    };
  }

  async function importStorage(payload, options = {}, id) {
    const pid = projectId(id);
    const current = await getState(pid);
    if (!current) return null;
    if (!payload || payload.format !== "anzuba-storage" || Number(payload.version) !== 1) {
      throw new Error("Backup de armazenamento inválido.");
    }

    const incoming = payload.storage;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      throw new Error("Dados de armazenamento inválidos.");
    }

    const next = {
      ...clone(DEFAULT_STORAGE),
      ...clone(incoming),
      quotaMB: Math.max(1, Number(incoming.quotaMB || DEFAULT_STORAGE.quotaMB)),
      entries: incoming.entries && typeof incoming.entries === "object" && !Array.isArray(incoming.entries)
        ? clone(incoming.entries)
        : {},
      volumes: incoming.volumes && typeof incoming.volumes === "object" && !Array.isArray(incoming.volumes)
        ? clone(incoming.volumes)
        : clone(DEFAULT_STORAGE.volumes),
      snapshots: incoming.snapshots && typeof incoming.snapshots === "object" && !Array.isArray(incoming.snapshots)
        ? clone(incoming.snapshots)
        : {}
    };

    if (!next.volumes.root || typeof next.volumes.root !== "object") {
      next.volumes.root = clone(DEFAULT_STORAGE.volumes.root);
    }

    const importedBytes = Object.values(next.entries)
      .reduce((sum, entry) => sum + Number(entry?.sizeBytes || 0), 0);
    const quotaBytes = next.quotaMB * 1024 * 1024;
    if (importedBytes > quotaBytes) {
      throw new Error("Backup excede a quota de armazenamento virtual.");
    }

    const replace = options.replace !== false;
    if (!replace) {
      next.entries = {
        ...current.entries,
        ...next.entries
      };
      next.volumes = {
        ...current.volumes,
        ...next.volumes
      };
      next.snapshots = {
        ...current.snapshots,
        ...next.snapshots
      };
    }

    await saveState(next, pid);

    window.dispatchEvent(new CustomEvent("anzuba:storage-backup-updated", {
      detail: {
        projectId: pid,
        action: replace ? "imported" : "merged"
      }
    }));

    return status(pid);
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
      volumes: Object.keys(state.volumes).length,
      snapshots: Object.keys(state.snapshots || {}).length,
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
    status,
    listVolumes,
    createVolume,
    removeVolume,
    setVolumeMounted,
    volumeStatus,
    volumeSet,
    volumeGet,
    volumeList,
    listSnapshots,
    createSnapshot,
    restoreSnapshot,
    removeSnapshot,
    integrity,
    exportStorage,
    importStorage
  };

  window.ANZUBA_AI_BRIDGE?.on("storage.get", ({ key, id } = {}) => get(key, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.set", ({ key, value, id } = {}) => set(key, value, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.remove", ({ key, id } = {}) => remove(key, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.list", ({ prefix, id } = {}) => list(prefix, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.clear", ({ id } = {}) => clear(id));
  window.ANZUBA_AI_BRIDGE?.on("storage.quota.set", ({ quotaMB, id } = {}) => setQuota(quotaMB, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.status", ({ id } = {}) => status(id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volumes.list", ({ id } = {}) => listVolumes(id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.create", ({ name, options, id } = {}) => createVolume(name, options, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.remove", ({ name, id } = {}) => removeVolume(name, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.mount", ({ name, mounted = true, id } = {}) => setVolumeMounted(name, mounted, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.status", ({ name, id } = {}) => volumeStatus(name, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.set", ({ name, key, value, id } = {}) => volumeSet(name, key, value, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.get", ({ name, key, id } = {}) => volumeGet(name, key, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.volume.list", ({ name, prefix, id } = {}) => volumeList(name, prefix, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.snapshots.list", ({ id } = {}) => listSnapshots(id));
  window.ANZUBA_AI_BRIDGE?.on("storage.snapshot.create", ({ name, id } = {}) => createSnapshot(name, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.snapshot.restore", ({ name, id } = {}) => restoreSnapshot(name, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.snapshot.remove", ({ name, id } = {}) => removeSnapshot(name, id));
  window.ANZUBA_AI_BRIDGE?.on("storage.integrity", ({ id, repair = false } = {}) => integrity(id, repair));
  window.ANZUBA_AI_BRIDGE?.on("storage.export", ({ id } = {}) => exportStorage(id));
  window.ANZUBA_AI_BRIDGE?.on("storage.import", ({ payload, options, id } = {}) => importStorage(payload, options, id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) getState(active.id).catch(() => {});
  }, 0);
})();