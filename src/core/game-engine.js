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

  const ENGINE_KEY = "gameEngine";

  async function getEngineConfig(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    return data?.[ENGINE_KEY] ? clone(data[ENGINE_KEY]) : {
      projectId: pid,
      version: 1,
      name: "ANZUBA Game Engine",
      mode: "3d",
      activeSceneId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async function configureEngine(options = {}, id) {
    const pid = projectId(id);
    const current = await getEngineConfig(pid);
    const config = {
      ...current,
      name: options.name !== undefined ? String(options.name).slice(0, 120) : current.name,
      mode: ["2d", "3d"].includes(String(options.mode)) ? String(options.mode) : current.mode,
      updatedAt: new Date().toISOString()
    };
    await window.ANZUBA_PROJECTS?.setData?.({ [ENGINE_KEY]: config }, pid);
    return { projectId: pid, ok: true, config: clone(config) };
  }

  async function getEngineStatus(id) {
    const pid = projectId(id);
    const config = await getEngineConfig(pid);
    const scenes = await getScenes(pid);
    return {
      projectId: pid,
      ok: true,
      version: config.version,
      mode: config.mode,
      activeSceneId: config.activeSceneId || null,
      sceneCount: scenes.length,
      entityCount: scenes.reduce((total, scene) => total + scene.entities.length, 0)
    };
  }

  function normalizeTransform(value = {}) {
    const vector = (source, fallback) => ({
      x: Number.isFinite(Number(source?.x)) ? Number(source.x) : fallback.x,
      y: Number.isFinite(Number(source?.y)) ? Number(source.y) : fallback.y,
      z: Number.isFinite(Number(source?.z)) ? Number(source.z) : fallback.z
    });
    return {
      position: vector(value.position, { x: 0, y: 0, z: 0 }),
      rotation: vector(value.rotation, { x: 0, y: 0, z: 0 }),
      scale: vector(value.scale, { x: 1, y: 1, z: 1 })
    };
  }

  async function setEntityTransform(sceneId, entityId, transform = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };
    entity.components = { ...entity.components, transform: normalizeTransform(transform) };
    entity.updatedAt = new Date().toISOString();
    scene.updatedAt = entity.updatedAt;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, entity: clone(entity) };
  }

  async function getEntityTransform(sceneId, entityId, id) {
    const scene = await getScene(sceneId, id);
    if (!scene) return { projectId: projectId(id), ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: projectId(id), ok: false, reason: "entity-not-found" };
    return {
      projectId: projectId(id),
      ok: true,
      transform: normalizeTransform(entity.components?.transform || {})
    };
  }

  async function setActiveScene(sceneId, id) {
    const pid = projectId(id);
    const targetId = String(sceneId || "").trim();
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === targetId);
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const current = await getEngineConfig(pid);
    const config = {
      ...current,
      activeSceneId: scene.id,
      updatedAt: new Date().toISOString()
    };
    await window.ANZUBA_PROJECTS?.setData?.({ [ENGINE_KEY]: config }, pid);
    return { projectId: pid, ok: true, activeSceneId: scene.id, scene: clone(scene) };
  }

  async function clearActiveScene(id) {
    const pid = projectId(id);
    const current = await getEngineConfig(pid);
    const config = {
      ...current,
      activeSceneId: null,
      updatedAt: new Date().toISOString()
    };
    await window.ANZUBA_PROJECTS?.setData?.({ [ENGINE_KEY]: config }, pid);
    return { projectId: pid, ok: true, activeSceneId: null };
  }

  function normalizeComponentMap(components) {
    return components && typeof components === "object" && !Array.isArray(components)
      ? clone(components)
      : {};
  }

  async function setEntityComponents(sceneId, entityId, components = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };
    entity.components = normalizeComponentMap(components);
    entity.updatedAt = new Date().toISOString();
    scene.updatedAt = entity.updatedAt;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, entity: clone(entity) };
  }

  async function getEntityComponents(sceneId, entityId, id) {
    const scene = await getScene(sceneId, id);
    if (!scene) return { projectId: projectId(id), ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: projectId(id), ok: false, reason: "entity-not-found" };
    return {
      projectId: projectId(id),
      ok: true,
      components: normalizeComponentMap(entity.components)
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

  async function setEntityParent(sceneId, entityId, parentId, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };

    const childId = String(entityId || "").trim();
    const nextParentId = String(parentId || "").trim() || null;
    const entity = scene.entities.find(item => item.id === childId);
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };
    if (nextParentId === childId) return { projectId: pid, ok: false, reason: "parent-self" };

    if (nextParentId) {
      const parent = scene.entities.find(item => item.id === nextParentId);
      if (!parent) return { projectId: pid, ok: false, reason: "parent-not-found" };

      let cursor = parent;
      const visited = new Set();
      while (cursor) {
        if (visited.has(cursor.id)) return { projectId: pid, ok: false, reason: "hierarchy-cycle" };
        visited.add(cursor.id);
        if (cursor.id === childId) return { projectId: pid, ok: false, reason: "hierarchy-cycle" };
        const ancestorId = cursor.components?.hierarchy?.parentId;
        cursor = ancestorId ? scene.entities.find(item => item.id === ancestorId) : null;
      }
    }

    entity.components = {
      ...entity.components,
      hierarchy: { ...(entity.components?.hierarchy || {}), parentId: nextParentId }
    };
    entity.updatedAt = new Date().toISOString();
    scene.updatedAt = entity.updatedAt;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, entity: clone(entity) };
  }

  async function getEntityChildren(sceneId, entityId, id) {
    const pid = projectId(id);
    const scene = await getScene(sceneId, pid);
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const targetId = String(entityId || "").trim();
    if (!scene.entities.some(entity => entity.id === targetId)) {
      return { projectId: pid, ok: false, reason: "entity-not-found" };
    }
    return {
      projectId: pid,
      ok: true,
      children: scene.entities
        .filter(entity => entity.components?.hierarchy?.parentId === targetId)
        .map(clone)
    };
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
    configureEngine,
    getEngineConfig,
    getEngineStatus,
    setActiveScene,
    clearActiveScene,
    getScene,
    listScenes,
    addEntity,
    removeEntity,
    updateEntity,
    setEntityTransform,
    getEntityTransform,
    setEntityComponents,
    getEntityComponents,
    setEntityParent,
    getEntityChildren
  };

  window.ANZUBA_AI_BRIDGE?.on("game.engine.configure", ({ options, id } = {}) =>
    configureEngine(options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.engine.status", ({ id } = {}) =>
    getEngineStatus(id));

  window.ANZUBA_AI_BRIDGE?.on("game.scene.activate", ({ sceneId, id } = {}) =>
    setActiveScene(sceneId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scene.deactivate", ({ id } = {}) =>
    clearActiveScene(id));

  window.ANZUBA_AI_BRIDGE?.on("game.scene.create", ({ name, options, id } = {}) =>
    createScene(name, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scene.get", ({ sceneId, id } = {}) =>
    getScene(sceneId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scenes.list", ({ id } = {}) =>
    listScenes(id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.parent.set", ({ sceneId, entityId, parentId, id } = {}) =>
    setEntityParent(sceneId, entityId, parentId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.children.get", ({ sceneId, entityId, id } = {}) =>
    getEntityChildren(sceneId, entityId, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.components.set", ({ sceneId, entityId, components, id } = {}) =>
    setEntityComponents(sceneId, entityId, components || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.components.get", ({ sceneId, entityId, id } = {}) =>
    getEntityComponents(sceneId, entityId, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.transform.set", ({ sceneId, entityId, transform, id } = {}) =>
    setEntityTransform(sceneId, entityId, transform || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.transform.get", ({ sceneId, entityId, id } = {}) =>
    getEntityTransform(sceneId, entityId, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.add", ({ sceneId, name, components, id } = {}) =>
    addEntity(sceneId, name, components || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.remove", ({ sceneId, entityId, id } = {}) =>
    removeEntity(sceneId, entityId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.update", ({ sceneId, entityId, patch, id } = {}) =>
    updateEntity(sceneId, entityId, patch || {}, id));
})();
