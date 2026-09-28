(() => {
  const KEY = "users";
  const GROUPS_KEY = "groups";

  const DEFAULT_USERS = [
    {
      username: "root",
      uid: 0,
      primaryGroup: "root",
      home: "/root",
      shell: "/bin/anzuba-shell",
      locked: false
    },
    {
      username: "ai",
      uid: 1000,
      primaryGroup: "ai",
      home: "/home/ai",
      shell: "/bin/anzuba-shell",
      locked: false
    }
  ];

  const DEFAULT_GROUPS = [
    { name: "root", gid: 0, members: ["root"] },
    { name: "ai", gid: 1000, members: ["ai"] }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectIdOrActive(projectId) {
    return projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  function normalizeUser(raw) {
    return {
      username: String(raw?.username || "").trim().slice(0, 32),
      uid: Number.isFinite(Number(raw?.uid)) ? Number(raw.uid) : 1000,
      primaryGroup: String(raw?.primaryGroup || "ai").trim().slice(0, 32),
      home: String(raw?.home || "/home/ai").slice(0, 200),
      shell: String(raw?.shell || "/bin/anzuba-shell").slice(0, 200),
      locked: Boolean(raw?.locked)
    };
  }

  function normalizeGroup(raw) {
    return {
      name: String(raw?.name || "").trim().slice(0, 32),
      gid: Number.isFinite(Number(raw?.gid)) ? Number(raw.gid) : 1000,
      members: Array.isArray(raw?.members)
        ? [...new Set(raw.members.map(value => String(value).trim()).filter(Boolean))]
        : []
    };
  }

  async function getState(projectId) {
    const id = projectIdOrActive(projectId);
    if (!id) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(id);
    if (!data) return null;

    if (!Array.isArray(data[KEY]) || !Array.isArray(data[GROUPS_KEY])) {
      await window.ANZUBA_PROJECTS.setData({
        [KEY]: clone(DEFAULT_USERS),
        [GROUPS_KEY]: clone(DEFAULT_GROUPS)
      }, id);
      return { users: clone(DEFAULT_USERS), groups: clone(DEFAULT_GROUPS) };
    }

    return {
      users: data[KEY].map(normalizeUser),
      groups: data[GROUPS_KEY].map(normalizeGroup)
    };
  }

  async function saveState(state, projectId) {
    const id = projectIdOrActive(projectId);
    if (!id || !state) return false;

    await window.ANZUBA_PROJECTS.setData({
      [KEY]: state.users.map(normalizeUser),
      [GROUPS_KEY]: state.groups.map(normalizeGroup)
    }, id);

    return true;
  }

  async function list(projectId) {
    const state = await getState(projectId);
    return state ? clone(state.users) : [];
  }

  async function listGroups(projectId) {
    const state = await getState(projectId);
    return state ? clone(state.groups) : [];
  }

  async function get(username, projectId) {
    const users = await list(projectId);
    return users.find(user => user.username === String(username)) || null;
  }

  async function create(options = {}, projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return null;

    const username = String(options.username || "").trim().slice(0, 32);
    if (!/^[a-z_][a-z0-9_-]*$/i.test(username) || state.users.some(user => user.username === username)) {
      return null;
    }

    const usedUids = new Set(state.users.map(user => user.uid));
    let uid = Number(options.uid);
    if (!Number.isInteger(uid) || uid < 1 || usedUids.has(uid)) {
      uid = 1000;
      while (usedUids.has(uid)) uid += 1;
    }

    const primaryGroup = String(options.primaryGroup || username).trim().slice(0, 32);
    if (!state.groups.some(group => group.name === primaryGroup)) {
      const usedGids = new Set(state.groups.map(group => group.gid));
      let gid = Math.max(1000, ...usedGids) + 1;
      state.groups.push({ name: primaryGroup, gid, members: [username] });
    } else {
      const group = state.groups.find(item => item.name === primaryGroup);
      if (!group.members.includes(username)) group.members.push(username);
    }

    const user = normalizeUser({
      username,
      uid,
      primaryGroup,
      home: options.home || (username === "ai" ? "/home/ai" : "/home/" + username),
      shell: options.shell || "/bin/anzuba-shell",
      locked: false
    });

    state.users.push(user);
    await saveState(state, id);
    return clone(user);
  }

  async function setLocked(username, locked, projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return null;

    const user = state.users.find(item => item.username === String(username));
    if (!user) return null;

    if (user.username === "root" && locked) return null;
    user.locked = Boolean(locked);
    await saveState(state, id);
    return clone(user);
  }

  async function remove(username, projectId) {
    const id = projectIdOrActive(projectId);
    const state = await getState(id);
    if (!state) return false;

    const name = String(username);
    if (name === "root" || name === "ai") return false;

    const before = state.users.length;
    state.users = state.users.filter(user => user.username !== name);
    if (before === state.users.length) return false;

    for (const group of state.groups) {
      group.members = group.members.filter(member => member !== name);
    }

    await saveState(state, id);
    return true;
  }

  function permissionBits(mode) {
    const value = String(mode || "rwxr-xr-x").slice(0, 9).padEnd(9, "-");
    return {
      owner: value.slice(0, 3),
      group: value.slice(3, 6),
      other: value.slice(6, 9)
    };
  }

  function canAccess(resource = {}, username = "ai", requested = "r") {
    const user = String(username);
    if (user === "root") return true;

    const owner = String(resource.owner || "root");
    const group = String(resource.group || "root");
    const mode = permissionBits(resource.permissions || "rwxr-xr-x");
    const state = resource._state;

    let scope = "other";
    if (user === owner) scope = "owner";
    else if (state?.groups?.some(item => item.name === group && item.members.includes(user))) scope = "group";

    const allowed = mode[scope];
    return [...String(requested)].every(flag => allowed.includes(flag));
  }

  async function checkAccess(resource, username = "ai", requested = "r", projectId) {
    const state = await getState(projectId);
    if (!state) return false;

    return canAccess(
      { ...resource, _state: state },
      username,
      requested
    );
  }

  window.ANZUBA_USERS = {
    defaults: {
      users: clone(DEFAULT_USERS),
      groups: clone(DEFAULT_GROUPS)
    },
    list,
    listGroups,
    get,
    create,
    remove,
    setLocked,
    checkAccess,
    permissionBits
  };

  window.ANZUBA_AI_BRIDGE?.on("user.list", ({ id } = {}) => list(id));
  window.ANZUBA_AI_BRIDGE?.on("user.get", ({ username, id } = {}) => get(username, id));
  window.ANZUBA_AI_BRIDGE?.on("user.create", ({ id, ...options } = {}) => create(options, id));
  window.ANZUBA_AI_BRIDGE?.on("user.remove", ({ username, id } = {}) => remove(username, id));
  window.ANZUBA_AI_BRIDGE?.on("user.lock", ({ username, locked, id } = {}) => setLocked(username, locked, id));
  window.ANZUBA_AI_BRIDGE?.on("permission.check", ({ resource, username, requested, id } = {}) =>
    checkAccess(resource, username, requested, id)
  );

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) getState(active.id).catch(() => {});
  }, 0);
})();