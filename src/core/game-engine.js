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

  async function getSceneSettings(sceneId, id) {
    const pid = projectId(id);
    const scene = await getScene(sceneId, pid);
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const settings = scene.settings && typeof scene.settings === "object" && !Array.isArray(scene.settings)
      ? scene.settings
      : {};
    return {
      projectId: pid,
      ok: true,
      settings: {
        gravity: Number.isFinite(Number(settings.gravity)) ? Number(settings.gravity) : -9.81,
        activeCamera: String(settings.activeCamera || "")
      }
    };
  }

  async function setSceneSettings(sceneId, settings = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };

    const current = scene.settings && typeof scene.settings === "object" && !Array.isArray(scene.settings)
      ? scene.settings
      : {};
    const next = {
      gravity: current.gravity,
      activeCamera: current.activeCamera || ""
    };

    if (settings.gravity !== undefined) {
      const gravity = Number(settings.gravity);
      if (!Number.isFinite(gravity)) {
        return { projectId: pid, ok: false, reason: "invalid-gravity" };
      }
      next.gravity = gravity;
    } else if (!Number.isFinite(Number(next.gravity))) {
      next.gravity = -9.81;
    }

    if (settings.activeCamera !== undefined) {
      const cameraId = String(settings.activeCamera || "").trim();
      if (cameraId) {
        const camera = scene.entities.find(entity => entity.id === cameraId);
        if (!camera) return { projectId: pid, ok: false, reason: "camera-not-found" };
      }
      next.activeCamera = cameraId;
    }

    scene.settings = next;
    scene.updatedAt = new Date().toISOString();
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, sceneId: scene.id, settings: clone(next) };
  }

  async function duplicateScene(sceneId, options = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    if (scenes.length >= 50) return { projectId: pid, ok: false, reason: "scene-limit" };

    const sourceId = String(sceneId || "").trim();
    const source = scenes.find(item => item.id === sourceId);
    if (!source) return { projectId: pid, ok: false, reason: "scene-not-found" };

    const now = new Date().toISOString();
    const copy = clone(source);
    copy.id = "scene_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    copy.projectId = pid;
    copy.name = String(options.name !== undefined ? options.name : source.name + " Copy").trim().slice(0, 120) || "Scene Copy";
    copy.createdAt = now;
    copy.updatedAt = now;
    copy.entities = Array.isArray(copy.entities) ? copy.entities.map(entity => ({
      ...entity,
      id: "entity_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      createdAt: now,
      updatedAt: now
    })) : [];

    const idMap = new Map();
    const originalEntities = source.entities || [];
    originalEntities.forEach((entity, index) => {
      if (copy.entities[index]) idMap.set(entity.id, copy.entities[index].id);
    });
    copy.entities.forEach(entity => {
      const parentId = entity.components?.hierarchy?.parentId;
      if (parentId) {
        entity.components = {
          ...entity.components,
          hierarchy: {
            ...(entity.components.hierarchy || {}),
            parentId: idMap.get(parentId) || null
          }
        };
      }
    });
    if (copy.settings?.activeCamera) {
      copy.settings = {
        ...copy.settings,
        activeCamera: idMap.get(copy.settings.activeCamera) || copy.settings.activeCamera
      };
    }

    scenes.push(copy);
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, scene: clone(copy) };
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

  async function reorderEntity(sceneId, entityId, index, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const targetId = String(entityId || "").trim();
    const currentIndex = scene.entities.findIndex(entity => entity.id === targetId);
    if (currentIndex < 0) return { projectId: pid, ok: false, reason: "entity-not-found" };

    const numericIndex = Number(index);
    if (!Number.isFinite(numericIndex)) {
      return { projectId: pid, ok: false, reason: "invalid-index" };
    }
    const nextIndex = Math.max(0, Math.min(scene.entities.length - 1, Math.trunc(numericIndex)));
    const [entity] = scene.entities.splice(currentIndex, 1);
    scene.entities.splice(nextIndex, 0, entity);
    scene.updatedAt = new Date().toISOString();
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, scene: clone(scene), entity: clone(entity), index: nextIndex };
  }

  async function setEntityVisibility(sceneId, entityId, visible = true, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };

    entity.visible = Boolean(visible);
    entity.updatedAt = new Date().toISOString();
    scene.updatedAt = entity.updatedAt;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, entity: clone(entity) };
  }

  async function getEntityVisibility(sceneId, entityId, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };
    return { projectId: pid, ok: true, visible: entity.visible !== false };
  }

  async function setEntityEnabled(sceneId, entityId, enabled = true, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };

    entity.enabled = Boolean(enabled);
    entity.updatedAt = new Date().toISOString();
    scene.updatedAt = entity.updatedAt;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, entity: clone(entity) };
  }

  async function getEntityEnabled(sceneId, entityId, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const entity = scene.entities.find(item => item.id === String(entityId || "").trim());
    if (!entity) return { projectId: pid, ok: false, reason: "entity-not-found" };
    return { projectId: pid, ok: true, enabled: entity.enabled !== false };
  }

  async function duplicateEntity(sceneId, entityId, options = {}, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    if (scene.entities.length >= 1000) return { projectId: pid, ok: false, reason: "entity-limit" };

    const sourceId = String(entityId || "").trim();
    const source = scene.entities.find(item => item.id === sourceId);
    if (!source) return { projectId: pid, ok: false, reason: "entity-not-found" };

    const now = new Date().toISOString();
    const copy = {
      ...clone(source),
      id: "entity_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: String(options.name !== undefined ? options.name : source.name + " Copy").slice(0, 120),
      createdAt: now,
      updatedAt: now
    };
    if (options.parentId !== undefined) {
      const nextParentId = String(options.parentId || "").trim() || null;
      if (nextParentId) {
        const parent = scene.entities.find(item => item.id === nextParentId);
        if (!parent) return { projectId: pid, ok: false, reason: "parent-not-found" };
        if (nextParentId === copy.id) return { projectId: pid, ok: false, reason: "parent-self" };
      }
      copy.components = {
        ...copy.components,
        hierarchy: { ...(copy.components?.hierarchy || {}), parentId: nextParentId }
      };
    }

    scene.entities.push(copy);
    scene.updatedAt = now;
    await window.ANZUBA_PROJECTS?.setData?.({ [SCENE_KEY]: scenes }, pid);
    return { projectId: pid, ok: true, scene: clone(scene), entity: clone(copy) };
  }

  async function removeEntity(sceneId, entityId, id) {
    const pid = projectId(id);
    const scenes = await getScenes(pid);
    const scene = scenes.find(item => item.id === String(sceneId || "").trim());
    if (!scene) return { projectId: pid, ok: false, reason: "scene-not-found" };
    const targetId = String(entityId || "").trim();
    const before = scene.entities.length;
    scene.entities = scene.entities.filter(entity => entity.id !== targetId);
    if (scene.entities.length === before) return { projectId: pid, ok: false, reason: "entity-not-found" };

    scene.entities.forEach(entity => {
      if (entity.components?.hierarchy?.parentId === targetId) {
        entity.components = {
          ...entity.components,
          hierarchy: { ...(entity.components.hierarchy || {}), parentId: null }
        };
        entity.updatedAt = new Date().toISOString();
      }
    });

    const engine = await getEngineConfig(pid);
    if (engine.activeSceneId === scene.id) {
      // Keep the scene active; removing an entity must never invalidate scene selection.
      engine.activeSceneId = scene.id;
      engine.updatedAt = new Date().toISOString();
      await window.ANZUBA_PROJECTS?.setData?.({ [ENGINE_KEY]: engine }, pid);
    }
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

  async function getGameEngineDiagnostics(id) {
    const pid = projectId(id);
    const config = await getEngineConfig(pid);
    const scenes = await getScenes(pid);
    const problems = [];
    const sceneIds = new Set();

    if (!["2d", "3d"].includes(config.mode)) problems.push("invalid-engine-mode");
    if (config.activeSceneId && !scenes.some(scene => scene.id === config.activeSceneId)) {
      problems.push("active-scene-not-found");
    }
    if (scenes.length > 50) problems.push("scene-limit-exceeded");

    scenes.forEach(scene => {
      if (scene.projectId !== pid) problems.push("scene-project-mismatch:" + scene.id);
      if (sceneIds.has(scene.id)) problems.push("duplicate-scene-id:" + scene.id);
      sceneIds.add(scene.id);
      if (!Array.isArray(scene.entities)) {
        problems.push("invalid-entities:" + scene.id);
        return;
      }
      if (scene.entities.length > 1000) problems.push("entity-limit-exceeded:" + scene.id);
      const entityIds = new Set();
      scene.entities.forEach(entity => {
        if (!entity.id || entityIds.has(entity.id)) problems.push("duplicate-entity-id:" + scene.id);
        entityIds.add(entity.id);
        if (!entity.components || typeof entity.components !== "object" || Array.isArray(entity.components)) {
          problems.push("invalid-components:" + scene.id + ":" + entity.id);
        }
        const parentId = entity.components?.hierarchy?.parentId;
        if (parentId && !entityIds.has(parentId) && !scene.entities.some(item => item.id === parentId)) {
          problems.push("missing-parent:" + scene.id + ":" + entity.id);
        }
      });
      scene.entities.forEach(entity => {
        let cursorId = entity.components?.hierarchy?.parentId || null;
        const visited = new Set();
        while (cursorId) {
          if (visited.has(cursorId)) {
            problems.push("hierarchy-cycle:" + scene.id + ":" + entity.id);
            break;
          }
          visited.add(cursorId);
          const parent = scene.entities.find(item => item.id === cursorId);
          if (!parent) break;
          cursorId = parent.components?.hierarchy?.parentId || null;
        }
      });
    });

    return {
      projectId: pid,
      ok: problems.length === 0,
      healthy: problems.length === 0,
      sceneCount: scenes.length,
      entityCount: scenes.reduce((total, scene) => total + (Array.isArray(scene.entities) ? scene.entities.length : 0), 0),
      activeSceneId: config.activeSceneId || null,
      problems
    };
  }

  async function listScenes(id) {
    return getScenes(id);
  }

  window.ANZUBA_GAME_ENGINE = {
    createScene,
    duplicateScene,
    getSceneSettings,
    setSceneSettings,
    configureEngine,
    getEngineConfig,
    getEngineStatus,
    getGameEngineDiagnostics,
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
    getEntityChildren,
    reorderEntity,
    duplicateEntity,
    setEntityEnabled,
    getEntityEnabled,
    setEntityVisibility,
    getEntityVisibility
  };

  window.ANZUBA_AI_BRIDGE?.on("game.engine.configure", ({ options, id } = {}) =>
    configureEngine(options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.engine.status", ({ id } = {}) =>
    getEngineStatus(id));
  window.ANZUBA_AI_BRIDGE?.on("game.engine.diagnostics", ({ id } = {}) =>
    getGameEngineDiagnostics(id));


  window.ANZUBA_AI_BRIDGE?.on("game.scene.activate", ({ sceneId, id } = {}) =>
    setActiveScene(sceneId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scene.deactivate", ({ id } = {}) =>
    clearActiveScene(id));

  window.ANZUBA_AI_BRIDGE?.on("game.scene.create", ({ name, options, id } = {}) =>
    createScene(name, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scene.duplicate", ({ sceneId, options, id } = {}) =>
    duplicateScene(sceneId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("game.scene.settings.get", ({ sceneId, id } = {}) =>
    getSceneSettings(sceneId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scene.settings.set", ({ sceneId, settings, id } = {}) =>
    setSceneSettings(sceneId, settings || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("game.scene.get", ({ sceneId, id } = {}) =>
    getScene(sceneId, id));
  window.ANZUBA_AI_BRIDGE?.on("game.scenes.list", ({ id } = {}) =>
    listScenes(id));
  window.ANZUBA_AI_BRIDGE?.on("game.entity.visibility.set", ({ sceneId, entityId, visible, id } = {}) =>
    setEntityVisibility(sceneId, entityId, visible, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.visibility.get", ({ sceneId, entityId, id } = {}) =>
    getEntityVisibility(sceneId, entityId, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.enabled.set", ({ sceneId, entityId, enabled, id } = {}) =>
    setEntityEnabled(sceneId, entityId, enabled, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.enabled.get", ({ sceneId, entityId, id } = {}) =>
    getEntityEnabled(sceneId, entityId, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.duplicate", ({ sceneId, entityId, options, id } = {}) =>
    duplicateEntity(sceneId, entityId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("game.entity.reorder", ({ sceneId, entityId, index, id } = {}) =>
    reorderEntity(sceneId, entityId, index, id));

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
