(() => {
  const BOOTSTRAP_KEY = "anzubaAgentBootstrap";
  const PROCESSED_KEY = "__ANZUBA_AGENT_PROCESSED__";

  const allowed = new Set([
    "context.get","project.summary","os.status","os.boot","os.shutdown",
    "fs.list","fs.read","fs.write","fs.mkdir",
    "game.scene.create","game.scene.activate","game.entity.add",
    "game.entity.transform.set","game.entity.components.set",
    "game.entity.parent.set","game.scene.gravity.set"
  ]);

  const toolDefinitions = {
    "game.scene.create": { name: "nome da cena", settings: "opcional" },
    "game.scene.activate": { sceneId: "id da cena" },
    "game.entity.add": { sceneId: "id", entity: "objeto da entidade" },
    "game.entity.transform.set": { sceneId: "id", entityId: "id", transform: "{position,rotation,scale}" },
    "game.entity.components.set": { sceneId: "id", entityId: "id", components: "objeto" },
    "game.entity.parent.set": { sceneId: "id", entityId: "id", parentId: "id ou null" },
    "game.scene.gravity.set": { sceneId: "id", gravity: "numero" },
    "fs.mkdir": { path: "caminho virtual" },
    "fs.write": { path: "caminho virtual", content: "texto" },
    "fs.read": { path: "caminho virtual" },
    "fs.list": { path: "caminho virtual" },
    "project.summary": { id: "opcional" },
    "os.status": {},
    "os.boot": {},
    "context.get": {}
  };

  function processedSet() {
    if (!window[PROCESSED_KEY]) window[PROCESSED_KEY] = new Set();
    return window[PROCESSED_KEY];
  }

  function parseToolCalls(text) {
    const calls = [];
    const regex = /\[\[ANZUBA_TOOL\]\]\s*([\s\S]*?)(?=\[\[ANZUBA_TOOL\]\]|$)/g;
    let match;
    while ((match = regex.exec(String(text || "")))) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed && typeof parsed === "object") calls.push(parsed);
      } catch {}
    }
    return calls;
  }

  function bootstrapText(project) {
    const name = String(project?.name || "Projeto atual");
    const defs = Object.entries(toolDefinitions).map(([key, schema]) => "- " + key + ": " + JSON.stringify(schema)).join("\n");
    return [
      "[ANZUBA OS — projeto conectado]",
      "Você está trabalhando dentro do projeto ANZUBA "" + name + "".",
      "O ANZUBA OS é o ambiente operacional virtual persistente deste projeto. Ele não é apenas uma interface visual.",
      "Quando precisar criar ou modificar algo, opere no OS usando as ferramentas ANZUBA abaixo.",
      "Para executar uma ferramenta, responda com um bloco no formato:",
      "[[ANZUBA_TOOL]]",
      "{\"command\":\"game.scene.create\",\"payload\":{\"name\":\"Minha Cena\"}}",
      "Aguarde [[ANZUBA_RESULT]] antes de continuar. Não invente resultados.",
      "Ferramentas disponíveis:",
      defs,
      "Ao receber um pedido para criar um jogo, construa primeiro a estrutura real no ANZUBA OS/Game Engine e depois continue em etapas.",
      "Não diga que não possui acesso ao filesystem ou ao ANZUBA OS enquanto este projeto estiver conectado."
    ].join("\n");
  }

  async function sendToAI(text) {
    return window.ANZUBA_AI_ADAPTERS.sendMessage(text);
  }

  async function ensureBootstrap(project) {
    if (!project?.id) return;
    const conversation = window.ANZUBA_AI_ADAPTERS?.getConversationSnapshot?.();
    const conversationId = conversation?.conversationId || "current";
    const data = await window.ANZUBA_PROJECTS?.getData?.(project.id) || {};
    if (data[BOOTSTRAP_KEY]?.conversationId === conversationId) return;

    await window.ANZUBA_OS.boot(project.id);
    await window.ANZUBA_PROJECTS.setData({
      [BOOTSTRAP_KEY]: { conversationId, projectId: project.id, sentAt: new Date().toISOString() }
    }, project.id);
    await sendToAI(bootstrapText(project));

    window.dispatchEvent(new CustomEvent("anzuba:agent-connected", {
      detail: { projectId: project.id, conversationId }
    }));
  }

  async function executeCall(call) {
    const command = String(call?.command || "").trim();
    if (!allowed.has(command)) throw new Error("Ferramenta não permitida: " + command);
    const payload = call?.payload && typeof call.payload === "object" ? call.payload : {};
    return window.ANZUBA_AI_BRIDGE.request(command, payload);
  }

  async function processAssistantMessage(message) {
    const calls = parseToolCalls(message?.text);
    if (!calls.length) return;

    const processed = processedSet();
    const messageId = String(message?.id || message?.text || "");
    for (let index = 0; index < calls.length; index += 1) {
      const key = messageId + "::" + index;
      if (processed.has(key)) continue;
      processed.add(key);

      let result;
      try {
        result = await executeCall(calls[index]);
      } catch (error) {
        result = { ok: false, error: error instanceof Error ? error.message : String(error) };
      }

      await sendToAI([
        "[[ANZUBA_RESULT]]",
        JSON.stringify({ command: calls[index].command, result })
      ].join("\n"));
    }
  }

  function startObserver() {
    if (!window.ANZUBA_AI_ADAPTERS?.observeMessages) return;
    window.__ANZUBA_AGENT_STOP__?.();
    window.__ANZUBA_AGENT_STOP__ = window.ANZUBA_AI_ADAPTERS.observeMessages(message => {
      if (message?.role === "assistant") processAssistantMessage(message).catch(() => {});
    });
  }

  async function connect(project) {
    if (!project) return;
    try {
      await window.ANZUBA_OS.boot(project.id);
      startObserver();
      await ensureBootstrap(project);
    } catch (error) {
      window.dispatchEvent(new CustomEvent("anzuba:agent-error", {
        detail: { message: error instanceof Error ? error.message : String(error) }
      }));
    }
  }

  window.addEventListener("anzuba:project-changed", event => connect(event.detail || window.ANZUBA_PROJECTS?.getActive?.()));
  window.addEventListener("anzuba:ai-ready", () => connect(window.ANZUBA_PROJECTS?.getActive?.()));

  window.ANZUBA_AGENT = { connect, execute: executeCall, parseToolCalls, tools: () => Object.keys(toolDefinitions) };

  setTimeout(() => connect(window.ANZUBA_PROJECTS?.getActive?.()), 700);
})();