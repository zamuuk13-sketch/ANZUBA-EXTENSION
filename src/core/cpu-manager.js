(() => {
  const CPU_KEY = "cpu";
  const DEFAULT_CPU = {
    model: "ANZUBA Virtual CPU",
    architecture: "wasm32",
    cores: 2,
    frequencyMHz: 2400,
    scheduler: "anzuba-round-robin",
    quantumMs: 10,
    utilization: 0,
    updatedAt: null
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  async function get(id) {
    const pid = projectId(id);
    if (!pid) return null;
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;

    const stored = data[CPU_KEY];
    if (!stored || typeof stored !== "object") {
      const initial = clone(DEFAULT_CPU);
      await window.ANZUBA_PROJECTS.setData({ [CPU_KEY]: initial }, pid);
      return initial;
    }

    return {
      ...clone(DEFAULT_CPU),
      ...clone(stored)
    };
  }

  async function save(cpu, id) {
    const pid = projectId(id);
    if (!pid || !cpu) return false;

    const next = {
      ...clone(DEFAULT_CPU),
      ...clone(cpu),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [CPU_KEY]: next }, pid);
    return true;
  }

  async function status(id) {
    return get(id);
  }

  async function setCores(cores, id) {
    const cpu = await get(id);
    if (!cpu) return null;

    const value = Number(cores);
    if (!Number.isInteger(value) || value < 1 || value > 64) {
      throw new Error("Quantidade de núcleos inválida. Use de 1 a 64.");
    }

    cpu.cores = value;
    await save(cpu, id);
    return cpu;
  }

  async function tick(id) {
    const pid = projectId(id);
    const cpu = await get(pid);
    if (!cpu) return null;

    const processes = await window.ANZUBA_PROCESSES?.list?.(pid) || [];
    const running = processes.filter(process => process.state === "running");
    const capacity = Math.max(1, Number(cpu.cores) || 1);

    cpu.utilization = Math.min(
      100,
      Math.round((running.length / capacity) * 100)
    );

    await save(cpu, pid);

    window.dispatchEvent(new CustomEvent("anzuba:cpu-updated", {
      detail: {
        projectId: pid,
        cpu: clone(cpu)
      }
    }));

    return cpu;
  }

  window.ANZUBA_CPU = {
    defaults: clone(DEFAULT_CPU),
    get,
    status,
    setCores,
    tick
  };

  window.ANZUBA_AI_BRIDGE?.on("cpu.status", ({ id } = {}) => status(id));
  window.ANZUBA_AI_BRIDGE?.on("cpu.cores.set", ({ cores, id } = {}) => setCores(cores, id));
  window.ANZUBA_AI_BRIDGE?.on("cpu.tick", ({ id } = {}) => tick(id));
})();