(() => {
  const STORAGE_KEY = "anzubaProjects";
  const state = { projects: [] };

  async function loadProjects() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    state.projects = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
    renderProjectMenu();
  }

  async function saveProjects() {
    await chrome.storage.local.set({ [STORAGE_KEY]: state.projects });
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

      const project = {
        id: crypto.randomUUID(),
        name,
        ai: document.documentElement.dataset.anzubaAi || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      state.projects.unshift(project);
      await saveProjects();
      document.documentElement.dataset.anzubaProject = project.id;
      close();
      renderProjectMenu();
      showNotification("Projeto criado • " + project.name);
    };

    create && backdrop.querySelector(".anzuba-project-create").addEventListener("click", create);
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
    button.textContent = "Novo projeto Anzuba";
    button.addEventListener("click", openProjectDialog);

    const arrow = document.createElement("button");
    arrow.type = "button";
    arrow.className = "anzuba-project-arrow";
    arrow.textContent = "⌄";
    arrow.setAttribute("aria-label", "Projetos Anzuba");

    const menu = document.createElement("div");
    menu.className = "anzuba-project-menu";
    menu.hidden = true;

    for (const project of state.projects) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "anzuba-project-item";
      item.textContent = project.name;
      item.addEventListener("click", () => {
        document.documentElement.dataset.anzubaProject = project.id;
        menu.hidden = true;
        showNotification("Projeto aberto • " + project.name);
      });
      menu.appendChild(item);
    }

    arrow.addEventListener("click", () => { menu.hidden = !menu.hidden; });
    launcher.append(button, arrow, menu);
    document.documentElement.appendChild(launcher);
  }

  window.ANZUBA_PROJECTS = {
    getAll: () => [...state.projects],
    create: openProjectDialog
  };

  loadProjects();
})();