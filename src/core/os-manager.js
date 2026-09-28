(() => {
  const OS_KEY = "os";
  const DEFAULT_OS = {
    name: "ANZUBA OS",
    version: "0.1.0",
    kernel: "anzuba-kernel",
    architecture: "wasm32",
    hostname: "anzuba",
    cpu: {
      model: "ANZUBA Virtual CPU",
      cores: 2
    },
    memory: {
      totalMB: 512
    },
    disk: {
      totalMB: 4096
    },
    users: [
      {
        name: "ai",
        uid: 1000,
        home: "/home/ai",
        shell: "/bin/anzuba-shell"
      }
    ],
    root: {
      path: "/",
      owner: "root",
      permissions: "rwxr-xr-x"
    },
    state: "stopped",
    bootCount: 0,
    startedAt: null,
    updatedAt: null
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getProject(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id;
    if (!id) return null;
    return { id, project: window.ANZUBA_PROJECTS?.getActive?.() };
  }

  async function get(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id;
    if (!id) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(id);
    if (!data) return null;

    if (!data[OS_KEY] || typeof data[OS_KEY] !== "object") {
      const initial = clone(DEFAULT_OS);
      await window.ANZUBA_PROJECTS.setData({ [OS_KEY]: initial }, id);
      return initial;
    }

    const stored = data[OS_KEY];
    const identityUsers = await window.ANZUBA_USERS?.list?.(id);
    const users = Array.isArray(identityUsers) && identityUsers.length
      ? identityUsers.map(user => ({
          name: user.username,
          uid: user.uid,
          home: user.home,
          shell: user.shell
        }))
      : (Array.isArray(stored.users) ? clone(stored.users) : clone(DEFAULT_OS.users));

    return {
      ...clone(DEFAULT_OS),
      ...clone(stored),
      cpu: { ...clone(DEFAULT_OS.cpu), ...(stored.cpu || {}) },
      memory: { ...clone(DEFAULT_OS.memory), ...(stored.memory || {}) },
      disk: { ...clone(DEFAULT_OS.disk), ...(stored.disk || {}) },
      users,
      root: { ...clone(DEFAULT_OS.root), ...(stored.root || {}) }
    };
  }

  async function save(os, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id;
    if (!id || !os || typeof os !== "object") return false;

    const next = {
      ...clone(DEFAULT_OS),
      ...clone(os),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [OS_KEY]: next }, id);
    return true;
  }

  async function boot(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id;
    const current = await get(id);
    if (!current) return false;

    if (current.state === "running") return current;

    const next = {
      ...current,
      state: "running",
      bootCount: Number(current.bootCount || 0) + 1,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await save(next, id);
    window.dispatchEvent(new CustomEvent("anzuba:os-booted", {
      detail: { projectId: id, os: clone(next) }
    }));
    return next;
  }

  async function shutdown(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id;
    const current = await get(id);
    if (!current) return false;

    if (current.state === "stopped") return current;

    const next = {
      ...current,
      state: "stopped",
      startedAt: null,
      updatedAt: new Date().toISOString()
    };

    await save(next, id);
    window.dispatchEvent(new CustomEvent("anzuba:os-shutdown", {
      detail: { projectId: id, os: clone(next) }
    }));
    return next;
  }

  async function status(projectId) {
    return get(projectId);
  }

  async function getHealth(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id) return { ok: false, projectId: null, checks: {} };
    const os = await status(id);
    const users = await window.ANZUBA_USERS?.list?.(id) || [];
    const processes = await window.ANZUBA_PROCESSES?.list?.(id) || [];
    const filesystem = await window.ANZUBA_FS?.get?.(id);
    const environment = await window.ANZUBA_ENV?.get?.(id);
    const checks = {
      osState: !!os,
      users: users.length > 0,
      filesystem: !!filesystem,
      environment: !!environment,
      processManager: !!window.ANZUBA_PROCESSES,
      shell: !!window.ANZUBA_SHELL
    };
    return { ok: Object.values(checks).every(Boolean), projectId: id, state: os?.state || "stopped", checks, counts: { users: users.length, processes: processes.length, filesystemEntries: filesystem ? Object.keys(filesystem).length : 0 } };
  }

  window.ANZUBA_OS = {
    defaults: clone(DEFAULT_OS),
    get,
    status,
    boot,
    shutdown,
    getHealth
  };

  window.ANZUBA_AI_BRIDGE?.on("os.status", ({ id } = {}) => status(id));
  window.ANZUBA_AI_BRIDGE?.on("os.boot", ({ id } = {}) => boot(id));
  window.ANZUBA_AI_BRIDGE?.on("os.shutdown", ({ id } = {}) => shutdown(id));
  window.ANZUBA_AI_BRIDGE?.on("os.health", ({ id } = {}) => getHealth(id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) {
      get(active.id).catch(() => {});
    }
  }, 0);
})();