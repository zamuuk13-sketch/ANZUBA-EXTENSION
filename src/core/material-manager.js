(() => {
  const MATERIAL_TYPES = ["standard", "physical", "unlit"];
  const DEFAULT_MATERIAL = {
    type: "standard",
    name: "Material",
    color: "#ffffff",
    opacity: 1,
    transparent: false,
    roughness: 0.5,
    metalness: 0,
    emissive: "#000000",
    emissiveIntensity: 0,
    map: null,
    normalMap: null,
    roughnessMap: null,
    metalnessMap: null,
    alphaMap: null
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(material = {}) {
    const result = { ...DEFAULT_MATERIAL, ...clone(material) };
    if (!MATERIAL_TYPES.includes(result.type)) result.type = "standard";
    result.name = String(result.name || "Material").slice(0, 100);
    result.color = String(result.color || "#ffffff");
    result.opacity = Math.min(1, Math.max(0, Number(result.opacity)));
    result.roughness = Math.min(1, Math.max(0, Number(result.roughness)));
    result.metalness = Math.min(1, Math.max(0, Number(result.metalness)));
    result.emissiveIntensity = Math.max(0, Number(result.emissiveIntensity));
    result.transparent = Boolean(result.transparent);
    return result;
  }

  async function getAll(projectId) {
    const data = await window.ANZUBA_PROJECTS?.getData(projectId);
    if (!data) return [];
    return Array.isArray(data.materials) ? clone(data.materials) : [];
  }

  async function saveAll(materials, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id || !window.ANZUBA_PROJECTS) return false;
    await window.ANZUBA_PROJECTS.setData({ materials: materials.map(normalize) }, id);
    return true;
  }

  async function create(material = {}, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id) return null;
    const materials = await getAll(id);
    const item = normalize({
      ...material,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    materials.push(item);
    await saveAll(materials, id);
    return clone(item);
  }

  async function update(materialId, changes, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const materials = await getAll(id);
    const index = materials.findIndex(item => item.id === materialId);
    if (index < 0) return null;
    materials[index] = normalize({
      ...materials[index],
      ...changes,
      id: materials[index].id,
      updatedAt: new Date().toISOString()
    });
    await saveAll(materials, id);
    return clone(materials[index]);
  }

  async function remove(materialId, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const materials = await getAll(id);
    const next = materials.filter(item => item.id !== materialId);
    if (next.length === materials.length) return false;
    await saveAll(next, id);
    return true;
  }

  async function get(materialId, projectId) {
    const materials = await getAll(projectId || window.ANZUBA_PROJECTS?.getActive()?.id);
    const item = materials.find(material => material.id === materialId);
    return item ? clone(item) : null;
  }

  window.ANZUBA_MATERIALS = {
    types: [...MATERIAL_TYPES],
    defaults: clone(DEFAULT_MATERIAL),
    getAll,
    get,
    create,
    update,
    remove
  };
})();