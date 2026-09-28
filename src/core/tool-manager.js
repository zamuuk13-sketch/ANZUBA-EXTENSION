(() => {
  const TOOL_KEY = "tools";
  const TOOL_TYPES = ["tool", "compiler", "sdk", "library", "runtime", "engine", "package"];
  const STATES = ["available", "installing", "installed", "failed", "removed"];
  const SOURCE_TYPES = ["official", "repository", "registry", "url", "local"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  async function getAll(id) {
    const pid = projectId(id);
    if (!pid) return [];
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return [];
    return Array.isArray(data[TOOL_KEY]) ? clone(data[TOOL_KEY]) : [];
  }

  async function saveAll(tools, id) {
    const pid = projectId(id);
    if (!pid) return false;
    await window.ANZUBA_PROJECTS.setData({ [TOOL_KEY]: clone(tools) }, pid);
    return true;
  }

  function normalize(tool = {}) {
    const now = new Date().toISOString();
    const type = TOOL_TYPES.includes(tool.type) ? tool.type : "tool";
    const status = STATES.includes(tool.status) ? tool.status : "available";
    return {
      id: String(tool.id || crypto.randomUUID()),
      name: String(tool.name || "Ferramenta").trim().slice(0, 120),
      type,
      version: String(tool.version || "").trim().slice(0, 64),
      description: String(tool.description || "").slice(0, 500),
      source: tool.source ? String(tool.source).slice(0, 500) : null,
      sourceType: SOURCE_TYPES.includes(tool.sourceType) ? tool.sourceType : "official",
      homepage: tool.homepage ? String(tool.homepage).slice(0, 500) : null,
      license: tool.license ? String(tool.license).slice(0, 120) : null,
      versions: Array.isArray(tool.versions) ? tool.versions.map(version => String(version).slice(0, 64)).slice(0, 100) : [],
      path: tool.path ? String(tool.path).slice(0, 512) : null,
      status,
      dependencies: Array.isArray(tool.dependencies) ? tool.dependencies.map(String).slice(0, 50) : [],
      executables: Array.isArray(tool.executables) ? tool.executables.map(item => {
        if (typeof item === "string") return { name: String(item).trim(), path: null, args: [] };
        return { name: String(item?.name || "").trim(), path: item?.path ? String(item.path).trim() : null, args: Array.isArray(item?.args) ? item.args.map(String).slice(0, 20) : [] };
      }).filter(item => /^[A-Za-z0-9._-]{1,80}$/.test(item.name)).slice(0, 50) : [],
      compatibility: {
        requires: Array.isArray(tool.compatibility?.requires) ? tool.compatibility.requires.map(item => ({
          toolId: String(item?.toolId || "").trim(),
          range: String(item?.range || "").trim().slice(0, 64)
        })).filter(item => item.toolId && item.range).slice(0, 50) : [],
        conflicts: Array.isArray(tool.compatibility?.conflicts) ? [...new Set(tool.compatibility.conflicts.map(String).map(item => item.trim()).filter(Boolean))].slice(0, 50) : []
      },
      installedAt: tool.installedAt || null,
      createdAt: tool.createdAt || now,
      updatedAt: now
    };
  }

  async function health(id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const issues = [];
    const ids = new Set();

    for (const tool of tools) {
      if (!tool.id || ids.has(tool.id)) {
        issues.push({ type: "invalid-id", toolId: tool.id || null });
      }
      ids.add(tool.id);

      if (!TOOL_TYPES.includes(tool.type)) issues.push({ type: "invalid-type", toolId: tool.id, value: tool.type });
      if (!STATES.includes(tool.status)) issues.push({ type: "invalid-status", toolId: tool.id, value: tool.status });

      for (const dependencyId of Array.isArray(tool.dependencies) ? tool.dependencies : []) {
        if (!ids.has(dependencyId) && !tools.some(item => item.id === dependencyId)) {
          issues.push({ type: "missing-dependency", toolId: tool.id, dependencyId });
        }
      }

      for (const requirement of tool.compatibility?.requires || []) {
        if (!tools.some(item => item.id === requirement.toolId)) {
          issues.push({ type: "missing-compatibility-target", toolId: tool.id, targetId: requirement.toolId });
        }
      }

      for (const conflictId of tool.compatibility?.conflicts || []) {
        if (!tools.some(item => item.id === conflictId)) {
          issues.push({ type: "missing-conflict-target", toolId: tool.id, targetId: conflictId });
        }
      }
    }

    const dependencyIds = new Set();
    for (const tool of tools) {
      for (const dependencyId of tool.dependencies || []) dependencyIds.add(dependencyId);
    }

    for (const dependencyId of dependencyIds) {
      if (!tools.some(item => item.id === dependencyId)) {
        issues.push({ type: "orphan-dependency", dependencyId });
      }
    }

    const uniqueIssues = issues.filter((issue, index, all) =>
      index === all.findIndex(item => JSON.stringify(item) === JSON.stringify(issue))
    );

    return {
      projectId: pid,
      ok: uniqueIssues.length === 0,
      tools: tools.length,
      installed: tools.filter(tool => tool.status === "installed").length,
      issues: uniqueIssues
    };
  }

  async function catalog(query = {}, id) {
    const text = String(query.query || "").trim().toLowerCase();
    const type = query.type ? String(query.type) : null;
    const status = query.status ? String(query.status) : null;
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const tools = await getAll(id);

    const scored = tools
      .filter(tool => !type || tool.type === type)
      .filter(tool => !status || tool.status === status)
      .map(tool => {
        const haystack = [
          tool.name, tool.description, tool.type, tool.license,
          tool.sourceType, ...(tool.versions || [])
        ].join(" ").toLowerCase();
        let score = text ? (haystack.includes(text) ? 50 : 0) : 10;
        if (text && tool.name.toLowerCase() === text) score += 100;
        if (text && tool.name.toLowerCase().startsWith(text)) score += 40;
        if (tool.status === "installed") score += 10;
        if (tool.sourceType === "official") score += 5;
        if (tool.version) score += 2;
        return { tool, score };
      })
      .filter(item => !text || item.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
      .slice(0, limit);

    return {
      projectId: projectId(id),
      query: text,
      count: scored.length,
      results: scored.map(item => ({ ...clone(item.tool), score: item.score }))
    };
  }

  async function recommend(query = {}, id) {
    const result = await catalog(query, id);
    return {
      ...result,
      recommendations: result.results.slice(0, Math.min(result.results.length, 10))
    };
  }

  function parseVersion(version) {
    const match = String(version || "").trim().replace(/^v/i, "").match(/^(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?(?:-([0-9A-Za-z.-]+))?/);
    if (!match) return null;
    return {
      major: Number(match[1]),
      minor: Number(match[2] || 0),
      patch: Number(match[3] || 0),
      prerelease: match[4] || ""
    };
  }

  function compareVersions(a, b) {
    const left = parseVersion(a);
    const right = parseVersion(b);
    if (!left || !right) return null;
    for (const key of ["major", "minor", "patch"]) {
      if (left[key] !== right[key]) return left[key] - right[key];
    }
    if (!left.prerelease && right.prerelease) return 1;
    if (left.prerelease && !right.prerelease) return -1;
    return left.prerelease.localeCompare(right.prerelease);
  }

  function satisfiesRange(version, range) {
    if (!range) return true;
    const value = String(range).trim();
    const parsed = parseVersion(version);
    if (!parsed) return false;

    const exact = value.match(/^=?v?(\\d+(?:\\.\\d+)?(?:\\.\\d+)?(?:-[0-9A-Za-z.-]+)?)$/);
    if (exact) {
      const normalized = exact[1];
      const parts = normalized.replace(/^v/i, "").split("-");
      const nums = parts[0].split(".").map(Number);
      if (nums.length === 1) return parsed.major === nums[0];
      if (nums.length === 2) return parsed.major === nums[0] && parsed.minor === nums[1];
      return compareVersions(version, normalized) === 0;
    }

    const comparator = value.match(/^(>=|<=|>|<)\\s*v?(\\d+(?:\\.\\d+){0,2})$/);
    if (comparator) {
      const result = compareVersions(version, comparator[2]);
      if (result === null) return false;
      return {
        ">=": result >= 0,
        "<=": result <= 0,
        ">": result > 0,
        "<": result < 0
      }[comparator[1]];
    }

    return false;
  }

  async function setCompatibility(toolId, compatibility = {}, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    if (!compatibility || typeof compatibility !== "object" || Array.isArray(compatibility)) {
      throw new Error("Compatibilidade inválida.");
    }

    const requires = Array.isArray(compatibility.requires) ? compatibility.requires : [];
    const conflicts = Array.isArray(compatibility.conflicts) ? compatibility.conflicts : [];
    if (requires.length > 50 || conflicts.length > 50) throw new Error("Limite de compatibilidade excedido.");

    const normalizedRequires = requires.map(item => ({
      toolId: String(item?.toolId || "").trim(),
      range: String(item?.range || "").trim().slice(0, 64)
    })).filter(item => item.toolId && item.range);

    const normalizedConflicts = [...new Set(conflicts.map(String).map(item => item.trim()).filter(Boolean))];
    const missing = normalizedRequires.filter(item => !tools.some(tool => tool.id === item.toolId)).map(item => item.toolId)
      .concat(normalizedConflicts.filter(dep => !tools.some(tool => tool.id === dep)));

    if (missing.length) throw new Error("Ferramenta de compatibilidade não encontrada: " + [...new Set(missing)].join(", "));
    if (normalizedRequires.some(item => item.toolId === toolId) || normalizedConflicts.includes(toolId)) {
      throw new Error("Uma ferramenta não pode declarar incompatibilidade com ela mesma.");
    }

    tools[index] = normalize({
      ...tools[index],
      compatibility: {
        requires: normalizedRequires,
        conflicts: normalizedConflicts
      },
      id: tools[index].id
    });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function validateCompatibility(toolId, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const tool = tools.find(item => item.id === toolId);
    if (!tool) return null;
    const compatibility = tool.compatibility || { requires: [], conflicts: [] };
    const issues = [];

    for (const requirement of compatibility.requires || []) {
      const target = tools.find(item => item.id === requirement.toolId);
      if (!target) {
        issues.push({ type: "missing", toolId: requirement.toolId, range: requirement.range });
        continue;
      }
      if (!target.version || !satisfiesRange(target.version, requirement.range)) {
        issues.push({
          type: "version",
          toolId: target.id,
          required: requirement.range,
          found: target.version || null
        });
      }
    }

    for (const conflictId of compatibility.conflicts || []) {
      const target = tools.find(item => item.id === conflictId);
      if (target && target.status === "installed") {
        issues.push({ type: "conflict", toolId: target.id, version: target.version || null });
      }
    }

    return {
      projectId: pid,
      toolId: tool.id,
      ok: issues.length === 0,
      issues
    };
  }

  async function resolveDependencies(toolId, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const root = tools.find(tool => tool.id === toolId);
    if (!root) return null;

    const byId = new Map(tools.map(tool => [tool.id, tool]));
    const visiting = new Set();
    const visited = new Set();
    const order = [];
    const missing = [];
    const cycles = [];

    function visit(currentId, chain = []) {
      if (visited.has(currentId)) return;
      if (visiting.has(currentId)) {
        cycles.push([...chain, currentId]);
        return;
      }

      const current = byId.get(currentId);
      if (!current) {
        missing.push(currentId);
        return;
      }

      visiting.add(currentId);
      for (const dependencyId of Array.isArray(current.dependencies) ? current.dependencies : []) {
        visit(dependencyId, [...chain, currentId]);
      }
      visiting.delete(currentId);
      visited.add(currentId);
      order.push(currentId);
    }

    visit(toolId);

    const uniqueMissing = [...new Set(missing)];
    const uniqueCycles = cycles.map(chain => [...new Set(chain)]).filter(chain => chain.length > 1 || chain[0] === toolId);
    return {
      projectId: pid,
      toolId,
      ok: uniqueMissing.length === 0 && uniqueCycles.length === 0,
      order,
      missing: uniqueMissing,
      cycles: uniqueCycles,
      tools: order.map(item => byId.get(item)).filter(Boolean).map(clone)
    };
  }

  async function installWithDependencies(id, toolId) {
    const pid = projectId(id);
    const resolution = await resolveDependencies(toolId, pid);
    if (!resolution) return null;
    if (!resolution.ok) throw new Error("Não foi possível resolver as dependências da ferramenta.");

    const installed = [];
    for (const dependencyId of resolution.order) {
      const result = await install(pid, dependencyId);
      installed.push(result);
    }

    return {
      projectId: pid,
      toolId,
      resolution,
      installed
    };
  }

  async function setDependencies(toolId, dependencies = [], id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    if (!Array.isArray(dependencies)) throw new Error("Dependências inválidas.");
    const values = [...new Set(dependencies.map(String).map(item => item.trim()).filter(Boolean))].slice(0, 50);
    if (values.includes(toolId)) throw new Error("Uma ferramenta não pode depender dela mesma.");
    const missing = values.filter(dep => !tools.some(tool => tool.id === dep));
    if (missing.length) throw new Error("Dependência não encontrada: " + missing.join(", "));
    tools[index] = normalize({ ...tools[index], dependencies: values, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function getDependencies(toolId, id) {
    const tool = await get(toolId, id);
    if (!tool) return null;
    const tools = await getAll(id);
    return {
      toolId: tool.id,
      dependencies: (tool.dependencies || []).map(depId => tools.find(item => item.id === depId)).filter(Boolean).map(clone)
    };
  }

  async function getDependents(toolId, id) {
    const tool = await get(toolId, id);
    if (!tool) return null;
    const tools = await getAll(id);
    return {
      toolId: tool.id,
      dependents: tools.filter(item => Array.isArray(item.dependencies) && item.dependencies.includes(toolId)).map(clone)
    };
  }

  async function addVersion(toolId, version, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    const value = String(version || "").trim().slice(0, 64);
    if (!value) throw new Error("Versão inválida.");
    const versions = Array.isArray(tools[index].versions) ? tools[index].versions : [];
    if (!versions.includes(value)) versions.push(value);
    tools[index] = normalize({ ...tools[index], versions, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function removeVersion(toolId, version, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return false;
    const value = String(version || "").trim();
    if (value === tools[index].version) throw new Error("Não é possível remover a versão atualmente selecionada.");
    const versions = (tools[index].versions || []).filter(item => item !== value);
    if (versions.length === (tools[index].versions || []).length) return false;
    tools[index] = normalize({ ...tools[index], versions, id: tools[index].id });
    await saveAll(tools, pid);
    return true;
  }

  async function selectVersion(toolId, version, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    const value = String(version || "").trim();
    if (!value) throw new Error("Versão inválida.");
    const versions = Array.isArray(tools[index].versions) ? tools[index].versions : [];
    if (!versions.includes(value)) throw new Error("Versão não encontrada no catálogo.");
    tools[index] = normalize({ ...tools[index], version: value, id: tools[index].id });
    await saveAll(tools, pid);
    window.dispatchEvent(new CustomEvent("anzuba:tool-version-changed", {
      detail: { projectId: pid, toolId: tools[index].id, version: value }
    }));
    return clone(tools[index]);
  }

  async function getVersions(toolId, id) {
    const tool = await get(toolId, id);
    return tool ? { toolId: tool.id, current: tool.version || null, versions: [...(tool.versions || [])] } : null;
  }

  async function setExecutables(toolId, executables = [], id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    if (!Array.isArray(executables)) throw new Error("Executáveis inválidos.");

    const values = [...new Set(executables.map(item => {
      if (typeof item === "string") return { name: item, path: null, args: [] };
      return {
        name: String(item?.name || "").trim(),
        path: item?.path ? String(item.path).trim() : null,
        args: Array.isArray(item?.args) ? item.args.map(String).slice(0, 20) : []
      };
    }).filter(item => /^[A-Za-z0-9._-]{1,80}$/.test(item.name)))]
      .slice(0, 50);

    tools[index] = normalize({ ...tools[index], executables: values, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function getExecutables(toolId, id) {
    const tool = await get(toolId, id);
    return tool ? {
      toolId: tool.id,
      name: tool.name,
      installed: tool.status === "installed",
      executables: clone(tool.executables || [])
    } : null;
  }

  async function resolveExecutable(name, id) {
    const pid = projectId(id);
    const value = String(name || "").trim();
    if (!value) return null;
    const tools = await getAll(pid);
    for (const tool of tools) {
      if (tool.status !== "installed") continue;
      const executable = (tool.executables || []).find(item => item?.name === value);
      if (!executable) continue;
      return {
        projectId: pid,
        name: value,
        toolId: tool.id,
        toolName: tool.name,
        version: tool.version || null,
        path: executable.path || null,
        args: Array.isArray(executable.args) ? [...executable.args] : [],
        installed: true
      };
    }
    return null;
  }

  async function syncExecutables(id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    if (!pid || !window.ANZUBA_FS || !window.ANZUBA_ENV) return null;

    const binDir = "/tools/bin";
    const binExists = await window.ANZUBA_FS.exists(binDir, pid);
    if (!binExists) {
      const created = await window.ANZUBA_FS.mkdir(binDir, pid, { username: "root", mode: "755" });
      if (!created && !(await window.ANZUBA_FS.exists(binDir, pid))) {
        throw new Error("Não foi possível preparar o diretório virtual de executáveis.");
      }
    }

    const synced = [];
    const skipped = [];
    const expected = new Set();

    for (const tool of tools) {
      if (tool.status !== "installed") continue;
      for (const executable of tool.executables || []) {
        const name = String(executable?.name || "").trim();
        if (!name) continue;

        const rawPath = String(executable?.path || "").trim();
        const path = rawPath && rawPath.startsWith("/")
          ? window.ANZUBA_FS.normalize(rawPath)
          : "/tools/bin/" + name;
        const existing = await window.ANZUBA_FS.get(pid);
        const item = existing?.[path];

        expected.add(path);

        if (item && item.type !== "file") {
          skipped.push({ name, path, toolId: tool.id, reason: "path-not-file" });
          continue;
        }

        if (item && item.anzubaToolId && item.anzubaToolId !== tool.id) {
          skipped.push({ name, path, toolId: tool.id, reason: "path-owned" });
          continue;
        }

        const marker = JSON.stringify({
          type: "anzuba-executable",
          toolId: tool.id,
          toolName: tool.name,
          version: tool.version || null,
          executable: name,
          args: Array.isArray(executable.args) ? executable.args : []
        });

        const written = await window.ANZUBA_FS.writeFile(path, marker, pid, {
          username: "root",
          mode: "755"
        });
        if (!written) {
          skipped.push({ name, path, toolId: tool.id, reason: "write-failed" });
          continue;
        }

        const fs = await window.ANZUBA_FS.get(pid);
        if (fs?.[path]) {
          fs[path].anzubaToolId = tool.id;
          fs[path].anzubaExecutable = name;
          fs[path].mode = "755";
          await window.ANZUBA_PROJECTS.setData({ filesystem: fs }, pid);
        }

        synced.push({ name, path, toolId: tool.id });
      }
    }

    await window.ANZUBA_ENV.addPath(binDir, pid);

    return {
      projectId: pid,
      path: binDir,
      synced,
      skipped
    };
  }

  async function removeExecutableStubs(id, toolId) {
    const pid = projectId(id);
    if (!pid || !window.ANZUBA_FS) return false;
    const fs = await window.ANZUBA_FS.get(pid);
    if (!fs) return false;

    let changed = false;
    for (const [path, item] of Object.entries(fs)) {
      if (item?.type === "file" && item.anzubaToolId === toolId) {
        const removed = await window.ANZUBA_FS.remove(path, pid, { username: "root" });
        changed = removed || changed;
      }
    }
    return changed;
  }

  async function updateMetadata(toolId, metadata = {}, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(tool => tool.id === toolId);
    if (index < 0) return null;
    const allowed = ["source", "sourceType", "homepage", "license", "versions", "description"];
    const changes = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(metadata, key)) changes[key] = metadata[key];
    }
    tools[index] = normalize({ ...tools[index], ...changes, id: tools[index].id });
    await saveAll(tools, pid);
    return clone(tools[index]);
  }

  async function getSources(toolId, id) {
    const tool = await get(toolId, id);
    if (!tool) return null;
    return {
      toolId: tool.id,
      name: tool.name,
      source: tool.source,
      sourceType: tool.sourceType,
      homepage: tool.homepage,
      license: tool.license,
      versions: [...tool.versions]
    };
  }

  async function register(tool = {}, id) {
    const pid = projectId(id);
    if (!pid) return null;
    const tools = await getAll(pid);
    const item = normalize(tool);
    const existing = tools.findIndex(t => t.id === item.id);
    if (existing >= 0) tools[existing] = item;
    else tools.push(item);
    await saveAll(tools, pid);
    return clone(item);
  }

  async function install(id, toolId) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(t => t.id === toolId);
    if (index < 0) throw new Error("Ferramenta não encontrada.");

    const tool = tools[index];
    if (tool.status === "installed") return clone(tool);

    const resolution = await resolveDependencies(toolId, pid);
    if (!resolution?.ok) throw new Error("Dependências da ferramenta não podem ser resolvidas.");
    const unresolved = resolution.order
      .filter(dependencyId => dependencyId !== toolId)
      .map(dependencyId => tools.find(item => item.id === dependencyId))
      .filter(Boolean)
      .filter(dependency => dependency.status !== "installed");
    if (unresolved.length) {
      throw new Error("Dependências ainda não instaladas: " + unresolved.map(item => item.id).join(", "));
    }

    const compatibility = await validateCompatibility(toolId, pid);
    if (compatibility && !compatibility.ok) {
      throw new Error("Ferramenta incompatível: " + compatibility.issues.map(issue => issue.type).join(", "));
    }

    tool.status = "installing";
    tool.updatedAt = new Date().toISOString();
    await saveAll(tools, pid);

    try {
      tool.status = "installed";
      tool.installedAt = tool.installedAt || new Date().toISOString();
      tool.updatedAt = new Date().toISOString();
      await saveAll(tools, pid);
      window.dispatchEvent(new CustomEvent("anzuba:tool-installed", {
        detail: { projectId: pid, toolId: tool.id }
      }));
      return clone(tool);
    } catch (error) {
      tool.status = "failed";
      tool.updatedAt = new Date().toISOString();
      await saveAll(tools, pid);
      throw error;
    }
  }

  async function uninstall(id, toolId) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const index = tools.findIndex(t => t.id === toolId);
    if (index < 0) return false;
    tools[index].status = "removed";
    tools[index].installedAt = null;
    tools[index].updatedAt = new Date().toISOString();
    await saveAll(tools, pid);
    window.dispatchEvent(new CustomEvent("anzuba:tool-removed", {
      detail: { projectId: pid, toolId }
    }));
    return true;
  }

  async function list(filter = {}, id) {
    const tools = await getAll(id);
    return tools.filter(tool => {
      if (filter.type && tool.type !== filter.type) return false;
      if (filter.status && tool.status !== filter.status) return false;
      if (filter.query) {
        const q = String(filter.query).toLowerCase();
        if (!tool.name.toLowerCase().includes(q) && !tool.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  async function get(toolId, id) {
    const tools = await getAll(id);
    return tools.find(tool => tool.id === toolId) || null;
  }

  window.ANZUBA_TOOLS = {
    types: [...TOOL_TYPES],
    states: [...STATES],
    get,
    list,
    register,
    install,
    uninstall,
    setCompatibility,
    validateCompatibility,
    compareVersions,
    satisfiesRange,
    catalog,
    recommend,
    health,
    setExecutables,
    getExecutables,
    resolveExecutable
  };

  window.ANZUBA_AI_BRIDGE?.on("tools.executables.set", ({ toolId, executables, id } = {}) => setExecutables(toolId, executables || [], id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executables.get", ({ toolId, id } = {}) => getExecutables(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executable.resolve", ({ name, id } = {}) => resolveExecutable(name, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.health", ({ id } = {}) => health(id));
  window.ANZUBA_AI_BRIDGE?.on("tools.catalog.search", ({ query, id } = {}) => catalog(query || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.catalog.recommend", ({ query, id } = {}) => recommend(query || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.compatibility.set", ({ toolId, compatibility, id } = {}) => setCompatibility(toolId, compatibility || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.compatibility.validate", ({ toolId, id } = {}) => validateCompatibility(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.dependencies.resolve", ({ toolId, id } = {}) => resolveDependencies(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.install.withDependencies", ({ toolId, id } = {}) => installWithDependencies(id, toolId));
  window.ANZUBA_AI_BRIDGE?.on("tools.dependencies.set", ({ toolId, dependencies, id } = {}) => setDependencies(toolId, dependencies || [], id));
  window.ANZUBA_AI_BRIDGE?.on("tools.dependencies.get", ({ toolId, id } = {}) => getDependencies(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.dependents.get", ({ toolId, id } = {}) => getDependents(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.version.add", ({ toolId, version, id } = {}) => addVersion(toolId, version, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.version.remove", ({ toolId, version, id } = {}) => removeVersion(toolId, version, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.version.select", ({ toolId, version, id } = {}) => selectVersion(toolId, version, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.versions.get", ({ toolId, id } = {}) => getVersions(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.list", ({ filter, id } = {}) => list(filter || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.get", ({ toolId, id } = {}) => get(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.register", ({ tool, id } = {}) => register(tool, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.metadata.update", ({ toolId, metadata, id } = {}) => updateMetadata(toolId, metadata || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.sources.get", ({ toolId, id } = {}) => getSources(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.install", ({ toolId, id } = {}) => install(id, toolId));
  window.ANZUBA_AI_BRIDGE?.on("tools.uninstall", ({ toolId, id } = {}) => uninstall(id, toolId));
})();