(() => {
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

  window.ANZUBA_AI_BRIDGE = {
    getAI,
    getContext,
    isSupported,
    emit
  };

  window.dispatchEvent(new CustomEvent("anzuba:ai-ready", {
    detail: getContext()
  }));
})();