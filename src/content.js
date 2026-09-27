(() => {
  if (window.top !== window.self) return;
  if (document.documentElement.dataset.anzubaLoaded === "true") return;
  document.documentElement.dataset.anzubaLoaded = "true";

  const root = document.createElement("div");
  root.id = "anzuba-overlay";
  document.documentElement.appendChild(root);

  function showNotification(message) {
    root.replaceChildren();
    const notification = document.createElement("div");
    notification.id = "anzuba-notification";
    notification.textContent = message;
    root.appendChild(notification);

    window.clearTimeout(showNotification.timer);
    showNotification.timer = window.setTimeout(() => {
      notification.classList.add("anzuba-notification-hide");
      window.setTimeout(() => notification.remove(), 220);
    }, 3000);
  }

  function updateDetection() {
    const result = window.ANZUBA_AI_DETECTOR?.detect();
    if (!result) return;

    if (result.supported) {
      document.documentElement.dataset.anzubaAi = result.id;
      showNotification("ANZUBA ativo • IA: " + result.name);
    } else {
      delete document.documentElement.dataset.anzubaAi;
      showNotification("ANZUBA ativo");
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