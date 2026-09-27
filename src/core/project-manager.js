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
    return getProjectSummary(projects.find(project => project.id === id) || null);
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

    arrow.addEventListener("click", () => { menu.hidden = !menu.hidden; });
    launcher.append(button, arrow, menu);
    document.documentElement.appendChild(launcher);
  }

  window.ANZUBA_AI_BRIDGE?.on("project.summary", ({ id } = {}) =>
    id ? getProjectSummaryById(id) : getProjectSummary(getActiveProject())
  );

  window.ANZUBA_PROJECTS = {
    getAll: () => [...state.projects],
    getActive: getActiveProject,
    create: openProjectDialog,
    setActive: setActiveProject,
    save: saveProjects,
    getData: getProjectData,
    setData: setProjectData,
    clearData: clearProjectData
  };

  loadProjects();
})();