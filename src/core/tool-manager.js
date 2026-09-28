(() => {
  const TOOL_KEY = "tools";
  const TOOL_TYPES = ["tool", "compiler", "sdk", "library", "runtime", "engine", "package"];
  const STATES = ["available", "installing", "installed", "failed", "removed"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  async function getAll(id) {
    const pid = projectId(id);
    if (!pid) return [];
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return [];
    return Array.isArray(data[TOOL_KEY]) ? clone(data[TOOL_KEY]) : [];
  }

  async function saveAll(tools, id) {
    const pid = projectId(id);
    if (!pid) return false;
    await window.ANZUBA_PROJECTS.setData({ [TOOL_KEY]: clone(tools) }, pid);
    return true;
  }

  function normalize(tool = {}) {
    const now = new Date().toISOString();
    const type = TOOL_TYPES.includes(tool.type) ? tool.type : "tool";
    const status = STATES.includes(tool.status) ? tool.status : "available";
    return {
      id: String(tool.id || crypto.randomUUID()),
      name: String(tool.name || "Ferramenta").trim().slice(0, 120),
      type,
      version: String(tool.version || "").trim().slice(0, 64),
      description: String(tool.description || "").slice(0, 500),
      source: tool.source ? String(tool.source).slice(0, 500) : null,
      path: tool.path ? String(tool.path).slice(0, 512) : null,
      status,
      dependencies: Array.isArray(tool.dependencies) ? tool.dependencies.map(String).slice(0, 50) : [],
      installedAt: tool.installedAt || null,
      createdAt: tool.createdAt || now,
      updatedAt: now
    };
  }

  async function register(tool = {}, id) {
    const pid = projectId(id);
    if (!pid) return null;
    const tools = await getAll(pid);
    const item = normalize(tool);
    const existing = tools.findIndex(t => t.id === item.id);
    if (existing >= 0) tools[existing] = item;
    else tools.push(item);
    await saveAll(tools, pid);
    return clone(item);
  }

  async function install(id, toolId) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(t => t.id === toolId);
    if (index < 0) throw new Error("Ferramenta não encontrada.");

    const tool = tools[index];
    if (tool.status === "installed") return clone(tool);

    tool.status = "installing";
    tool.updatedAt = new Date().toISOString();
    await saveAll(tools, pid);

    try {
      tool.status = "installed";
      tool.installedAt = tool.installedAt || new Date().toISOString();
      tool.updatedAt = new Date().toISOString();
      await saveAll(tools, pid);
      window.dispatchEvent(new CustomEvent("anzuba:tool-installed", {
        detail: { projectId: pid, toolId: tool.id }
      }));
      return clone(tool);
    } catch (error) {
      tool.status = "failed";
      tool.updatedAt = new Date().toISOString();
      await saveAll(tools, pid);
      throw error;
    }
  }

  async function uninstall(id, toolId) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(t => t.id === toolId);
    if (index < 0) return false;
    tools[index].status = "removed";
    tools[index].installedAt = null;
    tools[index].updatedAt = new Date().toISOString();
    await saveAll(tools, pid);
    window.dispatchEvent(new CustomEvent("anzuba:tool-removed", {
      detail: { projectId: pid, toolId }
    }));
    return true;
  }

  async function list(filter = {}, id) {
    const tools = await getAll(id);
    return tools.filter(tool => {
      if (filter.type && tool.type !== filter.type) return false;
      if (filter.status && tool.status !== filter.status) return false;
      if (filter.query) {
        const q = String(filter.query).toLowerCase();
        if (!tool.name.toLowerCase().includes(q) && !tool.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  async function get(toolId, id) {
    const tools = await getAll(id);
    return tools.find(tool => tool.id === toolId) || null;
  }

  window.ANZUBA_TOOLS = {
    types: [...TOOL_TYPES],
    states: [...STATES],
    get,
    list,
    register,
    install,
    uninstall
  };

  window.ANZUBA_AI_BRIDGE?.on("tools.list", ({ filter, id } = {}) => list(filter || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.get", ({ toolId, id } = {}) => get(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.register", ({ tool, id } = {}) => register(tool, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.install", ({ toolId, id } = {}) => install(id, toolId));
  window.ANZUBA_AI_BRIDGE?.on("tools.uninstall", ({ toolId, id } = {}) => uninstall(id, toolId));
})();