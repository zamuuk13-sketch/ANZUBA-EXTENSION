(() => {
  const DISK_KEY = "disk";

  const DEFAULT_DISK = {
    totalMB: 4096,
    usedMB: 0,
    freeMB: 4096,
    mountPoint: "/",
    filesystem: "anzuba-fs",
    updatedAt: null
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  function calculateUsage(filesystem) {
    if (!filesystem || typeof filesystem !== "object") return 0;

    const bytes = Object.values(filesystem).reduce((sum, item) => {
      if (!item || item.type !== "file") return sum;
      const size = Number(item.size);
      if (Number.isFinite(size) && size >= 0) return sum + size;
      return sum + String(item.content || "").length;
    }, 0);

    return bytes / (1024 * 1024);
  }

  async function get(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;

    if (!data[DISK_KEY] || typeof data[DISK_KEY] !== "object") {
      const initial = clone(DEFAULT_DISK);
      await window.ANZUBA_PROJECTS.setData({ [DISK_KEY]: initial }, pid);
      return initial;
    }

    const stored = data[DISK_KEY];
    const totalMB = Math.max(1, Number(stored.totalMB || DEFAULT_DISK.totalMB));
    const usedMB = Math.max(0, Number(stored.usedMB || 0));

    return {
      ...clone(DEFAULT_DISK),
      ...clone(stored),
      totalMB,
      usedMB: Math.min(totalMB, usedMB),
      freeMB: Math.max(0, totalMB - Math.min(totalMB, usedMB))
    };
  }

  async function save(disk, id) {
    const pid = projectId(id);
    if (!pid || !disk) return false;

    const totalMB = Math.max(1, Number(disk.totalMB || DEFAULT_DISK.totalMB));
    const usedMB = Math.max(0, Math.min(totalMB, Number(disk.usedMB || 0)));

    const next = {
      ...clone(DEFAULT_DISK),
      ...clone(disk),
      totalMB,
      usedMB,
      freeMB: Math.max(0, totalMB - usedMB),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [DISK_KEY]: next }, pid);
    return true;
  }

  async function status(id) {
    return get(id);
  }

  async function sync(id) {
    const pid = projectId(id);
    const disk = await get(pid);
    if (!disk) return null;

    const filesystem = await window.ANZUBA_FS?.get?.(pid);
    const usageMB = calculateUsage(filesystem);
    disk.usedMB = Math.min(disk.totalMB, usageMB);
    await save(disk, pid);

    window.dispatchEvent(new CustomEvent("anzuba:disk-updated", {
      detail: { projectId: pid, disk: clone(disk) }
    }));

    return disk;
  }

  async function setTotal(totalMB, id) {
    const pid = projectId(id);
    const disk = await get(pid);
    if (!disk) return null;

    const total = Number(totalMB);
    if (!Number.isInteger(total) || total < 1) {
      throw new Error("Tamanho de disco inválido.");
    }

    if (total < disk.usedMB) {
      throw new Error("O disco total não pode ser menor que o espaço em uso.");
    }

    disk.totalMB = total;
    await save(disk, pid);
    return disk;
  }

  async function hasSpace(sizeMB, id) {
    const disk = await sync(id);
    if (!disk) return false;

    const size = Number(sizeMB);
    return Number.isFinite(size) && size >= 0 && size <= disk.freeMB;
  }

  async function getUsage(id) {
    const disk = await sync(id);
    if (!disk) return null;
    return {
      totalMB: disk.totalMB,
      usedMB: disk.usedMB,
      freeMB: disk.freeMB,
      usagePercent: Math.round((disk.usedMB / disk.totalMB) * 10000) / 100
    };
  }

  window.ANZUBA_DISK = {
    defaults: clone(DEFAULT_DISK),
    get,
    status,
    sync,
    setTotal,
    hasSpace,
    getUsage
  };

  window.ANZUBA_AI_BRIDGE?.on("disk.status", ({ id } = {}) => status(id));
  window.ANZUBA_AI_BRIDGE?.on("disk.sync", ({ id } = {}) => sync(id));
  window.ANZUBA_AI_BRIDGE?.on("disk.total.set", ({ totalMB, id } = {}) => setTotal(totalMB, id));
  window.ANZUBA_AI_BRIDGE?.on("disk.space.check", ({ sizeMB, id } = {}) => hasSpace(sizeMB, id));
  window.ANZUBA_AI_BRIDGE?.on("disk.usage", ({ id } = {}) => getUsage(id));

  window.addEventListener("anzuba:project-changed", event => {
    const id = event.detail?.id;
    if (id) sync(id).catch(() => {});
  });

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) sync(active.id).catch(() => {});
  }, 0);
})();