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

  const empty = () => Object.fromEntries(
    DEFAULT_DIRECTORIES.map(path => [dir(path), { type: "directory", createdAt: new Date().toISOString() }])
  );

  async function getFs(projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    if (!id) return null;
    const data = await window.ANZUBA_PROJECTS.getData(id);
    if (!data) return null;
    if (!data.filesystem) {
      data.filesystem = empty();
      await window.ANZUBA_PROJECTS.setData({ filesystem: data.filesystem }, id);
    }
    return data.filesystem;
  }

  async function mkdir(path, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    fs[dir(path)] = { type: "directory", createdAt: new Date().toISOString() };
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function writeFile(path, content, projectId) {
    const id = projectId || window.ANZUBA_PROJECTS?.getActive()?.id;
    const fs = await getFs(id);
    if (!fs) return false;
    const value = String(content ?? "");
    fs[normalize(path)] = { type: "file", content: value, size: value.length, updatedAt: new Date().toISOString() };
    await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, id);
    return true;
  }

  async function readFile(path, projectId) {
    const fs = await getFs(projectId);
    const item = fs?.[normalize(path)];
    return item?.type === "file" ? item.content : null;
  }

  async function list(path = "/", projectId) {
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

  async function remove(path, projectId) {
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