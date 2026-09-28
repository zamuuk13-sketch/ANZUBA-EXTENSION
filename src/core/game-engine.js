(() => {
  "use strict";

  const SCENE_KEY = "gameEngineScenes";
  const projectId = id => String(id || window.ANZUBA_PROJECTS?.getActive?.()?.id || "default");

  const clone = value => JSON.parse(JSON.stringify(value));

  async function getScenes(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    const scenes = data?.[SCENE_KEY];
    return Array.isArray(scenes) ? scenes.map(clone) : [];
  }

  function makeEntity(name, components = {}) {
    const now = new Date().toISOString();
    return {
      id: "entity_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: String(name || "Entity").slice(0, 120),
      components: clone(components || {}),
      createdAt: now,
      updatedAt: now
    };
  }

  async function createScene(name, options = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = {
      id: "scene_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      projectId: pid,
      name: String(name || "Main Scene").trim().slice(0, 120) || "Main Scene",
      version: 1,
      settings: {
        gravity: Number.isFinite(Number(options.gravity)) ? Number(options.gravity) : -9.81,
        activeCamera: String(options.activeCamera || "")
      },
      entities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    scenes.push(scene);
    if (scenes.length > 50) scenes.splice(0, scenes.length - 50);
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return clone(scene);
  }

  async function getScene(sceneId, id) {
    const scenes = await getScenes(id);
    return scenes.find(scene => scene.id === String(sceneId || "").trim()) || null;
  }

  async function addEntity(sceneId, name, components = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    if (scene.entities.length >= 1000) return { projectId: pid, ok: false, reason: "entity-limit" };
    const entity = makeEntity(name, components);
    scene.entities.push(entity);
    scene.updatedAt = new Date().toISOString();
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, scene: clone(scene), entity: clone(entity) };
  }

  async function removeEntity(sceneId, entityId, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const before = scene.entities.length;
    scene.entities = scene.entities.filter(entity => entity.id !== String(entityId || "").trim());
    if (scene.entities.length === before) return { projectId: pid, ok: false, reason: "entity-not-found" };
    scene.updatedAt = new Date().toISOString();
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, scene: clone(scene) };
  }

  async function updateEntity(sceneId, entityId, patch = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };
    if (patch.name !== undefined) entity.name = String(patch.name).slice(0, 120);
    if (patch.components && typeof patch.components === "object") {
      entity.components = { ...entity.components, ...clone(patch.components) };
    }
    entity.updatedAt = new Date().toISOString();
    scene.updatedAt = entity.updatedAt;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, entity: clone(entity) };
  }

  async function listScenes(id) {
    return getScenes(id);
  }

  window.ANZUBA_GAME_ENGINE = {
    createScene,
    getScene,
    listScenes,
    addEntity,
    removeEntity,
    updateEntity
  };

  window.ANZUBA_AI_BRIDGE?.on("game.scene.create", ({ name, options, id } = {}) =>
    createScene(name, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scene.get", ({ sceneId, id } = {}) =>
    getScene(sceneId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scenes.list", ({ id } = {}) =>
    listScenes(id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.add", ({ sceneId, name, components, id } = {}) =>
    addEntity(sceneId, name, components || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.remove", ({ sceneId, entityId, id } = {}) =>
    removeEntity(sceneId, entityId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.update", ({ sceneId, entityId, patch, id } = {}) =>
    updateEntity(sceneId, entityId, patch || {}, id));
})();
