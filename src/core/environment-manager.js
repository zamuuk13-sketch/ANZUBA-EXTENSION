(() => {
  const DEFAULT_ENV = {
    HOME: "/home/ai",
    USER: "ai",
    SHELL: "/bin/anzuba-shell",
    PWD: "/workspace",
    PATH: ["/bin", "/usr/bin", "/tools/bin"]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function get(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const data = await window.ANZUBA_PROJECTS?.getData(id);
    if (!data) return null;

    if (!data.environment || typeof data.environment !== "object") {
      await window.ANZUBA_PROJECTS.setData({ environment: clone(DEFAULT_ENV) }, id);
      return clone(DEFAULT_ENV);
    }

    return {
      ...clone(DEFAULT_ENV),
      ...clone(data.environment),
      PATH: Array.isArray(data.environment.PATH)
        ? [...data.environment.PATH]
        : [...DEFAULT_ENV.PATH]
    };
  }

  async function set(name, value, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id || !name) return false;

    const environment = await get(id);
    if (!environment) return false;

    environment[String(name)] = Array.isArray(value) ? [...value] : String(value);
    await window.ANZUBA_PROJECTS.setData({ environment }, id);
    return true;
  }

  async function remove(name, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const environment = await get(id);
    if (!environment || !(name in environment)) return false;

    delete environment[name];
    await window.ANZUBA_PROJECTS.setData({ environment }, id);
    return true;
  }

  async function addPath(path, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const environment = await get(id);
    if (!environment) return false;

    const value = String(path || "").trim();
    if (!value) return false;

    if (!Array.isArray(environment.PATH)) environment.PATH = [];
    if (!environment.PATH.includes(value)) environment.PATH.push(value);

    await window.ANZUBA_PROJECTS.setData({ environment }, id);
    return true;
  }

  async function removePath(path, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const environment = await get(id);
    if (!environment || !Array.isArray(environment.PATH)) return false;

    const next = environment.PATH.filter(item => item !== String(path));
    if (next.length === environment.PATH.length) return false;

    environment.PATH = next;
    await window.ANZUBA_PROJECTS.setData({ environment }, id);
    return true;
  }

  async function reset(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id) return false;
    await window.ANZUBA_PROJECTS.setData({ environment: clone(DEFAULT_ENV) }, id);
    return true;
  }

  window.ANZUBA_ENV = {
    defaults: clone(DEFAULT_ENV),
    get,
    set,
    remove,
    addPath,
    removePath,
    reset
  };

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive();
    if (active) get(active.id);
  }, 0);
})();