(() => {
  const RESOURCE_TYPES = ["tool", "compiler", "sdk", "library", "runtime", "engine", "package"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function getAll(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const data = await window.ANZUBA_PROJECTS?.getData(id);
    if (!data) return [];
    return Array.isArray(data.resources) ? clone(data.resources) : [];
  }

  async function saveAll(resources, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id || !window.ANZUBA_PROJECTS) return false;
    await window.ANZUBA_PROJECTS.setData({ resources: clone(resources) }, id);
    return true;
  }

  function normalize(resource = {}) {
    const item = { ...resource };
    if (!RESOURCE_TYPES.includes(item.type)) item.type = "tool";
    item.name = String(item.name || "Recurso").slice(0, 120);
    item.version = String(item.version || "");
    item.status = String(item.status || "available");
    item.path = item.path ? String(item.path) : null;
    item.source = item.source ? String(item.source) : null;
    return item;
  }

  async function register(resource = {}, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id) return null;
    const resources = await getAll(id);
    const item = normalize({
      ...resource,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    resources.push(item);
    await saveAll(resources, id);
    return clone(item);
  }

  async function update(resourceId, changes, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const resources = await getAll(id);
    const index = resources.findIndex(item => item.id === resourceId);
    if (index < 0) return null;
    resources[index] = normalize({
      ...resources[index],
      ...changes,
      id: resources[index].id,
      updatedAt: new Date().toISOString()
    });
    await saveAll(resources, id);
    return clone(resources[index]);
  }

  async function remove(resourceId, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const resources = await getAll(id);
    const next = resources.filter(item => item.id !== resourceId);
    if (next.length === resources.length) return false;
    await saveAll(next, id);
    return true;
  }

  async function find(query, projectId) {
    const resources = await getAll(projectId);
    const value = String(query || "").toLowerCase();
    return resources.filter(item =>
      item.name.toLowerCase().includes(value) ||
      item.type.toLowerCase().includes(value) ||
      item.version.toLowerCase().includes(value)
    );
  }

  window.ANZUBA_RESOURCES = {
    types: [...RESOURCE_TYPES],
    getAll,
    register,
    update,
    remove,
    find
  };
})();