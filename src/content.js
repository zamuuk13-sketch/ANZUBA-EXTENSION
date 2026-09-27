(() => {
  if (window.top !== window.self) return;
  if (document.documentElement.dataset.anzubaLoaded === "true") return;
  document.documentElement.dataset.anzubaLoaded = "true";

  const badge = document.createElement("div");
  badge.id = "anzuba-stage1-badge";
  badge.textContent = "ANZUBA";
  badge.title = "ANZUBA — Etapa 2";

  const aiStatus = document.createElement("div");
  aiStatus.id = "anzuba-ai-status";
  aiStatus.textContent = "Detectando site...";

  const root = document.createElement("div");
  root.id = "anzuba-overlay";
  root.append(badge, aiStatus);
  document.documentElement.appendChild(root);

  function updateDetection() {
    const result = window.ANZUBA_AI_DETECTOR?.detect();
    if (!result) return;
    if (result.supported) {
      aiStatus.textContent = "IA: " + result.name;
      aiStatus.dataset.detected = "true";
      root.dataset.ai = result.id;
      document.documentElement.dataset.anzubaAi = result.id;
    } else {
      aiStatus.textContent = "ANZUBA ativo";
      aiStatus.dataset.detected = "false";
      delete root.dataset.ai;
      delete document.documentElement.dataset.anzubaAi;
    }
  }

  updateDetection();
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      updateDetection();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
