(() => {
  const handlers = new Map();
  let requestSequence = 0;

  function getAI() {
    return window.ANZUBA_AI_DETECTOR?.detect() || {
      id: "unknown",
      name: "Site não reconhecido",
      hostname: location.hostname,
      supported: false
    };
  }

  function getContext() {
    const ai = getAI();
    const activeProject = window.ANZUBA_PROJECTS?.getActive?.() || null;
    return {
      ai: { ...ai },
      page: {
        url: location.href,
        hostname: location.hostname,
        title: document.title
      },
      project: activeProject
        ? { id: activeProject.id, name: activeProject.name, ai: activeProject.ai || null }
        : null,
      capabilities: {
        projectStorage: Boolean(window.ANZUBA_PROJECTS),
        filesystem: Boolean(window.ANZUBA_FS),
        environment: Boolean(window.ANZUBA_ENV),
        resources: Boolean(window.ANZUBA_RESOURCES),
        materials: Boolean(window.ANZUBA_MATERIALS)
      },
      timestamp: new Date().toISOString()
    };
  }

  function isSupported() {
    return getAI().supported;
  }

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent("anzuba:ai-event", {
      detail: {
        type,
        ...detail,
        context: getContext()
      }
    }));
  }

  function on(command, handler) {
    if (typeof command !== "string" || !command.trim()) {
      throw new Error("Comando inválido.");
    }
    if (typeof handler !== "function") {
      throw new Error("Handler inválido.");
    }

    const name = command.trim();
    handlers.set(name, handler);

    return () => handlers.delete(name);
  }

  async function request(command, payload = {}) {
    const name = typeof command === "string" ? command.trim() : "";

    if (!name) {
      throw new Error("Comando inválido.");
    }

    const id = `req_${Date.now()}_${++requestSequence}`;
    emit("command:start", { requestId: id, command: name, payload });

    try {
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`Comando não disponível: ${name}`);
      }

      const result = await handler(payload, getContext());

      emit("command:complete", {
        requestId: id,
        command: name,
        result
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      emit("command:error", {
        requestId: id,
        command: name,
        error: message
      });

      throw new Error(message);
    }
  }

  on("context.get", () => getContext());

  window.ANZUBA_AI_BRIDGE = {
    getAI,
    getContext,
    isSupported,
    emit,
    on,
    request
  };

  window.dispatchEvent(new CustomEvent("anzuba:ai-ready", {
    detail: getContext()
  }));
})();