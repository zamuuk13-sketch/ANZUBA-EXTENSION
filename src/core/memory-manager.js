(() => {
  const MEMORY_KEY = "memory";

  const DEFAULT_MEMORY = {
    totalMB: 512,
    usedMB: 0,
    freeMB: 512,
    allocations: [],
    updatedAt: null
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  function normalizeAllocation(raw) {
    return {
      id: String(raw?.id || ""),
      pid: Number(raw?.pid || 0),
      process: String(raw?.process || "process").slice(0, 80),
      sizeMB: Math.max(0, Number(raw?.sizeMB || 0)),
      createdAt: raw?.createdAt || null
    };
  }

  async function get(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;

    if (!data[MEMORY_KEY] || typeof data[MEMORY_KEY] !== "object") {
      const initial = clone(DEFAULT_MEMORY);
      await window.ANZUBA_PROJECTS.setData({ [MEMORY_KEY]: initial }, pid);
      return initial;
    }

    const stored = data[MEMORY_KEY];
    const totalMB = Math.max(1, Number(stored.totalMB || DEFAULT_MEMORY.totalMB));
    const allocations = Array.isArray(stored.allocations)
      ? stored.allocations.map(normalizeAllocation).filter(item => item.id && item.sizeMB > 0)
      : [];
    const usedMB = allocations.reduce((sum, item) => sum + item.sizeMB, 0);

    return {
      ...clone(DEFAULT_MEMORY),
      ...clone(stored),
      totalMB,
      allocations,
      usedMB,
      freeMB: Math.max(0, totalMB - usedMB)
    };
  }

  async function save(memory, id) {
    const pid = projectId(id);
    if (!pid || !memory) return false;

    const totalMB = Math.max(1, Number(memory.totalMB || DEFAULT_MEMORY.totalMB));
    const allocations = Array.isArray(memory.allocations)
      ? memory.allocations.map(normalizeAllocation).filter(item => item.id && item.sizeMB > 0)
      : [];
    const usedMB = allocations.reduce((sum, item) => sum + item.sizeMB, 0);

    const next = {
      ...clone(DEFAULT_MEMORY),
      ...clone(memory),
      totalMB,
      allocations,
      usedMB,
      freeMB: Math.max(0, totalMB - usedMB),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [MEMORY_KEY]: next }, pid);
    return true;
  }

  async function status(id) {
    return get(id);
  }

  async function allocate(sizeMB, options = {}, id) {
    const pid = projectId(id);
    const memory = await get(pid);
    if (!memory) return null;

    const size = Number(sizeMB);
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error("Quantidade de memória inválida.");
    }

    const rounded = Math.ceil(size);
    if (rounded > memory.freeMB) {
      throw new Error("Memória virtual insuficiente.");
    }

    const allocationPid = Number(options.pid || 0);
    if (allocationPid > 0) {
      const process = await window.ANZUBA_PROCESSES?.get?.(allocationPid, pid);
      if (!process || process.state !== "running") {
        throw new Error("Processo inválido para alocação de memória.");
      }
    }

    const allocation = normalizeAllocation({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pid: allocationPid,
      process: options.process || "process",
      sizeMB: rounded,
      createdAt: new Date().toISOString()
    });

    memory.allocations.push(allocation);
    await save(memory, pid);

    window.dispatchEvent(new CustomEvent("anzuba:memory-allocated", {
      detail: { projectId: pid, allocation: clone(allocation) }
    }));

    return clone(allocation);
  }

  async function free(allocationId, id) {
    const pid = projectId(id);
    const memory = await get(pid);
    if (!memory) return null;

    const index = memory.allocations.findIndex(item => item.id === String(allocationId));
    if (index < 0) return null;

    const [allocation] = memory.allocations.splice(index, 1);
    await save(memory, pid);

    window.dispatchEvent(new CustomEvent("anzuba:memory-freed", {
      detail: { projectId: pid, allocation: clone(allocation) }
    }));

    return clone(allocation);
  }

  async function freeProcess(pidValue, id) {
    const project = projectId(id);
    const memory = await get(project);
    if (!memory) return 0;

    const targetPid = Number(pidValue);
    const released = memory.allocations.filter(item => item.pid === targetPid);
    if (!released.length) return 0;

    memory.allocations = memory.allocations.filter(item => item.pid !== targetPid);
    await save(memory, project);

    window.dispatchEvent(new CustomEvent("anzuba:memory-process-freed", {
      detail: {
        projectId: project,
        pid: targetPid,
        allocations: clone(released)
      }
    }));

    return released.reduce((sum, item) => sum + item.sizeMB, 0);
  }

  async function setTotal(totalMB, id) {
    const pid = projectId(id);
    const memory = await get(pid);
    if (!memory) return null;

    const total = Number(totalMB);
    if (!Number.isInteger(total) || total < 1) {
      throw new Error("Memória total inválida.");
    }

    if (total < memory.usedMB) {
      throw new Error("A memória total não pode ser menor que a memória em uso.");
    }

    memory.totalMB = total;
    await save(memory, pid);
    return memory;
  }

  async function syncProcesses(id) {
    const pid = projectId(id);
    const memory = await get(pid);
    if (!memory) return null;

    const processes = await window.ANZUBA_PROCESSES?.list?.(pid) || [];
    const activePids = new Set(
      processes
        .filter(process => process.state === "running")
        .map(process => process.pid)
    );

    const stale = memory.allocations.filter(
      allocation => allocation.pid > 0 && !activePids.has(allocation.pid)
    );

    if (!stale.length) return memory;

    memory.allocations = memory.allocations.filter(
      allocation => allocation.pid <= 0 || activePids.has(allocation.pid)
    );

    await save(memory, pid);
    return memory;
  }

  window.ANZUBA_MEMORY = {
    defaults: clone(DEFAULT_MEMORY),
    get,
    status,
    allocate,
    free,
    freeProcess,
    setTotal,
    syncProcesses
  };

  window.ANZUBA_AI_BRIDGE?.on("memory.status", ({ id } = {}) => status(id));
  window.ANZUBA_AI_BRIDGE?.on("memory.allocate", ({ sizeMB, pid, process, id } = {}) =>
    allocate(sizeMB, { pid, process }, id)
  );
  window.ANZUBA_AI_BRIDGE?.on("memory.free", ({ allocationId, id } = {}) => free(allocationId, id));
  window.ANZUBA_AI_BRIDGE?.on("memory.freeProcess", ({ pid, id } = {}) => freeProcess(pid, id));
  window.ANZUBA_AI_BRIDGE?.on("memory.total.set", ({ totalMB, id } = {}) => setTotal(totalMB, id));
  window.ANZUBA_AI_BRIDGE?.on("memory.sync", ({ id } = {}) => syncProcesses(id));

  window.addEventListener("anzuba:process-terminated", event => {
    const id = event.detail?.projectId;
    const pid = event.detail?.process?.pid;
    if (id && pid) freeProcess(pid, id).catch(() => {});
  });

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) get(active.id).catch(() => {});
  }, 0);
})();