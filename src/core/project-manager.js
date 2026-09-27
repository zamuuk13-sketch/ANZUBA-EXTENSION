(() => {
  const STORAGE_KEY = "anzubaProjects";
  const ACTIVE_KEY = "anzubaActiveProject";
  const state = { projects: [], activeId: null };

  async function loadProjects() {
    const data = await chrome.storage.local.get([STORAGE_KEY, ACTIVE_KEY]);
    state.projects = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
    state.activeId = data[ACTIVE_KEY] || null;

    if (state.activeId && !state.projects.some(project => project.id === state.activeId)) {
      state.activeId = null;
      await chrome.storage.local.remove(ACTIVE_KEY);
    }

    applyActiveProject();
    renderProjectMenu();
    const active = getActiveProject();
    if (active) window.dispatchEvent(new CustomEvent("anzuba:project-changed", { detail: { ...active } }));
  }

  async function saveProjects() {
    await chrome.storage.local.set({ [STORAGE_KEY]: state.projects });
  }

  function getProjectData(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    return project ? { ...project.data } : null;
  }

  async function setProjectData(data, projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project || !data || typeof data !== "object") return false;

    project.data = { ...project.data, ...data };
    project.updatedAt = new Date().toISOString();
    await saveProjects();
    return true;
  }

  async function clearProjectData(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return false;

    project.data = {};
    project.updatedAt = new Date().toISOString();
    await saveProjects();
    return true;
  }

  async function setActiveProject(id) {
    const project = state.projects.find(item => item.id === id);
    if (!project) return false;

    state.activeId = project.id;
    project.updatedAt = new Date().toISOString();

    await chrome.storage.local.set({
      [STORAGE_KEY]: state.projects,
      [ACTIVE_KEY]: state.activeId
    });

    applyActiveProject();
    renderProjectMenu();
    showNotification("Projeto aberto • " + project.name);
    window.dispatchEvent(new CustomEvent("anzuba:project-changed", { detail: { ...project } }));
    return true;
  }

  function getProjectSummary(project) {
    if (!project) return null;
    return {
      id: project.id,
      name: project.name,
      ai: project.ai || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      hasData: !!project.data,
      dataKeys: project.data ? Object.keys(project.data) : []
    };
  }

  function getProjectSummaryById(id) {
    return getProjectSummary(state.projects.find(project => project.id === id) || null);
  }

  function normalizeChatMessages(messages, conversationId = "current") {
    if (!Array.isArray(messages)) return [];

    return messages
      .map((message, index) => {
        const role = message?.role === "user" ? "user" : "assistant";
        const text = String(message?.text ?? "").trim();
        if (!text) return null;

        const existingId = String(message?.id || "").trim();
        const id = existingId || ("msg_" + conversationId + "_" + index);

        return {
          id,
          role,
          text
        };
      })
      .filter(Boolean);
  }

  function chatMessagesEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  async function getChatSessions(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    const sessions = project?.data?.chatSessions;
    if (!Array.isArray(sessions)) return [];

    return sessions.map(session => ({
      conversationId: session.conversationId || "current",
      ai: session.ai || null,
      url: session.url || null,
      title: session.title || "",
      messageCount: Number(session.messageCount || 0),
      updatedAt: session.updatedAt || null,
      messages: normalizeChatMessages(session.messages, session.conversationId || "current")
    }));
  }

  function getActiveChatSession(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return null;

    const sessionId = project.data?.activeChatSessionId || project.data?.chat?.conversationId || null;
    if (!sessionId) return null;

    const sessions = Array.isArray(project.data?.chatSessions) ? project.data.chatSessions : [];
    const session = sessions.find(item => item.conversationId === sessionId);
    return session ? {
      conversationId: session.conversationId || "current",
      ai: session.ai || null,
      url: session.url || null,
      title: session.title || "",
      messageCount: Number(session.messageCount || 0),
      updatedAt: session.updatedAt || null,
      messages: normalizeChatMessages(session.messages, session.conversationId || "current")
    } : null;
  }

  async function setActiveChatSession(conversationId, projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project || !conversationId) return false;

    const sessions = Array.isArray(project.data?.chatSessions) ? project.data.chatSessions : [];
    const session = sessions.find(item => item.conversationId === conversationId);
    if (!session) return false;

    project.data = {
      ...(project.data || {}),
      activeChatSessionId: session.conversationId
    };
    project.updatedAt = new Date().toISOString();
    await saveProjects();

    window.dispatchEvent(new CustomEvent("anzuba:chat-session-changed", {
      detail: {
        projectId: project.id,
        conversationId: session.conversationId
      }
    }));

    return true;
  }

  async function getChatMessages(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    const chat = project?.data?.chat;
    if (!chat) return null;

    const conversationId = chat.conversationId || "current";
    const messages = normalizeChatMessages(chat.messages, conversationId);

    return {
      conversationId,
      ai: chat.ai || null,
      messageCount: messages.length,
      messages
    };
  }

  function getChatState(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    return project?.data?.chat ? { ...project.data.chat } : null;
  }

  async function syncChatState(projectId = state.activeId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return null;

    const page = window.ANZUBA_AI_ADAPTERS?.getPageState?.() || null;
    const conversation = window.ANZUBA_AI_ADAPTERS?.getConversationSnapshot?.() || null;
    const ai = window.ANZUBA_AI_DETECTOR?.detect?.() || null;

    const conversationId = conversation?.conversationId || page?.conversationId || "current";
    const messages = normalizeChatMessages(conversation?.messages, conversationId);
    const previousChat = project.data?.chat || null;

    const chat = {
      ai: ai ? { id: ai.id, name: ai.name } : (previousChat?.ai || null),
      url: page?.url || location.href,
      title: page?.title || document.title,
      conversationId,
      messageCount: messages.length,
      messages,
      updatedAt: new Date().toISOString()
    };

    const previousMessages = normalizeChatMessages(
      previousChat?.messages,
      previousChat?.conversationId || conversationId
    );

    const changed =
      !previousChat ||
      previousChat.conversationId !== chat.conversationId ||
      previousChat.url !== chat.url ||
      previousChat.title !== chat.title ||
      !chatMessagesEqual(previousMessages, chat.messages);

    const data = project.data || {};
    const sessions = Array.isArray(data.chatSessions) ? [...data.chatSessions] : [];
    const sessionIndex = sessions.findIndex(session => session.conversationId === chat.conversationId);

    if (sessionIndex >= 0) {
      const previousSession = sessions[sessionIndex];
      const sessionChanged =
        previousSession.url !== chat.url ||
        previousSession.title !== chat.title ||
        previousSession.messageCount !== chat.messageCount ||
        !chatMessagesEqual(
          normalizeChatMessages(previousSession.messages, chat.conversationId),
          chat.messages
        );

      if (sessionChanged) sessions[sessionIndex] = { ...chat };
    } else {
      sessions.unshift({ ...chat });
    }

    const nextData = {
      ...data,
      chat,
      chatSessions: sessions,
      activeChatSessionId: chat.conversationId
    };

    if (!changed && sessionIndex >= 0) {
      const previousSessions = Array.isArray(data.chatSessions) ? data.chatSessions : [];
      if (JSON.stringify(previousSessions) === JSON.stringify(sessions)) return { ...previousChat };
    }

    project.data = nextData;
    project.updatedAt = chat.updatedAt;
    await saveProjects();
    return { ...chat };
  }

  function getActiveProject() {
    return state.projects.find(project => project.id === state.activeId) || null;
  }

  function applyActiveProject() {
    const project = getActiveProject();
    if (project) {
      document.documentElement.dataset.anzubaProject = project.id;
      document.documentElement.dataset.anzubaProjectName = project.name;
    } else {
      delete document.documentElement.dataset.anzubaProject;
      delete document.documentElement.dataset.anzubaProjectName;
    }
  }

  function openProjectDialog() {
    if (document.getElementById("anzuba-project-dialog")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "anzuba-project-dialog";
    backdrop.innerHTML = `
      <div class="anzuba-project-card" role="dialog" aria-modal="true" aria-label="Novo projeto Anzuba">
        <button class="anzuba-project-close" type="button" aria-label="Fechar">×</button>
        <div class="anzuba-project-title">Novo projeto Anzuba</div>
        <div class="anzuba-project-subtitle">Crie um ambiente persistente para esta IA.</div>
        <label class="anzuba-project-label">Nome do projeto</label>
        <input class="anzuba-project-input" id="anzuba-project-name" type="text" maxlength="60" placeholder="Ex.: Jogo de Terror" autofocus>
        <button class="anzuba-project-create" type="button">Criar projeto</button>
      </div>`;

    document.documentElement.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector(".anzuba-project-close").addEventListener("click", close);
    backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });

    const input = backdrop.querySelector("#anzuba-project-name");
    const create = async () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }

      const now = new Date().toISOString();
      const project = {
        id: crypto.randomUUID(),
        name,
        ai: document.documentElement.dataset.anzubaAi || null,
        createdAt: now,
        updatedAt: now,
        data: {}
      };

      state.projects.unshift(project);
      state.activeId = project.id;
      await chrome.storage.local.set({
        [STORAGE_KEY]: state.projects,
        [ACTIVE_KEY]: state.activeId
      });

      applyActiveProject();
      close();
      renderProjectMenu();
      showNotification("Projeto criado • " + project.name);
      window.dispatchEvent(new CustomEvent("anzuba:project-changed", { detail: { ...project } }));
    };

    backdrop.querySelector(".anzuba-project-create").addEventListener("click", create);
    input.addEventListener("keydown", e => { if (e.key === "Enter") create(); });
  }

  function showNotification(message) {
    const root = document.getElementById("anzuba-overlay");
    if (!root) return;
    root.replaceChildren();
    const notification = document.createElement("div");
    notification.id = "anzuba-notification";
    notification.textContent = message;
    root.appendChild(notification);
    clearTimeout(showNotification.timer);
    showNotification.timer = setTimeout(() => {
      notification.classList.add("anzuba-notification-hide");
      setTimeout(() => notification.remove(), 220);
    }, 3000);
  }

  function renderProjectMenu() {
    const old = document.getElementById("anzuba-project-launcher");
    if (old) old.remove();

    const launcher = document.createElement("div");
    launcher.id = "anzuba-project-launcher";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "anzuba-project-button";
    button.textContent = state.activeId
      ? (getActiveProject()?.name || "Novo projeto Anzuba")
      : "Novo projeto Anzuba";
    button.title = "Criar novo projeto";
    button.addEventListener("click", openProjectDialog);

    const arrow = document.createElement("button");
    arrow.type = "button";
    arrow.className = "anzuba-project-arrow";
    arrow.textContent = "⌄";
    arrow.setAttribute("aria-label", "Projetos Anzuba");

    const menu = document.createElement("div");
    menu.className = "anzuba-project-menu";
    menu.hidden = true;

    if (state.projects.length === 0) {
      const empty = document.createElement("div");
      empty.className = "anzuba-project-empty";
      empty.textContent = "Nenhum projeto criado";
      menu.appendChild(empty);
    }

    for (const project of state.projects) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "anzuba-project-item";
      item.dataset.active = String(project.id === state.activeId);
      item.textContent = project.name;
      item.addEventListener("click", () => {
        menu.hidden = true;
        setActiveProject(project.id);
      });
      menu.appendChild(item);
    }

    const sessionsButton = document.createElement("button");
    sessionsButton.type = "button";
    sessionsButton.className = "anzuba-session-button";
    sessionsButton.textContent = "Conversas do projeto";
    sessionsButton.title = "Abrir histórico de conversas";
    sessionsButton.addEventListener("click", async () => {
      const active = getActiveProject();
      if (!active) return;

      const sessions = await getChatSessions(active.id);
      const sessionMenu = document.createElement("div");
      sessionMenu.className = "anzuba-session-menu";

      if (!sessions.length) {
        const empty = document.createElement("div");
        empty.className = "anzuba-project-empty";
        empty.textContent = "Nenhuma conversa salva";
        sessionMenu.appendChild(empty);
      } else {
        const activeId = active.data?.activeChatSessionId || active.data?.chat?.conversationId;
        for (const session of sessions) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "anzuba-session-item";
          item.dataset.active = String(session.conversationId === activeId);

          const title = session.title || "Conversa sem título";
          const count = session.messageCount === 1 ? "1 mensagem" : session.messageCount + " mensagens";
          item.innerHTML = "<span>" + title.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
            "</span><small>" + count + "</small>";

          item.addEventListener("click", async () => {
            await setActiveChatSession(session.conversationId, active.id);
            sessionMenu.remove();
            menu.hidden = true;
            showNotification("Conversa selecionada");
          });
          sessionMenu.appendChild(item);
        }
      }

      document.documentElement.appendChild(sessionMenu);
      const rect = sessionsButton.getBoundingClientRect();
      sessionMenu.style.left = rect.left + "px";
      sessionMenu.style.top = (rect.bottom + 6) + "px";

      const close = event => {
        if (!sessionMenu.contains(event.target) && event.target !== sessionsButton) {
          sessionMenu.remove();
          document.removeEventListener("pointerdown", close, true);
        }
      };
      document.addEventListener("pointerdown", close, true);
    });

    arrow.addEventListener("click", () => { menu.hidden = !menu.hidden; });
    menu.appendChild(sessionsButton);
    launcher.append(button, arrow, menu);
    document.documentElement.appendChild(launcher);
  }

  window.ANZUBA_AI_BRIDGE?.on("project.summary", ({ id } = {}) =>
    id ? getProjectSummaryById(id) : getProjectSummary(getActiveProject())
  );
  window.ANZUBA_AI_BRIDGE?.on("chat.state", ({ id } = {}) =>
    getChatState(id || state.activeId)
  );
  window.ANZUBA_AI_BRIDGE?.on("chat.messages", ({ id } = {}) =>
    getChatMessages(id || state.activeId)
  );
  window.ANZUBA_AI_BRIDGE?.on("chat.sessions", ({ id } = {}) =>
    getChatSessions(id || state.activeId)
  );
  window.ANZUBA_AI_BRIDGE?.on("chat.bind", ({ id } = {}) =>
    syncChatState(id || state.activeId)
  );
  window.ANZUBA_AI_BRIDGE?.on("chat.session.active", ({ id } = {}) =>
    getActiveChatSession(id || state.activeId)
  );
  window.ANZUBA_AI_BRIDGE?.on("chat.session.select", ({ conversationId, id } = {}) =>
    setActiveChatSession(conversationId, id || state.activeId)
  );

  window.addEventListener("anzuba:ai-event", event => {
    const type = event.detail?.type;
    if (type === "ai:conversation-changed" || type === "ai:page-changed") {
      syncChatState().catch(() => {});
    }
  });

  window.ANZUBA_PROJECTS = {
    getAll: () => [...state.projects],
    getActive: getActiveProject,
    create: openProjectDialog,
    setActive: setActiveProject,
    save: saveProjects,
    getData: getProjectData,
    setData: setProjectData,
    clearData: clearProjectData,
    getChatMessages,
    getChatSessions,
    getActiveChatSession,
    setActiveChatSession
  };

  loadProjects();
})();