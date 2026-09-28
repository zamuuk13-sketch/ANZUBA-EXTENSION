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
    prepareProgramWorkspace,
    updateProgramPlan,
    listProgramPlans,
    analyzeRequirements,
    getPlanStep
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
  window.ANZUBA_AI_BRIDGE?.on("ai.program.workspace.prepare", ({ planId, id } = {}) =>
    prepareProgramWorkspace(planId, id));

  window.ANZUBA_AI_BRIDGE?.on("ai.program.plan.update", ({ planId, patch, id } = {}) =>
    updateProgramPlan(planId, patch || {}, id));
  window.ANZUBA_AI_BRIDGE?.on("ai.program.plans.list", ({ id } = {}) =>
    listProgramPlans(id));
})();