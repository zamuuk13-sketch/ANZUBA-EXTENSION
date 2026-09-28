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

  async function mkdir(path, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    fs[dir(path)] = { type: "directory", createdAt: new Date().toISOString() };
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function writeFile(path, content, projectId, options = {}) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    const value = String(content ?? "");
    fs[normalize(path)] = { type: "file", content: value, size: value.length, updatedAt: new Date().toISOString() };
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function readFile(path, projectId, options = {}) {
    const fs = await getFs(projectId);
    const item = fs?.[normalize(path)];
    return item?.type === "file" ? item.content : null;
  }

  async function list(path = "/", projectId, options = {}) {
    const fs = await getFs(projectId);
    if (!fs) return [];
    const parent = dir(path);
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
    let changed = false;
    for (const key of Object.keys(fs)) {
      if (key === target || key.startsWith(dir(target))) { delete fs[key]; changed = true; }
    }
    if (changed) await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return changed;
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