(() => {
  const TOOL_KEY = "tools";
  const TOOL_TYPES = ["tool", "compiler", "sdk", "library", "runtime", "engine", "package"];
  const STATES = ["available", "installing", "installed", "failed", "removed"];
  const SOURCE_TYPES = ["official", "repository", "registry", "url", "local"];

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
      sourceType: SOURCE_TYPES.includes(tool.sourceType) ? tool.sourceType : "official",
      homepage: tool.homepage ? String(tool.homepage).slice(0, 500) : null,
      license: tool.license ? String(tool.license).slice(0, 120) : null,
      versions: Array.isArray(tool.versions) ? tool.versions.map(version => String(version).slice(0, 64)).slice(0, 100) : [],
      path: tool.path ? String(tool.path).slice(0, 512) : null,
      status,
      dependencies: Array.isArray(tool.dependencies) ? tool.dependencies.map(String).slice(0, 50) : [],
      installedAt: tool.installedAt || null,
      createdAt: tool.createdAt || now,
      updatedAt: now
    };
  }

  async function setDependencies(toolId, dependencies = [], id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    if (!Array.isArray(dependencies)) throw new Error("Dependências inválidas.");
    const values = [...new Set(dependencies.map(String).map(item => item.trim()).filter(Boolean))].slice(0, 50);
    if (values.includes(toolId)) throw new Error("Uma ferramenta não pode depender dela mesma.");
    const missing = values.filter(dep => !tools.some(tool => tool.id === dep));
    if (missing.length) throw new Error("Dependência não encontrada: " + missing.join(", "));
    tools[index] = normalize({ ...tools[index], dependencies: values, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function getDependencies(toolId, id) {
    const tool = await get(toolId, id);
    if (!tool) return null;
    const tools = await getAll(id);
    return {
      toolId: tool.id,
      dependencies: (tool.dependencies || []).map(depId => tools.find(item => item.id === depId)).filter(Boolean).map(clone)
    };
  }

  async function getDependents(toolId, id) {
    const tool = await get(toolId, id);
    if (!tool) return null;
    const tools = await getAll(id);
    return {
      toolId: tool.id,
      dependents: tools.filter(item => Array.isArray(item.dependencies) && item.dependencies.includes(toolId)).map(clone)
    };
  }

  async function addVersion(toolId, version, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    const value = String(version || "").trim().slice(0, 64);
    if (!value) throw new Error("Versão inválida.");
    const versions = Array.isArray(tools[index].versions) ? tools[index].versions : [];
    if (!versions.includes(value)) versions.push(value);
    tools[index] = normalize({ ...tools[index], versions, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function removeVersion(toolId, version, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return false;
    const value = String(version || "").trim();
    if (value === tools[index].version) throw new Error("Não é possível remover a versão atualmente selecionada.");
    const versions = (tools[index].versions || []).filter(item => item !== value);
    if (versions.length === (tools[index].versions || []).length) return false;
    tools[index] = normalize({ ...tools[index], versions, id: tools[index].id });
    await saveAll(tools, pid);
    return true;
  }

  async function selectVersion(toolId, version, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    const value = String(version || "").trim();
    if (!value) throw new Error("Versão inválida.");
    const versions = Array.isArray(tools[index].versions) ? tools[index].versions : [];
    if (!versions.includes(value)) throw new Error("Versão não encontrada no catálogo.");
    tools[index] = normalize({ ...tools[index], version: value, id: tools[index].id });
    await saveAll(tools, pid);
    window.dispatchEvent(new CustomEvent("anzuba:tool-version-changed", {
      detail: { projectId: pid, toolId: tools[index].id, version: value }
    }));
    return clone(tools[index]);
  }

  async function getVersions(toolId, id) {
    const tool = await get(toolId, id);
    return tool ? { toolId: tool.id, current: tool.version || null, versions: [...(tool.versions || [])] } : null;
  }

  async function updateMetadata(toolId, metadata = {}, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    const allowed = ["source", "sourceType", "homepage", "license", "versions", "description"];
    const changes = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(metadata, key)) changes[key] = metadata[key];
    }
    tools[index] = normalize({ ...tools[index], ...changes, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function getSources(toolId, id) {
    const tool = await get(toolId, id);
    if (!tool) return null;
    return {
      toolId: tool.id,
      name: tool.name,
      source: tool.source,
      sourceType: tool.sourceType,
      homepage: tool.homepage,
      license: tool.license,
      versions: [...tool.versions]
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

  window.ANZUBA_AI_BRIDGE?.on("tools.dependencies.set", ({ toolId, dependencies, id } = {}) => setDependencies(toolId, dependencies || [], id));
  window.ANZUBA_AI_BRIDGE?.on("tools.dependencies.get", ({ toolId, id } = {}) => getDependencies(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.dependents.get", ({ toolId, id } = {}) => getDependents(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.version.add", ({ toolId, version, id } = {}) => addVersion(toolId, version, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.version.remove", ({ toolId, version, id } = {}) => removeVersion(toolId, version, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.version.select", ({ toolId, version, id } = {}) => selectVersion(toolId, version, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.versions.get", ({ toolId, id } = {}) => getVersions(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.list", ({ filter, id } = {}) => list(filter || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.get", ({ toolId, id } = {}) => get(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.register", ({ tool, id } = {}) => register(tool, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.metadata.update", ({ toolId, metadata, id } = {}) => updateMetadata(toolId, metadata || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.sources.get", ({ toolId, id } = {}) => getSources(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.install", ({ toolId, id } = {}) => install(id, toolId));
  window.ANZUBA_AI_BRIDGE?.on("tools.uninstall", ({ toolId, id } = {}) => uninstall(id, toolId));
})();