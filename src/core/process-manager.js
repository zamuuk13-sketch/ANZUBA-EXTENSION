(() => {
  const PROCESS_KEY = "processes";
  const NEXT_PID_KEY = "nextPid";

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectIdOrActive(projectId) {
    return projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  function normalizeProcess(raw) {
    return {
      pid: Number(raw?.pid || 0),
      name: String(raw?.name || "process").slice(0, 80),
      command: String(raw?.command || "").slice(0, 500),
      args: Array.isArray(raw?.args) ? raw.args.map(value => String(value)).slice(0, 50) : [],
      user: String(raw?.user || "ai").slice(0, 32),
      cwd: String(raw?.cwd || "/workspace").slice(0, 200),
      state: ["running", "stopped", "terminated"].includes(raw?.state) ? raw.state : "stopped",
      startedAt: raw?.startedAt || null,
      endedAt: raw?.endedAt || null,
      exitCode: raw?.exitCode ?? null
    };
  }

  async function getState(projectId) {
    const id = projectIdOrActive(projectId);
    if (!id) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(id);
    if (!data) return null;

    if (!Array.isArray(data[PROCESS_KEY])) {
      await window.ANZUBA_PROJECTS.setData({
        [PROCESS_KEY]: [],
        [NEXT_PID_KEY]: 1
      }, id);
      return { processes: [], nextPid: 1 };
    }

    return {
      processes: data[PROCESS_KEY].map(normalizeProcess),
      nextPid: Math.max(1, Number(data[NEXT_PID_KEY] || 1))
    };
  }

  async function saveState(state, projectId) {
    const id = projectIdOrActive(projectId);
    if (!id || !state) return false;

    await window.ANZUBA_PROJECTS.setData({
      [PROCESS_KEY]: state.processes.map(normalizeProcess),
      [NEXT_PID_KEY]: Math.max(1, Number(state.nextPid || 1))
    }, id);

    return true;
  }

  async function list(projectId) {
    const state = await getState(projectId);
    return state ? clone(state.processes) : [];
  }

  async function get(pid, projectId) {
    const processes = await list(projectId);
    return processes.find(process => process.pid === Number(pid)) || null;
  }

  async function spawn(options = {}, projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return null;

    const name = String(options.name || options.command || "process").trim();
    if (!name) return null;

    const username = String(options.user || "ai");
    const user = await window.ANZUBA_USERS?.get?.(username, id);
    if (!user || user.locked) return null;

    const now = new Date().toISOString();
    const process = normalizeProcess({
      pid: state.nextPid,
      name,
      command: options.command || name,
      args: options.args,
      user: username,
      cwd: options.cwd || "/workspace",
      state: "running",
      startedAt: now,
      endedAt: null,
      exitCode: null
    });

    state.processes.push(process);
    state.nextPid += 1;
    await saveState(state, id);

    window.dispatchEvent(new CustomEvent("anzuba:process-started", {
      detail: { projectId: id, process: clone(process) }
    }));

    return clone(process);
  }

  async function terminate(pid, exitCode = 0, projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return null;

    const process = state.processes.find(item => item.pid === Number(pid));
    if (!process || process.state !== "running") return process ? clone(process) : null;

    process.state = "terminated";
    process.exitCode = Number.isFinite(Number(exitCode)) ? Number(exitCode) : 0;
    process.endedAt = new Date().toISOString();

    await saveState(state, id);

    window.dispatchEvent(new CustomEvent("anzuba:process-terminated", {
      detail: { projectId: id, process: clone(process) }
    }));

    return clone(process);
  }

  async function stop(pid, projectId) {
    return terminate(pid, 0, projectId);
  }

  async function clearStopped(projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return false;

    const before = state.processes.length;
    state.processes = state.processes.filter(process => process.state === "running");
    if (before === state.processes.length) return false;

    await saveState(state, id);
    return true;
  }

  async function ensureInit(projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return null;

    const init = state.processes.find(process => process.pid === 1 && process.name === "anzuba-init");
    if (init?.state === "running") return clone(init);

    const existingPidOne = state.processes.find(process => process.pid === 1);
    if (existingPidOne) {
      existingPidOne.state = "terminated";
      existingPidOne.exitCode = 0;
      existingPidOne.endedAt = new Date().toISOString();
    }

    const process = normalizeProcess({
      pid: 1,
      name: "anzuba-init",
      command: "/bin/anzuba-init",
      user: "root",
      cwd: "/",
      state: "running",
      startedAt: new Date().toISOString(),
      endedAt: null,
      exitCode: null
    });

    state.processes = state.processes.filter(item => item.pid !== 1);
    state.processes.push(process);
    state.nextPid = Math.max(2, Number(state.nextPid || 1));
    await saveState(state, id);

    window.dispatchEvent(new CustomEvent("anzuba:process-started", {
      detail: { projectId: id, process: clone(process) }
    }));

    return clone(process);
  }

  async function shutdownAll(projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return false;

    let changed = false;
    const now = new Date().toISOString();

    for (const process of state.processes) {
      if (process.state === "running") {
        process.state = "terminated";
        process.exitCode = 0;
        process.endedAt = now;
        changed = true;
      }
    }

    if (changed) await saveState(state, id);
    return changed;
  }

  window.ANZUBA_PROCESSES = {
    list,
    get,
    spawn,
    stop,
    terminate,
    clearStopped
  };

  window.ANZUBA_AI_BRIDGE?.on("process.list", ({ id } = {}) => list(id));
  window.ANZUBA_AI_BRIDGE?.on("process.get", ({ pid, id } = {}) => get(pid, id));
  window.ANZUBA_AI_BRIDGE?.on("process.spawn", ({ id, ...options } = {}) => spawn(options, id));
  window.ANZUBA_AI_BRIDGE?.on("process.stop", ({ pid, id } = {}) => stop(pid, id));
  window.ANZUBA_AI_BRIDGE?.on("process.terminate", ({ pid, exitCode, id } = {}) => terminate(pid, exitCode, id));
  window.ANZUBA_AI_BRIDGE?.on("process.clearStopped", ({ id } = {}) => clearStopped(id));

  window.addEventListener("anzuba:os-booted", event => {
    const id = event.detail?.projectId;
    if (id) ensureInit(id).catch(() => {});
  });

  window.addEventListener("anzuba:os-shutdown", event => {
    const id = event.detail?.projectId;
    if (id) shutdownAll(id).catch(() => {});
  });

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) {
      getState(active.id).catch(() => {});
    }
  }, 0);
})();