(() => {
  const KERNEL_KEY = "kernel";
  const DEFAULT_KERNEL = {
    name: "anzuba-kernel",
    version: "0.1.0",
    architecture: "wasm32",
    state: "stopped",
    lastBootAt: null,
    lastShutdownAt: null,
    updatedAt: null
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  async function get(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;

    if (!data[KERNEL_KEY] || typeof data[KERNEL_KEY] !== "object") {
      const initial = clone(DEFAULT_KERNEL);
      await window.ANZUBA_PROJECTS.setData({ [KERNEL_KEY]: initial }, pid);
      return initial;
    }

    return {
      ...clone(DEFAULT_KERNEL),
      ...clone(data[KERNEL_KEY])
    };
  }

  async function save(kernel, id) {
    const pid = projectId(id);
    if (!pid || !kernel) return false;

    const next = {
      ...clone(DEFAULT_KERNEL),
      ...clone(kernel),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [KERNEL_KEY]: next }, pid);
    return true;
  }

  async function boot(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const kernel = await get(pid);
    if (!kernel) return null;

    if (kernel.state === "running") return getSystemStatus(pid);

    const os = await window.ANZUBA_OS?.boot?.(pid);
    if (!os) return null;

    kernel.state = "running";
    kernel.lastBootAt = new Date().toISOString();
    await save(kernel, pid);

    window.dispatchEvent(new CustomEvent("anzuba:kernel-booted", {
      detail: { projectId: pid, kernel: clone(kernel) }
    }));

    return getSystemStatus(pid);
  }

  async function shutdown(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const kernel = await get(pid);
    if (!kernel) return null;

    if (kernel.state === "stopped") return getSystemStatus(pid);

    const os = await window.ANZUBA_OS?.shutdown?.(pid);
    if (!os) return null;

    kernel.state = "stopped";
    kernel.lastShutdownAt = new Date().toISOString();
    await save(kernel, pid);

    window.dispatchEvent(new CustomEvent("anzuba:kernel-shutdown", {
      detail: { projectId: pid, kernel: clone(kernel) }
    }));

    return getSystemStatus(pid);
  }

  async function getSystemStatus(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const [kernel, os, cpu, memory, disk, network, processes] = await Promise.all([
      get(pid),
      window.ANZUBA_OS?.status?.(pid),
      window.ANZUBA_CPU?.status?.(pid),
      window.ANZUBA_MEMORY?.status?.(pid),
      window.ANZUBA_DISK?.status?.(pid),
      window.ANZUBA_NETWORK?.status?.(pid),
      window.ANZUBA_PROCESSES?.list?.(pid)
    ]);

    return {
      projectId: pid,
      kernel,
      os,
      resources: { cpu, memory, disk, network },
      processes: {
        total: processes?.length || 0,
        running: processes?.filter(item => item.state === "running").length || 0,
        terminated: processes?.filter(item => item.state === "terminated").length || 0
      }
    };
  }

  async function health(id) {
    const pid = projectId(id);
    if (!pid) return { ok: false, projectId: null, checks: {} };

    const status = await getSystemStatus(pid);
    const checks = {
      kernel: status?.kernel?.state === "running",
      os: status?.os?.state === "running",
      cpu: !!status?.resources?.cpu,
      memory: !!status?.resources?.memory,
      disk: !!status?.resources?.disk,
      network: !!status?.resources?.network,
      processes: !!status?.processes
    };

    return {
      ok: Object.values(checks).every(Boolean),
      projectId: pid,
      checks,
      status
    };
  }

  window.ANZUBA_KERNEL = {
    defaults: clone(DEFAULT_KERNEL),
    get,
    boot,
    shutdown,
    status: getSystemStatus,
    health
  };

  window.ANZUBA_AI_BRIDGE?.on("kernel.status", ({ id } = {}) => getSystemStatus(id));
  window.ANZUBA_AI_BRIDGE?.on("kernel.boot", ({ id } = {}) => boot(id));
  window.ANZUBA_AI_BRIDGE?.on("kernel.shutdown", ({ id } = {}) => shutdown(id));
  window.ANZUBA_AI_BRIDGE?.on("kernel.health", ({ id } = {}) => health(id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) get(active.id).catch(() => {});
  }, 0);
})();