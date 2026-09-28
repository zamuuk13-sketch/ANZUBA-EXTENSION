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
      languageId: tool.languageId ? String(tool.languageId).slice(0, 80) : null,
      languageName: tool.languageName ? String(tool.languageName).slice(0, 80) : null,
      extensions: Array.isArray(tool.extensions) ? [...new Set(tool.extensions.map(String).map(value => value.toLowerCase()).filter(value => /^\.[a-z0-9][a-z0-9._-]{0,15}$/.test(value)))].slice(0, 30) : [],
      compilerConfig: {
        languageId: tool.compilerConfig?.languageId ? String(tool.compilerConfig.languageId).slice(0, 80) : null,
        sourceExtensions: Array.isArray(tool.compilerConfig?.sourceExtensions) ? tool.compilerConfig.sourceExtensions.map(String).slice(0, 30) : [],
        outputExtension: tool.compilerConfig?.outputExtension ? String(tool.compilerConfig.outputExtension).slice(0, 16) : null,
        defaultArgs: Array.isArray(tool.compilerConfig?.defaultArgs) ? tool.compilerConfig.defaultArgs.map(String).slice(0, 30) : []
      },
      runtimeConfig: {
        environment: tool.runtimeConfig?.environment && typeof tool.runtimeConfig.environment === "object" ? { ...tool.runtimeConfig.environment } : {},
        workingDirectory: tool.runtimeConfig?.workingDirectory ? String(tool.runtimeConfig.workingDirectory).slice(0, 512) : null
      },
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

  async function registerLanguageRuntime(runtime = {}, id) {
    const pid = projectId(id);
    const name = String(runtime.name || "").trim().slice(0, 120);
    const version = String(runtime.version || "").trim().slice(0, 64);
    const command = String(runtime.command || "").trim().slice(0, 80);
    if (!name || !command) throw new Error("Runtime de linguagem inválido.");

    const tools = await getAll(pid);
    const existing = tools.find(tool => tool.type === "runtime" && tool.name.toLowerCase() === name.toLowerCase());
    const payload = {
      id: existing?.id || crypto.randomUUID(),
      name,
      type: "runtime",
      version,
      description: String(runtime.description || "Runtime de linguagem do ANZUBA").slice(0, 500),
      source: runtime.source ? String(runtime.source).slice(0, 500) : null,
      sourceType: SOURCE_TYPES.includes(runtime.sourceType) ? runtime.sourceType : "official",
      homepage: runtime.homepage ? String(runtime.homepage).slice(0, 500) : null,
      license: runtime.license ? String(runtime.license).slice(0, 120) : null,
      versions: Array.isArray(runtime.versions) ? runtime.versions : (version ? [version] : []),
      path: runtime.path ? String(runtime.path).slice(0, 512) : null,
      status: "installed",
      dependencies: Array.isArray(runtime.dependencies) ? runtime.dependencies : [],
      executables: [{ name: command, path: runtime.path ? String(runtime.path).trim() : null, args: [] }],
      compatibility: runtime.compatibility || { requires: [], conflicts: [] },
      installedAt: existing?.installedAt || new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    const normalized = normalize(payload);
    const index = tools.findIndex(tool => tool.id === normalized.id);
    if (index >= 0) tools[index] = normalized;
    else tools.push(normalized);

    await saveAll(tools, pid);
    await syncExecutables(pid);
    return clone(normalized);
  }

  async function getLanguageRuntime(name, id) {
    const pid = projectId(id);
    const value = String(name || "").trim().toLowerCase();
    if (!value) return null;
    const runtimes = await listLanguageRuntimes(pid);
    const runtime = runtimes.find(item => item.name.toLowerCase() === value);
    return runtime ? clone(runtime) : null;
  }

  async function setLanguageRuntimeConfig(name, config = {}, id) {
    const pid = projectId(id);
    const runtime = await getLanguageRuntime(name, pid);
    if (!runtime) return null;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("Configuração do runtime inválida.");
    }

    const tools = await getAll(pid);
    const index = tools.findIndex(item => item.id === runtime.id);
    if (index < 0) return null;

    const environment = {};
    if (config.environment && typeof config.environment === "object" && !Array.isArray(config.environment)) {
      for (const [key, value] of Object.entries(config.environment).slice(0, 50)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        environment[key] = String(value).slice(0, 500);
      }
    }

    const updated = normalize({
      ...tools[index],
      id: tools[index].id,
      runtimeConfig: {
        environment,
        workingDirectory: config.workingDirectory ? String(config.workingDirectory).slice(0, 512) : null
      }
    });

    tools[index] = updated;
    await saveAll(tools, pid);
    return clone(updated.runtimeConfig);
  }

  async function listLanguageRuntimes(id) {
    const tools = await getAll(id);
    return tools.filter(tool => tool.type === "runtime" && tool.status === "installed").map(clone);
  }

  async function registerLanguage(language = {}, id) {
    const pid = projectId(id);
    const name = String(language.name || "").trim().slice(0, 80);
    const idValue = String(language.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 80);
    if (!name || !idValue) throw new Error("Linguagem inválida.");

    const extensions = [...new Set((Array.isArray(language.extensions) ? language.extensions : [])
      .map(value => String(value).trim().toLowerCase())
      .filter(value => /^\.[a-z0-9][a-z0-9._-]{0,15}$/.test(value)))].slice(0, 30);

    const tools = await getAll(pid);
    const existing = tools.find(tool => tool.type === "runtime" && tool.languageId === idValue);
    const updated = normalize({
      ...(existing || {}),
      id: existing?.id || crypto.randomUUID(),
      name: existing?.name || name,
      type: "runtime",
      version: existing?.version || String(language.version || "").trim().slice(0, 64),
      status: existing?.status || "available",
      languageId: idValue,
      languageName: name,
      extensions,
      source: language.source ? String(language.source).slice(0, 500) : existing?.source || null,
      homepage: language.homepage ? String(language.homepage).slice(0, 500) : existing?.homepage || null,
      description: language.description ? String(language.description).slice(0, 500) : existing?.description || "Definição de linguagem do ANZUBA"
    });

    const index = tools.findIndex(tool => tool.id === updated.id);
    if (index >= 0) tools[index] = updated;
    else tools.push(updated);
    await saveAll(tools, pid);
    return clone(updated);
  }

  async function findLanguageByFile(filePath, id) {
    const pid = projectId(id);
    const value = String(filePath || "").trim().toLowerCase();
    const dot = value.lastIndexOf(".");
    if (dot < 0) return null;
    const extension = value.slice(dot);

    const tools = await getAll(pid);
    const matches = tools
      .filter(tool => tool.type === "runtime" && Array.isArray(tool.extensions) && tool.extensions.includes(extension))
      .map(tool => ({
        id: tool.languageId || tool.id,
        name: tool.languageName || tool.name,
        extension,
        runtimeId: tool.id,
        runtimeInstalled: tool.status === "installed"
      }));

    return matches.length ? matches : null;
  }

  async function detectLanguage(filePath, content = "", id) {
    const pid = projectId(id);
    const byExtension = await findLanguageByFile(filePath, pid);
    if (byExtension?.length) {
      return {
        projectId: pid,
        method: "extension",
        filePath: String(filePath || ""),
        language: byExtension[0],
        matches: byExtension
      };
    }

    const text = String(content || "");
    const firstLine = text.split(/\r?\n/, 1)[0].trim();
    const shebang = firstLine.match(/^#!\\s*(?:\\/usr\\/bin\\/env\\s+)?([A-Za-z0-9._-]+)/);
    if (shebang) {
      const executable = shebang[1].toLowerCase();
      const runtimes = await listLanguageRuntimes(pid);
      const matches = runtimes
        .filter(tool => (tool.executables || []).some(item => String(item?.name || "").toLowerCase() === executable))
        .map(tool => ({
          id: tool.languageId || tool.id,
          name: tool.languageName || tool.name,
          runtimeId: tool.id,
          runtimeInstalled: tool.status === "installed",
          executable
        }));
      if (matches.length) {
        return {
          projectId: pid,
          method: "shebang",
          filePath: String(filePath || ""),
          language: matches[0],
          matches
        };
      }
    }

    const trimmed = text.trim();
    const hints = [];
    if (/^\\s*(import|from)\\s+.+\\s+import\\s+|^\\s*def\\s+\\w+\\s*\\(/m.test(trimmed)) hints.push("python");
    if (/^\\s*(const|let|var)\\s+|=>\\s*[{(]|console\\.log\\s*\\(/m.test(trimmed)) hints.push("javascript");
    if (/#include\\s*[<\"]|\\b(int|float|double|std::string)\\s+\\w+\\s*[=;(]/m.test(trimmed)) hints.push("cpp");

    if (hints.length) {
      const runtimes = await listLanguageRuntimes(pid);
      const matches = hints.map(hint => runtimes.find(tool => tool.languageId === hint)).filter(Boolean).map(tool => ({
        id: tool.languageId || tool.id,
        name: tool.languageName || tool.name,
        runtimeId: tool.id,
        runtimeInstalled: tool.status === "installed"
      }));
      if (matches.length) {
        return {
          projectId: pid,
          method: "content",
          filePath: String(filePath || ""),
          language: matches[0],
          matches
        };
      }
    }

    return {
      projectId: pid,
      method: "unknown",
      filePath: String(filePath || ""),
      language: null,
      matches: []
    };
  }

  async function registerCompiler(compiler = {}, id) {
    const pid = projectId(id);
    const name = String(compiler.name || "").trim().slice(0, 120);
    const command = String(compiler.command || "").trim().slice(0, 80);
    const languageId = String(compiler.languageId || "").trim().slice(0, 80);
    if (!name || !command || !languageId) throw new Error("Compiler inválido.");

    const tools = await getAll(pid);
    const existing = tools.find(tool => tool.type === "compiler" && tool.name.toLowerCase() === name.toLowerCase());
    const updated = normalize({
      ...(existing || {}),
      id: existing?.id || crypto.randomUUID(),
      name,
      type: "compiler",
      version: existing?.version || String(compiler.version || "").trim().slice(0, 64),
      status: existing?.status || "available",
      languageId,
      languageName: compiler.languageName ? String(compiler.languageName).slice(0, 80) : existing?.languageName || null,
      source: compiler.source ? String(compiler.source).slice(0, 500) : existing?.source || null,
      homepage: compiler.homepage ? String(compiler.homepage).slice(0, 500) : existing?.homepage || null,
      description: compiler.description ? String(compiler.description).slice(0, 500) : existing?.description || "Compiler registrado no ANZUBA",
      executables: [{ name: command, path: compiler.path ? String(compiler.path).trim() : null, args: Array.isArray(compiler.args) ? compiler.args.map(String).slice(0, 20) : [] }],
      compilerConfig: {
        languageId,
        sourceExtensions: Array.isArray(compiler.sourceExtensions) ? [...new Set(compiler.sourceExtensions.map(String).map(value => value.toLowerCase()).filter(value => /^\.[a-z0-9][a-z0-9._-]{0,15}$/.test(value)))].slice(0, 30) : [],
        outputExtension: compiler.outputExtension ? String(compiler.outputExtension).trim().slice(0, 16) : null,
        defaultArgs: Array.isArray(compiler.defaultArgs) ? compiler.defaultArgs.map(String).slice(0, 30) : []
      }
    });

    const index = tools.findIndex(tool => tool.id === updated.id);
    if (index >= 0) tools[index] = updated;
    else tools.push(updated);
    await saveAll(tools, pid);
    return clone(updated);
  }

  async function listCompilers(languageId, id) {
    const pid = projectId(id);
    const language = String(languageId || "").trim().toLowerCase();
    const tools = await getAll(pid);
    return tools.filter(tool =>
      tool.type === "compiler" &&
      (!language || String(tool.compilerConfig?.languageId || tool.languageId || "").toLowerCase() === language)
    ).map(clone);
  }

  async function findCompilerForLanguage(languageId, id) {
    const compilers = await listCompilers(languageId, id);
    return compilers.find(tool => tool.status === "installed") || compilers[0] || null;
  }

  async function validateCompiler(compilerId, id) {
    const pid = projectId(id);
    const tools = await getAll(pid);
    const compiler = tools.find(tool => tool.id === String(compilerId || "").trim() && tool.type === "compiler");
    if (!compiler) {
      return { projectId: pid, ok: false, compilerId: String(compilerId || ""), reason: "compiler-not-found", compiler: null, issues: ["compiler-not-found"] };
    }

    const issues = [];
    const languageId = String(compiler.compilerConfig?.languageId || compiler.languageId || "").trim();

    if (!languageId) issues.push("language-missing");

    const language = tools.find(tool =>
      tool.type === "runtime" &&
      String(tool.languageId || "").toLowerCase() === languageId.toLowerCase()
    );
    if (!language) issues.push("language-not-registered");

    const extensions = Array.isArray(compiler.compilerConfig?.sourceExtensions)
      ? compiler.compilerConfig.sourceExtensions
      : [];
    for (const extension of extensions) {
      if (!/^\.[a-z0-9][a-z0-9._-]{0,15}$/.test(String(extension))) {
        issues.push(`invalid-source-extension:${extension}`);
      }
    }

    const executableNames = Array.isArray(compiler.executables)
      ? compiler.executables.map(item => String(item?.name || "").trim()).filter(Boolean)
      : [];
    if (!executableNames.length) {
      issues.push("executable-missing");
    } else {
      const resolved = executableNames.some(name =>
        tools.some(tool =>
          tool.id === compiler.id &&
          tool.status === "installed" &&
          (tool.executables || []).some(item => String(item?.name || "").trim() === name)
        )
      );
      if (!resolved) issues.push("executable-not-installed");
    }

    if (compiler.status === "installed") {
      const compatibility = await validateCompatibility(compiler.id, pid);
      if (!compatibility.ok) issues.push("incompatible");
    } else {
      issues.push("compiler-not-installed");
    }

    const uniqueIssues = [...new Set(issues)];
    return {
      projectId: pid,
      ok: uniqueIssues.length === 0,
      compilerId: compiler.id,
      compiler: clone(compiler),
      language: language ? clone(language) : null,
      issues: uniqueIssues
    };
  }

  async function compileSource(compilerId, sourcePath, options = {}, id) {
    const pid = projectId(id);
    const source = String(sourcePath || "").trim();
    if (!source) {
      return { projectId: pid, ok: false, exitCode: 2, reason: "source-missing", process: null, compiler: null };
    }

    const validation = await validateCompiler(compilerId, pid);
    if (!validation.ok) {
      return {
        projectId: pid,
        ok: false,
        exitCode: 126,
        reason: "compiler-invalid",
        process: null,
        compiler: validation.compiler || null,
        validation
      };
    }

    const compiler = validation.compiler;
    const config = compiler.compilerConfig || {};
    const output = String(options.output || "").trim() ||
      source.replace(/\.[^./\\]+$/, config.outputExtension || ".out");
    const args = [
      ...(Array.isArray(config.defaultArgs) ? config.defaultArgs.map(String) : []),
      source
    ];
    if (output) args.push("-o", output);
    if (Array.isArray(options.args)) args.push(...options.args.map(String).slice(0, 30));

    const user = String(options.user || "ai").trim() || "ai";
    const cwd = String(options.cwd || compiler.runtimeConfig?.workingDirectory || "/workspace").trim() || "/workspace";

    if (!window.ANZUBA_PROCESSES?.spawn) {
      return { projectId: pid, ok: false, exitCode: 125, reason: "process-runtime-unavailable", process: null, compiler: clone(compiler) };
    }

    const process = await window.ANZUBA_PROCESSES.spawn({
      name: `compile:${compiler.name}`,
      command: compiler.executables?.[0]?.name || compiler.name,
      args,
      user,
      cwd
    }, pid);

    return {
      projectId: pid,
      ok: true,
      exitCode: null,
      state: "queued",
      process,
      compiler: clone(compiler),
      source,
      output,
      args
    };
  }

  async function getCompileJobs(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data || !Array.isArray(data.compileJobs)) return [];
    return clone(data.compileJobs);
  }

  async function saveCompileJobs(jobs, id) {
    const pid = projectId(id);
    if (!pid) return false;
    await window.ANZUBA_PROJECTS.setData({ compileJobs: clone(jobs) }, pid);
    return true;
  }

  async function getCompileJob(jobId, id) {
    const jobs = await getCompileJobs(id);
    return jobs.find(job => job.id === String(jobId || "").trim()) || null;
  }

  async function listCompileJobs(options = {}, id) {
    const jobs = await getCompileJobs(id);
    const status = options?.status ? String(options.status).trim().toLowerCase() : null;
    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 200);
    return jobs
      .filter(job => !status || job.status === status)
      .slice(-limit)
      .reverse();
  }

  async function createCompileJob(compilerId, sourcePath, options = {}, id) {
    const pid = projectId(id);
    const compilation = await compileSource(compilerId, sourcePath, options, pid);
    const jobs = await getCompileJobs(pid);

    const job = {
      id: `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectId: pid,
      compilerId: String(compilerId || ""),
      sourcePath: String(sourcePath || ""),
      outputPath: compilation.output || null,
      args: Array.isArray(compilation.args) ? compilation.args : [],
      cwd: options?.cwd ? String(options.cwd) : compilation.process?.cwd || "/workspace",
      user: options?.user ? String(options.user) : compilation.process?.user || "ai",
      processId: compilation.process?.pid || null,
      status: compilation.ok ? "queued" : "failed",
      exitCode: compilation.ok ? null : (compilation.exitCode ?? 1),
      error: compilation.ok ? null : (compilation.reason || "compile-failed"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    jobs.push(job);
    await saveCompileJobs(jobs.slice(-200), pid);
    return clone(job);
  }

  async function updateCompileJob(jobId, patch = {}, id) {
    const pid = projectId(id);
    const jobs = await getCompileJobs(pid);
    const index = jobs.findIndex(job => job.id === String(jobId || "").trim());
    if (index < 0) return null;

    const allowedStatuses = ["queued", "running", "completed", "failed", "cancelled"];
    const current = jobs[index];
    const updated = {
      ...current,
      status: allowedStatuses.includes(patch.status) ? patch.status : current.status,
      exitCode: Number.isInteger(patch.exitCode) ? patch.exitCode : current.exitCode,
      outputPath: patch.outputPath ? String(patch.outputPath).slice(0, 512) : current.outputPath,
      error: patch.error ? String(patch.error).slice(0, 500) : (patch.error === null ? null : current.error),
      updatedAt: new Date().toISOString()
    };

    jobs[index] = updated;
    await saveCompileJobs(jobs, pid);
    return clone(updated);
  }

  async function getBuildArtifacts(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data || !Array.isArray(data.buildArtifacts)) return [];
    return clone(data.buildArtifacts);
  }

  async function registerBuildArtifact(jobId, artifact = {}, id) {
    const pid = projectId(id);
    const job = await getCompileJob(jobId, pid);
    if (!job) return null;

    const path = String(artifact.path || job.outputPath || "").trim();
    if (!path) throw new Error("Caminho do artefato inválido.");

    const type = String(artifact.type || "build").trim().slice(0, 40) || "build";
    const sizeBytes = Number.isFinite(Number(artifact.sizeBytes))
      ? Math.max(0, Math.floor(Number(artifact.sizeBytes)))
      : 0;

    const artifacts = await getBuildArtifacts(pid);
    const existing = artifacts.find(item => item.jobId === job.id && item.path === path);
    const now = new Date().toISOString();
    const value = {
      id: existing?.id || `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectId: pid,
      jobId: job.id,
      path: path.slice(0, 512),
      type,
      sizeBytes,
      checksum: artifact.checksum ? String(artifact.checksum).slice(0, 128) : null,
      status: ["available", "missing", "invalid"].includes(artifact.status) ? artifact.status : "available",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const index = artifacts.findIndex(item => item.id === value.id);
    if (index >= 0) artifacts[index] = value;
    else artifacts.push(value);

    await window.ANZUBA_PROJECTS.setData({ buildArtifacts: artifacts.slice(-200) }, pid);
    return clone(value);
  }

  async function getBuildArtifact(artifactId, id) {
    const artifacts = await getBuildArtifacts(id);
    return artifacts.find(item => item.id === String(artifactId || "").trim()) || null;
  }

  async function listBuildArtifacts(options = {}, id) {
    const artifacts = await getBuildArtifacts(id);
    const jobId = options?.jobId ? String(options.jobId).trim() : null;
    const type = options?.type ? String(options.type).trim() : null;
    return artifacts
      .filter(item => !jobId || item.jobId === jobId)
      .filter(item => !type || item.type === type)
      .slice()
      .reverse();
  }

  async function removeBuildArtifact(artifactId, id) {
    const pid = projectId(id);
    const artifacts = await getBuildArtifacts(pid);
    const target = String(artifactId || "").trim();
    const next = artifacts.filter(item => item.id !== target);
    if (next.length === artifacts.length) return false;
    await window.ANZUBA_PROJECTS.setData({ buildArtifacts: next }, pid);
    return true;
  }

  async function validateBuildArtifact(artifactId, id) {
    const pid = projectId(id);
    const artifact = await getBuildArtifact(artifactId, pid);
    if (!artifact) {
      return { projectId: pid, ok: false, artifactId: String(artifactId || ""), issues: ["artifact-not-found"], artifact: null };
    }
    const issues = [];
    if (!artifact.path || !String(artifact.path).startsWith("/")) issues.push("invalid-path");
    if (!Number.isInteger(artifact.sizeBytes) || artifact.sizeBytes < 0) issues.push("invalid-size");
    if (!["available", "missing", "invalid"].includes(artifact.status)) issues.push("invalid-status");
    const job = await getCompileJob(artifact.jobId, pid);
    if (!job) issues.push("job-not-found");
    else if (job.projectId !== pid) issues.push("job-project-mismatch");
    return {
      projectId: pid,
      ok: issues.length === 0 && artifact.status === "available",
      artifactId: artifact.id,
      artifact: clone(artifact),
      job: job ? clone(job) : null,
      issues
    };
  }

  async function getBuildProfiles(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data || !Array.isArray(data.buildProfiles)) return [];
    return clone(data.buildProfiles);
  }

  async function getBuildProfile(name, id) {
    const profiles = await getBuildProfiles(id);
    const key = String(name || "").trim().toLowerCase();
    return profiles.find(profile => profile.name.toLowerCase() === key) || null;
  }

  async function setBuildProfile(name, config = {}, id) {
    const pid = projectId(id);
    const profileName = String(name || "").trim().slice(0, 64);
    if (!profileName) throw new Error("Nome do perfil de build inválido.");

    const profiles = await getBuildProfiles(pid);
    const normalized = {
      name: profileName,
      compilerId: config.compilerId ? String(config.compilerId).trim() : null,
      args: Array.isArray(config.args) ? config.args.slice(0, 50).map(value => String(value).slice(0, 200)) : [],
      outputPath: config.outputPath ? String(config.outputPath).slice(0, 512) : null,
      workingDirectory: config.workingDirectory ? String(config.workingDirectory).slice(0, 512) : "/workspace",
      user: config.user ? String(config.user).slice(0, 64) : "ai",
      environment: config.environment && typeof config.environment === "object" && !Array.isArray(config.environment)
        ? Object.fromEntries(Object.entries(config.environment).slice(0, 50).map(([key, value]) => [String(key).slice(0, 64), String(value).slice(0, 512)]))
        : {},
      optimization: config.optimization ? String(config.optimization).slice(0, 32) : "default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const index = profiles.findIndex(profile => profile.name.toLowerCase() === profileName.toLowerCase());
    if (index >= 0) {
      normalized.createdAt = profiles[index].createdAt || normalized.createdAt;
      profiles[index] = normalized;
    } else {
      profiles.push(normalized);
    }

    await window.ANZUBA_PROJECTS.setData({ buildProfiles: profiles.slice(-50) }, pid);
    return clone(normalized);
  }

  async function removeBuildProfile(name, id) {
    const pid = projectId(id);
    const key = String(name || "").trim().toLowerCase();
    const profiles = await getBuildProfiles(pid);
    const next = profiles.filter(profile => profile.name.toLowerCase() !== key);
    if (next.length === profiles.length) return false;
    await window.ANZUBA_PROJECTS.setData({ buildProfiles: next }, pid);
    return true;
  }

  async function validateBuildProfile(name, id) {
    const pid = projectId(id);
    const profile = await getBuildProfile(name, pid);
    if (!profile) return { projectId: pid, ok: false, profile: null, issues: ["profile-not-found"] };

    const issues = [];
    if (profile.compilerId) {
      const compiler = await get(profile.compilerId, pid);
      if (!compiler) issues.push("compiler-not-found");
      else if (compiler.status !== "installed") issues.push("compiler-not-installed");
      else {
        const compatibility = await validateCompatibility(profile.compilerId, pid);
        if (!compatibility.ok) issues.push("compiler-incompatible");
      }
    }
    if (!profile.outputPath || !String(profile.outputPath).startsWith("/")) issues.push("invalid-output-path");
    if (!profile.workingDirectory || !String(profile.workingDirectory).startsWith("/")) issues.push("invalid-working-directory");

    return { projectId: pid, ok: issues.length === 0, profile: clone(profile), issues };
  }

  async function buildWithProfile(profileName, sourcePath, options = {}, id) {
    const pid = projectId(id);
    const profile = await getBuildProfile(profileName, pid);
    if (!profile) {
      return { projectId: pid, ok: false, status: "failed", reason: "profile-not-found" };
    }

    const validation = await validateBuildProfile(profile.name, pid);
    if (!validation.ok) {
      return { projectId: pid, ok: false, status: "failed", reason: "invalid-profile", validation };
    }

    if (profile.compilerId) {
      const mergedOptions = {
        ...options,
        args: [...profile.args, ...(Array.isArray(options.args) ? options.args : [])],
        output: options.output || profile.outputPath || undefined,
        cwd: options.cwd || profile.workingDirectory,
        user: options.user || profile.user,
        environment: { ...profile.environment, ...(options.environment || {}) }
      };
      const job = await createCompileJob(profile.compilerId, sourcePath, mergedOptions, pid);
      return {
        projectId: pid,
        ok: job.status === "queued",
        status: job.status,
        profile: clone(profile),
        job
      };
    }

    return { projectId: pid, ok: false, status: "failed", reason: "compiler-not-configured" };
  }

  async function validateBuildSource(sourcePath, compilerId, id) {
    const pid = projectId(id);
    const path = String(sourcePath || "").trim();
    const issues = [];

    if (!path || !path.startsWith("/")) issues.push("invalid-source-path");

    let entry = null;
    if (path && window.ANZUBA_FS?.get) {
      entry = await window.ANZUBA_FS.get(path, pid).catch(() => null);
      if (!entry) issues.push("source-not-found");
      else if (entry.type && entry.type !== "file") issues.push("source-not-file");
    }

    const language = compilerId ? await get(compilerId, pid) : null;
    if (!compilerId) issues.push("compiler-not-specified");
    else if (!language) issues.push("compiler-not-found");

    const compilerValidation = compilerId ? await validateCompiler(compilerId, pid) : null;
    if (compilerValidation && !compilerValidation.ok) issues.push("compiler-invalid");

    if (compilerValidation?.compiler?.compilerConfig?.sourceExtensions?.length && path) {
      const lower = path.toLowerCase();
      const allowed = compilerValidation.compiler.compilerConfig.sourceExtensions
        .map(ext => String(ext).toLowerCase());
      if (!allowed.some(ext => lower.endsWith(ext))) issues.push("unsupported-source-extension");
    }

    return {
      projectId: pid,
      ok: issues.length === 0,
      sourcePath: path,
      compilerId: compilerId || null,
      source: entry ? { exists: true, type: entry.type || "file", size: Number(entry.size || 0) } : { exists: false },
      compiler: compilerValidation,
      issues
    };
  }

  async function prepareBuild(sourcePath, compilerId, options = {}, id) {
    const pid = projectId(id);
    const validation = await validateBuildSource(sourcePath, compilerId, pid);
    if (!validation.ok) {
      return { projectId: pid, ok: false, status: "failed", reason: "invalid-source", validation };
    }

    const compiler = validation.compiler?.compiler;
    const output = options.output || null;
    const args = [
      ...(Array.isArray(compiler?.compilerConfig?.defaultArgs) ? compiler.compilerConfig.defaultArgs : []),
      ...(Array.isArray(options.args) ? options.args : []),
      sourcePath
    ];
    if (output) args.push("-o", String(output));

    return {
      projectId: pid,
      ok: true,
      status: "ready",
      sourcePath: String(sourcePath),
      compilerId: String(compilerId),
      compiler: clone(compiler || null),
      output,
      cwd: options.cwd ? String(options.cwd) : "/workspace",
      user: options.user ? String(options.user) : "ai",
      environment: options.environment && typeof options.environment === "object" ? clone(options.environment) : {},
      args
    };
  }

  async function runBuildPipeline(sourcePath, compilerId, options = {}, id) {
    const pid = projectId(id);
    const prepared = await prepareBuild(sourcePath, compilerId, options, pid);
    if (!prepared.ok) return { ...prepared, status: "failed" };

    const job = await createCompileJob(compilerId, sourcePath, {
      ...options,
      args: Array.isArray(options.args) ? options.args : [],
      output: prepared.output,
      cwd: prepared.cwd,
      user: prepared.user,
      environment: prepared.environment
    }, pid);

    const result = {
      projectId: pid,
      ok: job.status === "queued",
      status: job.status,
      prepared,
      job
    };

    if (!result.ok) return result;

    if (prepared.output) {
      const artifact = await registerBuildArtifact(job.id, {
        path: prepared.output,
        type: "build",
        status: "missing"
      }, pid);
      result.artifact = artifact;
    }

    return result;
  }

  async function resolveBuildTarget(name, sourcePath = null, id) {
    const pid = projectId(id);
    const target = await getBuildTarget(name, pid);
    if (!target) {
      return { projectId: pid, ok: false, reason: "target-not-found", target: null, compiler: null, profile: null };
    }

    const validation = await validateBuildTarget(name, pid);
    if (!validation.ok) {
      return { projectId: pid, ok: false, reason: "target-invalid", target: clone(target), validation, compiler: null, profile: null };
    }

    let compiler = null;
    let profile = null;

    if (target.compilerId) compiler = await get(target.compilerId, pid);
    if (target.profile) profile = await getBuildProfile(target.profile, pid);

    if (!compiler && profile?.compilerId) compiler = await get(profile.compilerId, pid);
    if (!compiler && target.platform) {
      const candidates = await listCompilers(null, pid);
      compiler = candidates.find(item => item.status === "installed") || null;
    }

    const resolvedSource = sourcePath ? String(sourcePath).trim() : (target.sourcePath || null);
    const resolvedOutput = target.outputPath || profile?.outputPath || null;
    const args = [
      ...(Array.isArray(profile?.args) ? profile.args.map(String) : []),
      ...(Array.isArray(target.args) ? target.args.map(String) : [])
    ];

    return {
      projectId: pid,
      ok: true,
      target: clone(target),
      compiler: compiler ? clone(compiler) : null,
      profile: profile ? clone(profile) : null,
      sourcePath: resolvedSource,
      outputPath: resolvedOutput,
      args,
      platform: target.platform,
      architecture: target.architecture,
      format: target.format
    };
  }

  async function getBuildTargets(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data || !Array.isArray(data.buildTargets)) return [];
    return clone(data.buildTargets);
  }

  async function getBuildTarget(name, id) {
    const targets = await getBuildTargets(id);
    const key = String(name || "").trim().toLowerCase();
    return targets.find(target => target.name.toLowerCase() === key) || null;
  }

  async function setBuildTarget(name, config = {}, id) {
    const pid = projectId(id);
    const targetName = String(name || "").trim().slice(0, 64);
    if (!targetName) throw new Error("Nome do alvo de build inválido.");
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("Configuração do alvo de build inválida.");
    }

    const targets = await getBuildTargets(pid);
    const existing = targets.find(target => target.name.toLowerCase() === targetName.toLowerCase());
    const now = new Date().toISOString();
    const normalized = {
      id: existing?.id || `target_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: targetName,
      platform: String(config.platform || existing?.platform || "generic").trim().slice(0, 64),
      architecture: String(config.architecture || existing?.architecture || "wasm32").trim().slice(0, 64),
      format: String(config.format || existing?.format || "virtual").trim().slice(0, 32),
      profile: config.profile !== undefined ? (config.profile ? String(config.profile).slice(0, 64) : null) : (existing?.profile || null),
      compilerId: config.compilerId !== undefined ? (config.compilerId ? String(config.compilerId).trim() : null) : (existing?.compilerId || null),
      sourcePath: config.sourcePath !== undefined ? (config.sourcePath ? String(config.sourcePath).slice(0, 512) : null) : (existing?.sourcePath || null),
      outputPath: config.outputPath !== undefined ? (config.outputPath ? String(config.outputPath).slice(0, 512) : null) : (existing?.outputPath || null),
      args: Array.isArray(config.args) ? config.args.slice(0, 50).map(value => String(value).slice(0, 200)) : (existing?.args || []),
      environment: config.environment && typeof config.environment === "object" && !Array.isArray(config.environment)
        ? Object.fromEntries(Object.entries(config.environment).slice(0, 50).map(([key, value]) => [String(key).slice(0, 64), String(value).slice(0, 512)]))
        : (existing?.environment || {}),
      enabled: config.enabled !== undefined ? Boolean(config.enabled) : (existing?.enabled !== false),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const index = targets.findIndex(target => target.id === normalized.id);
    if (index >= 0) targets[index] = normalized;
    else targets.push(normalized);

    await window.ANZUBA_PROJECTS.setData({ buildTargets: targets.slice(-50) }, pid);
    return clone(normalized);
  }

  async function removeBuildTarget(name, id) {
    const pid = projectId(id);
    const key = String(name || "").trim().toLowerCase();
    const targets = await getBuildTargets(pid);
    const next = targets.filter(target => target.name.toLowerCase() !== key);
    if (next.length === targets.length) return false;
    await window.ANZUBA_PROJECTS.setData({ buildTargets: next }, pid);
    return true;
  }

  async function validateBuildTarget(name, id) {
    const pid = projectId(id);
    const target = await getBuildTarget(name, pid);
    if (!target) {
      return { projectId: pid, ok: false, target: null, issues: ["target-not-found"] };
    }

    const issues = [];
    if (!target.platform) issues.push("platform-missing");
    if (!target.architecture) issues.push("architecture-missing");
    if (!target.format) issues.push("format-missing");
    if (target.compilerId) {
      const compiler = await get(target.compilerId, pid);
      if (!compiler) issues.push("compiler-not-found");
      else {
        const validation = await validateCompiler(target.compilerId, pid);
        if (!validation.ok) issues.push("compiler-invalid");
      }
    }
    if (target.profile) {
      const profile = await getBuildProfile(target.profile, pid);
      if (!profile) issues.push("profile-not-found");
    }
    if (target.sourcePath && !String(target.sourcePath).startsWith("/")) issues.push("invalid-source-path");
    if (target.outputPath && !String(target.outputPath).startsWith("/")) issues.push("invalid-output-path");

    return {
      projectId: pid,
      ok: issues.length === 0,
      target: clone(target),
      issues
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

  async function validateExecutable(name, id) {
    const pid = projectId(id);
    const value = String(name || "").trim();
    if (!value) return { projectId: pid, name: value, ok: false, reason: "invalid-name" };

    const resolved = await resolveExecutable(value, pid);
    if (!resolved) return { projectId: pid, name: value, ok: false, reason: "not-installed" };

    const tool = await get(resolved.toolId, pid);
    if (!tool || tool.status !== "installed") {
      return { projectId: pid, name: value, ok: false, reason: "tool-not-installed" };
    }

    const fs = await window.ANZUBA_FS?.get?.(pid);
    const entry = fs?.[resolved.path];
    if (!entry || entry.type !== "file") {
      return { projectId: pid, name: value, ok: false, reason: "missing-filesystem-entry", ...resolved };
    }

    const executableMode = Number.parseInt(String(entry.mode || "755"), 8);
    if (!Number.isFinite(executableMode) || (executableMode & 0o111) === 0) {
      return { projectId: pid, name: value, ok: false, reason: "not-executable", ...resolved };
    }

    const env = await window.ANZUBA_ENV?.get?.(pid);
    const pathEntries = Array.isArray(env?.PATH) ? env.PATH : [];
    const directory = resolved.path.slice(0, resolved.path.lastIndexOf("/")) || "/";
    const onPath = pathEntries.includes(directory);

    return {
      projectId: pid,
      name: value,
      ok: onPath,
      reason: onPath ? null : "not-in-path",
      path: resolved.path,
      toolId: resolved.toolId,
      toolName: resolved.toolName,
      version: resolved.version,
      args: resolved.args || [],
      onPath
    };
  }

  async function executeExecutable(name, options = {}, id) {
    const pid = projectId(id);
    const value = String(name || "").trim();
    if (!value) throw new Error("Executável inválido.");

    const validation = await validateExecutable(value, pid);
    const resolved = validation.ok ? await resolveExecutable(value, pid) : null;
    if (!resolved) {
      return {
        projectId: pid,
        name: value,
        ok: false,
        exitCode: 127,
        error: "Executável não encontrado."
      };
    }

    const tool = await get(resolved.toolId, pid);
    if (!tool || tool.status !== "installed") {
      return {
        projectId: pid,
        name: value,
        ok: false,
        exitCode: 126,
        error: "Ferramenta não está instalada."
      };
    }

    const compatibility = await validateCompatibility(tool.id, pid);
    if (compatibility && !compatibility.ok) {
      return {
        projectId: pid,
        name: value,
        ok: false,
        exitCode: 126,
        error: "Ferramenta incompatível.",
        issues: compatibility.issues
      };
    }

    const args = Array.isArray(options.args) ? options.args.map(String).slice(0, 50) : [];
    const command = value;
    const cwd = String(options.cwd || "/workspace");
    const user = String(options.user || "ai");

    if (!window.ANZUBA_PROCESSES?.spawn) {
      return {
        projectId: pid,
        name: value,
        ok: false,
        exitCode: 127,
        error: "Runtime de processos não disponível."
      };
    }

    const process = await window.ANZUBA_PROCESSES.spawn({
      name: tool.name + ":" + value,
      command,
      args: [...(resolved.args || []), ...args],
      user,
      cwd
    });

    return {
      projectId: pid,
      name: value,
      ok: true,
      exitCode: null,
      process,
      tool: {
        id: tool.id,
        name: tool.name,
        version: tool.version || null
      },
      executable: {
        path: resolved.path,
        args: resolved.args || []
      }
    };
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
      await syncExecutables(pid);
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
    await removeExecutableStubs(pid, toolId);
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
    resolveExecutable,
    validateExecutable,
    registerLanguageRuntime,
    listLanguageRuntimes,
    getLanguageRuntime,
    setLanguageRuntimeConfig,
    registerLanguage,
    findLanguageByFile,
    detectLanguage,
    registerCompiler,
    listCompilers,
    findCompilerForLanguage,
    validateCompiler,
    compileSource,
    getCompileJobs,
    getCompileJob,
    listCompileJobs,
    createCompileJob,
    updateCompileJob,
    getBuildArtifacts,
    registerBuildArtifact,
    getBuildArtifact,
    listBuildArtifacts,
    removeBuildArtifact,
    validateBuildArtifact,
    getBuildTargets,
    resolveBuildTarget,
    getBuildTarget,
    setBuildTarget,
    removeBuildTarget,
    validateBuildTarget,
    getBuildProfiles,
    getBuildProfile,
    setBuildProfile,
    removeBuildProfile,
    validateBuildProfile,
    buildWithProfile,
    validateBuildSource,
    prepareBuild,
    runBuildPipeline,
    syncExecutables,
    executeExecutable
  };

  window.ANZUBA_AI_BRIDGE?.on("tools.executables.set", ({ toolId, executables, id } = {}) => setExecutables(toolId, executables || [], id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executables.get", ({ toolId, id } = {}) => getExecutables(toolId, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executable.resolve", ({ name, id } = {}) => resolveExecutable(name, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executables.sync", ({ id } = {}) => syncExecutables(id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executable.validate", ({ name, id } = {}) => validateExecutable(name, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.runtime.register", ({ runtime, id } = {}) => registerLanguageRuntime(runtime, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.runtime.list", ({ id } = {}) => listLanguageRuntimes(id));
  window.ANZUBA_AI_BRIDGE?.on("tools.runtime.get", ({ name, id } = {}) => getLanguageRuntime(name, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.runtime.config.set", ({ name, config, id } = {}) => setLanguageRuntimeConfig(name, config, id));
  window.ANZUBA_AI_BRIDGE?.on("language.register", ({ language, id } = {}) => registerLanguage(language, id));
  window.ANZUBA_AI_BRIDGE?.on("language.detectFile", ({ filePath, id } = {}) => findLanguageByFile(filePath, id));
  window.ANZUBA_AI_BRIDGE?.on("language.detect", ({ filePath, content, id } = {}) => detectLanguage(filePath, content, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.register", ({ compiler, id } = {}) => registerCompiler(compiler, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.list", ({ languageId, id } = {}) => listCompilers(languageId, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.find", ({ languageId, id } = {}) => findCompilerForLanguage(languageId, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.validate", ({ compilerId, id } = {}) => validateCompiler(compilerId, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.compile", ({ compilerId, sourcePath, options, id } = {}) => compileSource(compilerId, sourcePath, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.job.create", ({ compilerId, sourcePath, options, id } = {}) => createCompileJob(compilerId, sourcePath, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.job.get", ({ jobId, id } = {}) => getCompileJob(jobId, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.jobs.list", ({ options, id } = {}) => listCompileJobs(options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.job.update", ({ jobId, patch, id } = {}) => updateCompileJob(jobId, patch || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.artifact.register", ({ jobId, artifact, id } = {}) => registerBuildArtifact(jobId, artifact || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.artifact.get", ({ artifactId, id } = {}) => getBuildArtifact(artifactId, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.artifacts.list", ({ options, id } = {}) => listBuildArtifacts(options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.artifact.remove", ({ artifactId, id } = {}) => removeBuildArtifact(artifactId, id));
  window.ANZUBA_AI_BRIDGE?.on("compiler.artifact.validate", ({ artifactId, id } = {}) => validateBuildArtifact(artifactId, id));
  window.ANZUBA_AI_BRIDGE?.on("build.target.resolve", ({ name, sourcePath, id } = {}) => resolveBuildTarget(name, sourcePath, id));
  window.ANZUBA_AI_BRIDGE?.on("build.target.get", ({ name, id } = {}) => getBuildTarget(name, id));
  window.ANZUBA_AI_BRIDGE?.on("build.targets.list", ({ id } = {}) => getBuildTargets(id));
  window.ANZUBA_AI_BRIDGE?.on("build.target.set", ({ name, config, id } = {}) => setBuildTarget(name, config || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("build.target.remove", ({ name, id } = {}) => removeBuildTarget(name, id));
  window.ANZUBA_AI_BRIDGE?.on("build.target.validate", ({ name, id } = {}) => validateBuildTarget(name, id));
  window.ANZUBA_AI_BRIDGE?.on("build.profile.get", ({ name, id } = {}) => getBuildProfile(name, id));
  window.ANZUBA_AI_BRIDGE?.on("build.profiles.list", ({ id } = {}) => getBuildProfiles(id));
  window.ANZUBA_AI_BRIDGE?.on("build.profile.set", ({ name, config, id } = {}) => setBuildProfile(name, config || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("build.profile.remove", ({ name, id } = {}) => removeBuildProfile(name, id));
  window.ANZUBA_AI_BRIDGE?.on("build.profile.validate", ({ name, id } = {}) => validateBuildProfile(name, id));
  window.ANZUBA_AI_BRIDGE?.on("build.profile.run", ({ name, sourcePath, options, id } = {}) => buildWithProfile(name, sourcePath, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("build.source.validate", ({ sourcePath, compilerId, id } = {}) => validateBuildSource(sourcePath, compilerId, id));
  window.ANZUBA_AI_BRIDGE?.on("build.prepare", ({ sourcePath, compilerId, options, id } = {}) => prepareBuild(sourcePath, compilerId, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("build.run", ({ sourcePath, compilerId, options, id } = {}) => runBuildPipeline(sourcePath, compilerId, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("tools.executable.run", ({ name, args, cwd, user, id } = {}) => executeExecutable(name, { args, cwd, user }, id));
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