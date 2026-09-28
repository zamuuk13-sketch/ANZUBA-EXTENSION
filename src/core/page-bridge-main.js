(() => {
  if (window.__ANZUBA_MAIN_BRIDGE__) return;
  window.__ANZUBA_MAIN_BRIDGE__ = true;

  const CHANNEL = "ANZUBA_MAIN_BRIDGE_V1";
  let sequence = 0;
  const pending = new Map();

  function request(command, payload = {}) {
    const id = "page_" + Date.now() + "_" + (++sequence);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      window.postMessage({ source: CHANNEL, direction: "request", id, command: String(command || ""), payload }, location.origin);
      setTimeout(() => {
        const item = pending.get(id);
        if (!item) return;
        pending.delete(id);
        item.reject(new Error("Tempo limite do ANZUBA OS."));
      }, 15000);
    });
  }

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== CHANNEL || data.direction !== "response") return;
    const item = pending.get(data.id);
    if (!item) return;
    pending.delete(data.id);
    if (data.ok) item.resolve(data.result);
    else item.reject(new Error(String(data.error || "Erro no ANZUBA OS.")));
  });

  const api = {
    version: "1.0",
    connected: true,
    request,
    getContext: () => request("context.get"),
    project: { summary: id => request("project.summary", id ? { id } : {}) },
    os: {
      status: id => request("os.status", id ? { id } : {}),
      boot: id => request("os.boot", id ? { id } : {}),
      shutdown: id => request("os.shutdown", id ? { id } : {})
    },
    fs: {
      list: (path, id) => request("fs.list", { path, id }),
      read: (path, id) => request("fs.read", { path, id }),
      write: (path, content, id) => request("fs.write", { path, content, id }),
      mkdir: (path, id) => request("fs.mkdir", { path, id })
    },
    game: {
      createScene: options => request("game.scene.create", options || {}),
      activateScene: sceneId => request("game.scene.activate", { sceneId }),
      addEntity: (sceneId, entity) => request("game.entity.add", { sceneId, entity }),
      transform: (sceneId, entityId, transform) => request("game.entity.transform.set", { sceneId, entityId, transform }),
      components: (sceneId, entityId, components) => request("game.entity.components.set", { sceneId, entityId, components }),
      parent: (sceneId, entityId, parentId) => request("game.entity.parent.set", { sceneId, entityId, parentId }),
      gravity: (sceneId, gravity) => request("game.scene.gravity.set", { sceneId, gravity })
    }
  };

  Object.defineProperty(window, "ANZUBA", {
    value: Object.freeze(api), configurable: false, enumerable: true, writable: false
  });
  Object.defineProperty(window, "ANZUBA_OS", {
    value: Object.freeze(api.os), configurable: false, enumerable: true, writable: false
  });

  window.dispatchEvent(new CustomEvent("anzuba:main-ready", {
    detail: { version: api.version, connected: true }
  }));
})();