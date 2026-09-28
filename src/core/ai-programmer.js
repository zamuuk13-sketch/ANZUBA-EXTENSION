(() => {
  const PLAN_KEY = "aiProgramPlans";

  const projectId = id => id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  const clone = value => JSON.parse(JSON.stringify(value));

  async function getPlans(id) {
    const pid = projectId(id);
    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    return Array.isArray(data?.[PLAN_KEY]) ? clone(data[PLAN_KEY]) : [];
  }

  function detectTask(prompt) {
    const text = String(prompt || "").trim();
    const lower = text.toLowerCase();
    const game = /\b(jogo|game|gameplay|player|inimigo|enemy|fase|level|mapa)\b/.test(lower);
    const web = /\b(site|website|webapp|aplicativo web|página|pagina)\b/.test(lower);
    const mobile = /\b(apk|android|celular|mobile)\b/.test(lower);
    const desktop = /\b(exe|windows|desktop|computador)\b/.test(lower);
    const language = /\b(c\+\+|cpp)\b/.test(lower) ? "cpp"
      : /\b(rust)\b/.test(lower) ? "rust"
      : /\b(java)\b/.test(lower) ? "java"
      : /\b(python)\b/.test(lower) ? "python"
      : /\b(javascript|js)\b/.test(lower) ? "javascript"
      : /\b(typescript|ts)\b/.test(lower) ? "typescript"
      : game ? "javascript" : "unknown";
    const target = mobile ? "android" : desktop ? "windows" : web ? "web" : game ? "web" : "generic";
    return { kind: game ? "game" : web ? "web-app" : "software", language, target };
  }


  function analyzeRequirements(prompt, task) {
    const request = String(prompt || "").trim().slice(0, 8000);
    const lower = request.toLowerCase();
    const requirements = [];
    const keywords = [
      ["multiplayer", "multiplayer"],
      ["primeira pessoa", "first-person"],
      ["terceira pessoa", "third-person"],
      ["vr", "vr"],
      ["realista", "realistic"],
      ["terror", "horror"],
      ["zumbi", "zombie"],
      ["zombie", "zombie"],
      ["inventário", "inventory"],
      ["inventario", "inventory"],
      ["save", "save"],
      ["salvar", "save"],
      ["menu", "menu"],
      ["boss", "boss"],
      ["npc", "npc"],
      ["animação", "animation"],
      ["animacao", "animation"],
      ["som", "audio"],
      ["música", "audio"],
      ["musica", "audio"]
    ];
    for (const [term, id] of keywords) {
      if (lower.includes(term)) requirements.push(id);
    }

    const quoted = [];
    request.replace(/["“”']([^"“”']{2,120})["“”']/g, (_, value) => {
      quoted.push(value.trim());
      return _;
    });

    const constraints = [];
    if (task.target !== "generic") constraints.push({ type: "target", value: task.target });
    if (task.language !== "unknown") constraints.push({ type: "language", value: task.language });

    return {
      summary: request.slice(0, 500),
      kind: task.kind,
      detectedFeatures: [...new Set(requirements)],
      explicitTerms: [...new Set(quoted)].slice(0, 20),
      constraints,
      missing: task.language === "unknown" ? ["language"] : [],
      confidence: Math.min(1, 0.45 + (requirements.length * 0.05) + (constraints.length * 0.1)),
      analyzedAt: new Date().toISOString()
    };
  }

  function getPlanStep(plan, stepId) {
    return Array.isArray(plan?.steps) ? plan.steps.find(step => step.id === stepId) || null : null;
  }

  function makeSteps(prompt, task) {
    const steps = [
      { id: "analyze", type: "analysis", title: "Analisar requisitos", status: "pending" },
      { id: "workspace", type: "workspace", title: "Preparar workspace", status: "pending" },
      { id: "implement", type: "implementation", title: "Implementar o projeto", status: "pending" },
      { id: "build", type: "build", title: "Compilar o projeto", status: "pending" },
      { id: "test", type: "test", title: "Executar e testar", status: "pending" },
      { id: "repair", type: "repair", title: "Corrigir problemas encontrados", status: "pending" },
      { id: "finalize", type: "finalize", title: "Finalizar e preparar a entrega", status: "pending" }
    ];
    if (task.kind === "game") {
      steps.splice(2, 0, { id: "game-design", type: "design", title: "Estruturar o jogo", status: "pending" });
    }
    return steps.map((step, index) => ({ ...step, order: index + 1 }));
  }

  async function createProgramPlan(prompt, options = {}, id) {
    const pid = projectId(id);
    if (!pid) return { projectId: null, ok: false, reason: "project-not-found" };

    const request = String(prompt || "").trim().slice(0, 8000);
    if (!request) return { projectId: pid, ok: false, reason: "prompt-empty" };

    const task = detectTask(request);
    const analysis = analyzeRequirements(request, task);
    const steps = makeSteps(request, task);
    const now = new Date().toISOString();
    const plan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectId: pid,
      request,
      task,
      analysis,
      priority: ["low", "normal", "high"].includes(options.priority) ? options.priority : "normal",
      status: "planned",
      currentStep: null,
      steps,
      createdAt: now,
      updatedAt: now
    };

    const plans = await getPlans(pid);
    plans.push(plan);
    await window.ANZUBA_PROJECTS?.setData?.({ [PLAN_KEY]: plans.slice(-50) }, pid);
    return clone(plan);
  }

  async function prepareProgramWorkspace(planId, id) {
    const pid = projectId(id);
    const plans = await getPlans(pid);
    const index = plans.findIndex(plan => plan.id === String(planId || "").trim());
    if (index < 0) return { projectId: pid, ok: false, reason: "plan-not-found" };

    const plan = plans[index];
    const fs = window.ANZUBA_FS;
    if (!fs?.mkdir || !fs?.list) return { projectId: pid, ok: false, reason: "filesystem-unavailable" };

    const root = "/workspace/" + plan.id.replace(/[^a-zA-Z0-9_-]/g, "_") + "/";
    const directories = [root, root + "src/", root + "assets/", root + "build/", root + "tests/"];
    const created = [];
    const existing = [];

    for (const path of directories) {
      const parent = path.slice(0, -1).split("/").slice(0, -1).join("/") || "/";
      const name = path.slice(0, -1).split("/").pop();
      const entries = await fs.list(parent, pid, { username: "ai" });
      if (entries.some(item => item.name === name)) {
        existing.push(path);
        continue;
      }
      if (!(await fs.mkdir(path, pid, { username: "ai", mode: "775" }))) {
        return { projectId: pid, ok: false, reason: "workspace-create-failed", path, created, existing };
      }
      created.push(path);
    }

    const now = new Date().toISOString();
    plans[index] = {
      ...plan,
      workspace: { root, directories, preparedAt: now },
      status: "running",
      currentStep: "workspace",
      updatedAt: now,
      steps: Array.isArray(plan.steps) ? plan.steps.map(step =>
        step.id === "analyze" || step.id === "workspace"
          ? { ...step, status: "completed" }
          : step
      ) : []
    };
    await window.ANZUBA_PROJECTS?.setData?.({ [PLAN_KEY]: plans }, pid);
    return { projectId: pid, ok: true, plan: clone(plans[index]), workspace: { root, directories, created, existing } };
  }

  async function scaffoldProgram(planId, options = {}, id) {
    const pid = projectId(id);
    const plan = await getProgramPlan(planId, pid);
    if (!plan) return { projectId: pid, ok: false, reason: "plan-not-found" };

    const workspace = plan.workspace?.root;
    if (!workspace) return { projectId: pid, ok: false, reason: "workspace-not-prepared" };

    const fs = window.ANZUBA_FS;
    if (!fs?.writeFile || !fs?.exists) return { projectId: pid, ok: false, reason: "filesystem-unavailable" };

    const language = plan.task?.language || "unknown";
    const defaults = language === "javascript"
      ? { path: workspace + "src/main.js", content: "// ANZUBA project entry point\\n" }
      : language === "typescript"
        ? { path: workspace + "src/main.ts", content: "// ANZUBA project entry point\\n" }
        : language === "python"
          ? { path: workspace + "src/main.py", content: "# ANZUBA project entry point\\n" }
          : language === "cpp"
            ? { path: workspace + "src/main.cpp", content: "// ANZUBA project entry point\\n#include <iostream>\\nint main() { return 0; }\\n" }
            : { path: workspace + "src/README.md", content: "# ANZUBA Project\\n\\nEntry point will be generated here.\\n" };

    const requestedPath = String(options.entryPath || defaults.path).trim().replace(/\\\\/g, "/");
    const root = workspace.endsWith("/") ? workspace : workspace + "/";
    if (!requestedPath.startsWith(root) || requestedPath.includes("..")) {
      return { projectId: pid, ok: false, reason: "invalid-entry-path" };
    }

    const files = Array.isArray(options.files) ? options.files.slice(0, 50) : [];
    const generated = [];
    const skipped = [];
    const candidates = files.length ? files : [defaults];

    for (const item of candidates) {
      const path = String(item?.path || "").trim().replace(/\\\\/g, "/");
      const content = String(item?.content ?? "");
      if (!path.startsWith(root) || path.includes("..") || !content.length && path !== requestedPath) continue;
      if (await fs.exists(path, pid) && !options.overwrite) {
        skipped.push(path);
        continue;
      }
      if (!(await fs.writeFile(path, content.slice(0, 200000), pid, { username: "ai" }))) {
        return { projectId: pid, ok: false, reason: "file-write-failed", path, generated, skipped };
      }
      generated.push(path);
    }

    return {
      projectId: pid,
      ok: true,
      planId: plan.id,
      language,
      workspace: root,
      generated,
      skipped,
      entryPath: requestedPath
    };
  }

  async function generateProgramFiles(planId, options = {}, id) {
    const pid = projectId(id);
    const plan = await getProgramPlan(planId, pid);
    if (!plan) return { projectId: pid, ok: false, reason: "plan-not-found" };

    const workspace = plan.workspace?.root;
    if (!workspace) return { projectId: pid, ok: false, reason: "workspace-not-prepared" };

    const fs = window.ANZUBA_FS;
    if (!fs?.writeFile || !fs?.exists) {
      return { projectId: pid, ok: false, reason: "filesystem-unavailable" };
    }

    const language = plan.task?.language || "unknown";
    const kind = plan.task?.kind || "software";
    const files = Array.isArray(options.files) ? options.files.slice(0, 50) : [];
    const generated = [];
    const skipped = [];
    const templates = language === "javascript"
      ? [
          { path: workspace + "src/main.js", content: `// Generated by ANZUBA AI Programmer\\nconsole.log("ANZUBA project ready");\\n` },
          { path: workspace + "tests/main.test.js", content: `// Generated test scaffold\\nconsole.assert(true, "basic project check");\\n` }
        ]
      : language === "typescript"
        ? [
            { path: workspace + "src/main.ts", content: `// Generated by ANZUBA AI Programmer\\nexport function main(): void {\\n  console.log("ANZUBA project ready");\\n}\\nmain();\\n` },
            { path: workspace + "tests/main.test.ts", content: `// Generated test scaffold\\nconst ok: boolean = true;\\nconsole.assert(ok);\\n` }
          ]
        : language === "python"
          ? [
              { path: workspace + "src/main.py", content: `# Generated by ANZUBA AI Programmer\\ndef main():\\n    print("ANZUBA project ready")\\n\\nif __name__ == "__main__":\\n    main()\\n` },
              { path: workspace + "tests/test_main.py", content: `# Generated test scaffold\\ndef test_basic():\\n    assert True\\n` }
            ]
          : language === "cpp"
            ? [
                { path: workspace + "src/main.cpp", content: `// Generated by ANZUBA AI Programmer\\n#include <iostream>\\nint main() {\\n  std::cout << "ANZUBA project ready" << std::endl;\\n  return 0;\\n}\\n` },
                { path: workspace + "tests/main.test.cpp", content: `// Generated test scaffold\\nint main() { return 0; }\\n` }
              ]
            : [
                { path: workspace + "src/README.md", content: `# ANZUBA Project\\n\\nGenerated implementation scaffold for a ${kind}.\\n` }
              ];

    const candidates = files.length ? files : templates;
    const root = workspace.endsWith("/") ? workspace : workspace + "/";
    for (const item of candidates) {
      const path = String(item?.path || "").trim().replace(/\\\\/g, "/");
      const content = String(item?.content ?? "");
      if (!path.startsWith(root) || path.includes("..") || !content.length) continue;
      if (content.length > 200000) continue;
      if (await fs.exists(path, pid) && !options.overwrite) {
        skipped.push(path);
        continue;
      }
      if (!(await fs.writeFile(path, content, pid, { username: "ai" }))) {
        return { projectId: pid, ok: false, reason: "file-write-failed", path, generated, skipped };
      }
      generated.push(path);
    }

    const updated = await updateProgramPlan(plan.id, {
      status: "running",
      stepId: "implement",
      stepStatus: "completed"
    }, pid);

    return {
      projectId: pid,
      ok: true,
      planId: plan.id,
      language,
      kind,
      generated,
      skipped,
      plan: updated
    };
  }

  async function generateImplementation(planId, options = {}, id) {
    const pid = projectId(id);
    const plan = await getProgramPlan(planId, pid);
    if (!plan) return { projectId: pid, ok: false, reason: "plan-not-found" };

    const workspace = plan.workspace?.root;
    if (!workspace) return { projectId: pid, ok: false, reason: "workspace-not-prepared" };

    const fs = window.ANZUBA_FS;
    if (!fs?.writeFile || !fs?.exists) {
      return { projectId: pid, ok: false, reason: "filesystem-unavailable" };
    }

    const files = Array.isArray(options.files) ? options.files.slice(0, 100) : [];
    if (!files.length) {
      return { projectId: pid, ok: false, reason: "implementation-files-required" };
    }

    const root = workspace.endsWith("/") ? workspace : workspace + "/";
    const generated = [];
    const skipped = [];

    for (const item of files) {
      const path = String(item?.path || "").trim().replace(/\\\\/g, "/");
      const content = String(item?.content ?? "");
      if (!path.startsWith(root) || path.includes("..")) {
        return { projectId: pid, ok: false, reason: "invalid-implementation-path", path, generated, skipped };
      }
      if (!content.length || content.length > 500000) continue;

      if (await fs.exists(path, pid) && !options.overwrite) {
        skipped.push(path);
        continue;
      }

      const written = await fs.writeFile(path, content, pid, { username: "ai" });
      if (!written) {
        return { projectId: pid, ok: false, reason: "implementation-write-failed", path, generated, skipped };
      }
      generated.push(path);
    }

    const updated = await updateProgramPlan(plan.id, {
      status: "running",
      stepId: "implement",
      stepStatus: "completed"
    }, pid);

    return {
      projectId: pid,
      ok: true,
      planId: plan.id,
      generated,
      skipped,
      plan: updated
    };
  }

  async function validateProgramImplementation(planId, options = {}, id) {
    const pid = projectId(id);
    const plan = await getProgramPlan(planId, pid);
    if (!plan) return { projectId: pid, ok: false, reason: "plan-not-found", issues: ["plan-not-found"] };

    const workspace = plan.workspace?.root;
    if (!workspace) return { projectId: pid, ok: false, reason: "workspace-not-prepared", issues: ["workspace-not-prepared"] };

    const fs = window.ANZUBA_FS;
    if (!fs?.exists || !fs?.readFile) {
      return { projectId: pid, ok: false, reason: "filesystem-unavailable", issues: ["filesystem-unavailable"] };
    }

    const root = workspace.endsWith("/") ? workspace : workspace + "/";
    const files = Array.isArray(options.files) ? options.files.slice(0, 100) : [];
    const issues = [];
    const checked = [];

    if (!files.length) {
      issues.push("implementation-files-required");
    }

    for (const item of files) {
      const path = String(item?.path || "").trim().replace(/\\\\/g, "/");
      if (!path.startsWith(root) || path.includes("..")) {
        issues.push("invalid-implementation-path");
        continue;
      }
      if (!(await fs.exists(path, pid))) {
        issues.push("file-missing:" + path);
        continue;
      }
      const content = await fs.readFile(path, pid, { username: "ai" });
      if (typeof content !== "string") {
        issues.push("file-unreadable:" + path);
        continue;
      }
      if (!content.trim()) issues.push("file-empty:" + path);
      checked.push({ path, bytes: new TextEncoder().encode(content).length });
    }

    const uniqueIssues = [...new Set(issues)];
    const ok = uniqueIssues.length === 0 && checked.length > 0;

    const updated = ok
      ? await updateProgramPlan(plan.id, {
          status: "running",
          stepId: "implement",
          stepStatus: "completed"
        }, pid)
      : plan;

    return {
      projectId: pid,
      ok,
      planId: plan.id,
      workspace: root,
      checked,
      issues: uniqueIssues,
      plan: updated
    };
  }

  async function prepareProgramBuild(planId, options = {}, id) {
    const pid = projectId(id);
    const plan = await getProgramPlan(planId, pid);
    if (!plan) return { projectId: pid, ok: false, reason: "plan-not-found" };

    if (!window.ANZUBA_TOOLS?.prepareBuild) {
      return { projectId: pid, ok: false, reason: "build-system-unavailable" };
    }

    const sourcePath = String(
      options.sourcePath ||
      plan.workspace?.entryPath ||
      ""
    ).trim().replace(/\\\\/g, "/");

    if (!sourcePath) {
      return { projectId: pid, ok: false, reason: "source-path-required" };
    }

    let compilerId = String(options.compilerId || "").trim();
    let compiler = null;

    if (!compilerId && window.ANZUBA_TOOLS.findCompilerForLanguage) {
      compiler = await window.ANZUBA_TOOLS.findCompilerForLanguage(plan.task?.language, pid);
      compilerId = String(compiler?.id || "").trim();
    }

    if (!compilerId) {
      return { projectId: pid, ok: false, reason: "compiler-not-found", sourcePath };
    }

    const prepared = await window.ANZUBA_TOOLS.prepareBuild(sourcePath, compilerId, {
      output: options.output || null,
      args: Array.isArray(options.args) ? options.args.slice(0, 50) : [],
      cwd: options.cwd || plan.workspace?.root || "/workspace",
      user: options.user || "ai",
      environment: options.environment || {}
    }, pid);

    if (!prepared?.ok) {
      return {
        projectId: pid,
        ok: false,
        reason: "build-preparation-failed",
        prepared
      };
    }

    const updated = await updateProgramPlan(plan.id, {
      status: "running",
      stepId: "build",
      stepStatus: "running"
    }, pid);

    return {
      projectId: pid,
      ok: true,
      planId: plan.id,
      sourcePath,
      compiler: compiler ? clone(compiler) : null,
      prepared,
      plan: updated
    };
  }

  async function runProgramBuild(planId, options = {}, id) {
    const pid = projectId(id);
    const plan = await getProgramPlan(planId, pid);
    if (!plan) return { projectId: pid, ok: false, reason: "plan-not-found" };
    if (!window.ANZUBA_TOOLS?.runBuildPipeline) return { projectId: pid, ok: false, reason: "build-system-unavailable" };
    const sourcePath = String(options.sourcePath || plan.workspace?.entryPath || "").trim();
    if (!sourcePath) return { projectId: pid, ok: false, reason: "source-path-required" };
    let compilerId = String(options.compilerId || "").trim();
    if (!compilerId && window.ANZUBA_TOOLS.findCompilerForLanguage) {
      const compiler = await window.ANZUBA_TOOLS.findCompilerForLanguage(plan.task?.language, pid);
      compilerId = String(compiler?.id || "").trim();
    }
    if (!compilerId) return { projectId: pid, ok: false, reason: "compiler-not-found" };
    const result = await window.ANZUBA_TOOLS.runBuildPipeline(sourcePath, compilerId, {
      output: options.output || null,
      args: Array.isArray(options.args) ? options.args.slice(0, 50) : [],
      cwd: options.cwd || plan.workspace?.root || "/workspace",
      user: options.user || "ai",
      environment: options.environment || {}
    }, pid);
    const ok = Boolean(result?.ok);
    const updated = await updateProgramPlan(plan.id, {
      status: ok ? "running" : "failed",
      stepId: "build",
      stepStatus: ok ? "completed" : "failed"
    }, pid);
    return { projectId: pid, ok, planId: plan.id, sourcePath, compilerId, result, plan: updated };
  }

  async function getProgrammerDiagnostics(id) {
    const pid = projectId(id);
    const plans = await getPlans(pid);
    const issues = [];
    for (const plan of plans) {
      if (plan.projectId !== pid) issues.push("project-mismatch:" + plan.id);
      if (!Array.isArray(plan.steps) || !plan.steps.length) issues.push("steps-missing:" + plan.id);
      if (plan.workspace?.root && !String(plan.workspace.root).startsWith("/workspace/")) {
        issues.push("workspace-invalid:" + plan.id);
      }
      if (plan.status === "running" && !plan.currentStep && !plan.steps?.some(step => step.status === "running")) {
        issues.push("running-step-missing:" + plan.id);
      }
    }
    return {
      projectId: pid,
      ok: issues.length === 0,
      plans: plans.length,
      running: plans.filter(plan => plan.status === "running").length,
      completed: plans.filter(plan => plan.status === "completed").length,
      failed: plans.filter(plan => plan.status === "failed").length,
      issues: [...new Set(issues)]
    };
  }

  async function getProgramPlan(planId, id) {
    const plans = await getPlans(id);
    return plans.find(plan => plan.id === String(planId || "").trim()) || null;
  }

  async function updateProgramPlan(planId, patch = {}, id) {
    const pid = projectId(id);
    const plans = await getPlans(pid);
    const index = plans.findIndex(plan => plan.id === String(planId || "").trim());
    if (index < 0) return null;

    const current = plans[index];
    const steps = Array.isArray(current.steps) ? current.steps.map(clone) : [];
    if (patch.stepId) {
      const step = steps.find(item => item.id === String(patch.stepId));
      if (!step) return null;
      if (["pending", "running", "completed", "failed", "skipped"].includes(patch.stepStatus)) {
        step.status = patch.stepStatus;
      }
      if (patch.stepStatus === "running") current.currentStep = step.id;
      if (patch.stepStatus === "completed" && current.currentStep === step.id) current.currentStep = null;
    }

    const status = ["planned", "running", "completed", "failed", "cancelled"].includes(patch.status)
      ? patch.status : current.status;

    plans[index] = { ...current, status, steps, updatedAt: new Date().toISOString() };
    await window.ANZUBA_PROJECTS?.setData?.({ [PLAN_KEY]: plans }, pid);
    return clone(plans[index]);
  }

  async function listProgramPlans(id) {
    return getPlans(id);
  }

  window.ANZUBA_AI_PROGRAMMER = {
    createProgramPlan,
    getProgramPlan,
    scaffoldProgram,
    generateProgramFiles,
    generateImplementation,
    validateProgramImplementation,
    prepareProgramBuild,
    runProgramBuild,
    prepareProgramWorkspace,
    updateProgramPlan,
    listProgramPlans,
    analyzeRequirements,
    getPlanStep,
    getProgrammerDiagnostics
  };

  window.ANZUBA_AI_BRIDGE?.on("ai.program.requirements.analyze", ({ prompt, id } = {}) => {
    const request = String(prompt || "").trim();
    const task = detectTask(request);
    return analyzeRequirements(request, task);
  });

  window.ANZUBA_AI_BRIDGE?.on("ai.program.plan.create", ({ prompt, options, id } = {}) =>
    createProgramPlan(prompt, options || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("ai.program.plan.get", ({ planId, id } = {}) =>
    getProgramPlan(planId, id));
  window.ANZUBA_AI_BRIDGE?.on("ai.program.scaffold", ({ planId, options, id } = {}) =>
    scaffoldProgram(planId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.build.run", ({ planId, options, id } = {}) => runProgramBuild(planId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.build.prepare", ({ planId, options, id } = {}) =>
    prepareProgramBuild(planId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.implementation.validate", ({ planId, options, id } = {}) =>
    validateProgramImplementation(planId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.implementation.write", ({ planId, options, id } = {}) =>
    generateImplementation(planId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.generate", ({ planId, options, id } = {}) =>
    generateProgramFiles(planId, options || {}, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.workspace.prepare", ({ planId, id } = {}) =>
    prepareProgramWorkspace(planId, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.diagnostics", ({ id } = {}) => getProgrammerDiagnostics(id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.plan.update", ({ planId, patch, id } = {}) =>
    updateProgramPlan(planId, patch || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("ai.program.plans.list", ({ id } = {}) =>
    listProgramPlans(id));
})();