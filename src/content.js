(() => {
  if (window.top !== window.self) return;
  if (document.documentElement.dataset.anzubaLoaded === "true") return;

  document.documentElement.dataset.anzubaLoaded = "true";

  const badge = document.createElement("div");
  badge.id = "anzuba-stage1-badge";
  badge.textContent = "ANZUBA";
  badge.title = "ANZUBA — Etapa 1";

  document.documentElement.appendChild(badge);
})();
