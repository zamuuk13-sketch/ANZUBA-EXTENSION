(() => {
  const DEFAULT_DIRECTORIES = ["/","/home/","/home/ai/","/projects/","/tools/","/usr/","/bin/","/tmp/","/etc/","/workspace/"];

  const normalize = path => {
    let value = String(path || "/").trim().replace(/\\/g, "/");
    if (!value.startsWith("/")) value = "/" + value;
    const parts = [];
    for (const part of value.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return "/" + parts.join("/");
  };

  const dir = path => {
    const value = normalize(path);
    return value === "/" ? "/" : value + (value.endsWith("/") ? "" : "/");
  };

  const DEFAULT_OWNERS = {
    "/": ["root", "root", "755"],
    "/home/": ["root", "root", "755"],
    "/home/ai/": ["ai", "ai", "700"],
    "/projects/": ["ai", "ai", "775"],
    "/tools/": ["root", "root", "755"],
    "/usr/": ["root", "root", "755"],
    "/bin/": ["root", "root", "755"],
    "/tmp/": ["root", "root", "777"],
    "/etc/": ["root", "root", "755"],
    "/workspace/": ["ai", "ai", "775"]
  };

  const metadata = path => {
    const key = dir(path);
    const [owner, group, mode] = DEFAULT_OWNERS[key] || ["ai", "ai", "664"];
    return { owner, group, mode };
  };

  const empty = () => Object.fromEntries(
    DEFAULT_DIRECTORIES.map(path => [dir(path), {
      type: "directory",
      createdAt: new Date().toISOString(),
      ...metadata(path)
    }])
  );

  async function access(item, username, requested, projectId) {
    if (!item || !window.ANZUBA_USERS?.checkAccess) return true;
    return window.ANZUBA_USERS.checkAccess({
      owner: item.owner || "root",
      group: item.group || "root",
      mode: item.mode || "755"
    }, username || "ai", requested, projectId);
  }

  async function getFs(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id) return null;
    const data = await window.ANZUBA_PROJECTS.getData(id);
    if (!data) return null;
    if (!data.filesystem) {
      data.filesystem = empty();
      await window.ANZUBA_PROJECTS.setData({ filesystem: data.filesystem }, id);
    }
    for (const [key, item] of Object.entries(data.filesystem)) {\n      if (item && typeof item === "object" && !item.owner) Object.assign(item, metadata(key));\n    }\n    return data.filesystem;
  }

  function validMode(mode) {
    const value = String(mode || "").trim();
    return /^[0-7]{3}$/.test(value) ? value : null;
  }

  async function metadataFor(path, projectId) {
    const fs = await getFs(projectId);
    const target = normalize(path);
    const item = fs?.[target] || fs?.[dir(target)];
    if (!item) return null;
    return {
      path: item.type === "directory" ? dir(target) : target,
      type: item.type,
      owner: item.owner || "root",
      group: item.group || "root",
      mode: item.mode || "755",
      size: Number(item.size || (item.type === "file" ? String(item.content || "").length : 0)),
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null
    };
  }

  async function chmod(path, mode, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    const value = validMode(mode);
    const target = normalize(path);
    const key = fs?.[target] ? target : fs?.[dir(target)] ? dir(target) : null;
    if (!fs || !key || !value) return false;
    const username = String(options.username || "ai");
    if (username !== "root" && username !== fs[key].owner) return false;
    fs[key].mode = value;
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function chown(path, owner, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    const target = normalize(path);
    const key = fs?.[target] ? target : fs?.[dir(target)] ? dir(target) : null;
    if (!fs || !key || !owner || String(options.username || "ai") !== "root") return false;
    const user = await window.ANZUBA_USERS?.get?.(owner, id);
    if (!user) return false;
    fs[key].owner = user.username;
    fs[key].group = user.primaryGroup;
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function mkdir(path, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    const target = dir(path);
    const parent = dir(target === "/" ? "/" : target.slice(0, -1).split("/").slice(0, -1).join("/") || "/");
    const username = String(options.username || "ai");
    const parentItem = fs[parent];
    if (!parentItem || !(await access(parentItem, username, "wx", id)) || fs[target]) return false;
    const user = await window.ANZUBA_USERS?.get?.(username, id);
    fs[target] = {
      type: "directory",
      createdAt: new Date().toISOString(),
      owner: user?.username || username,
      group: user?.primaryGroup || "ai",
      mode: validMode(options.mode) || "775"
    };
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function writeFile(path, content, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    const target = normalize(path);
    const username = String(options.username || "ai");
    const existing = fs[target];
    const value = String(content ?? "");
    if (existing) {
      if (existing.type !== "file" || !(await access(existing, username, "w", id))) return false;
      existing.content = value;
      existing.size = value.length;
      existing.updatedAt = new Date().toISOString();
    } else {
      const parent = dir(target.split("/").slice(0, -1).join("/") || "/");
      const parentItem = fs[parent];
      if (!parentItem || !(await access(parentItem, username, "wx", id))) return false;
      const user = await window.ANZUBA_USERS?.get?.(username, id);
      fs[target] = {
        type: "file",
        content: value,
        size: value.length,
        updatedAt: new Date().toISOString(),
        owner: user?.username || username,
        group: user?.primaryGroup || "ai",
        mode: validMode(options.mode) || "664"
      };
    }
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function readFile(path, projectId, options = {}) {
    const fs = await getFs(projectId);
    const target = normalize(path);
    const item = fs?.[target];
    if (!item || item.type !== "file") return null;
    if (!(await access(item, options.username || "ai", "r", projectId))) return null;
    return item.content;
  }

  async function list(path = "/", projectId, options = {}) {
    const fs = await getFs(projectId);
    if (!fs) return [];
    const target = normalize(path);
    const directory = fs[target] || fs[dir(target)];
    if (directory && !(await access(directory, options.username || "ai", "rx", projectId))) return [];
    const parent = dir(target);
    const result = new Map();
    for (const key of Object.keys(fs)) {
      if (!key.startsWith(parent) || key === parent) continue;
      const remainder = key.slice(parent.length);
      const name = remainder.split("/")[0];
      if (!name) continue;
      const child = parent + name;
      const item = fs[key] || fs[child + "/"];
      result.set(name, { name, path: item?.type === "directory" ? child + "/" : child, type: item?.type || "file" });
    }
    return [...result.values()].sort((a,b) => a.name.localeCompare(b.name));
  }

  async function remove(path, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    const target = normalize(path);
    if (target === "/") return false;
    const key = fs[target] ? target : fs[dir(target)] ? dir(target) : null;
    if (!key) return false;
    const parent = dir(target.split("/").slice(0, -1).join("/") || "/");
    const username = String(options.username || "ai");
    if (!fs[parent] || !(await access(fs[parent], username, "wx", id))) return false;
    for (const entry of Object.keys(fs)) {
      if (entry === target || entry === dir(target) || entry.startsWith(dir(target))) delete fs[entry];
    }
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function exists(path, projectId) {
    const fs = await getFs(projectId);
    return !!fs?.[normalize(path)] || !!fs?.[dir(path)];
  }

  window.addEventListener("anzuba:project-changed", e => e.detail?.id && getFs(e.detail.id));

  window.ANZUBA_FS = { directories: [...DEFAULT_DIRECTORIES], normalize, exists, mkdir, writeFile, readFile, list, remove, get: getFs };

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive();
    if (active) getFs(active.id);
  }, 0);
})();