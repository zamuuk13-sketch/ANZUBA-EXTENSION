(() => {
  const detectors = [
    { id: "chatgpt", name: "ChatGPT", match: ({ hostname }) => hostname === "chatgpt.com" || hostname.endsWith(".chatgpt.com") || hostname === "chat.openai.com" },
    { id: "gemini", name: "Gemini", match: ({ hostname }) => hostname === "gemini.google.com" || hostname.endsWith(".gemini.google.com") },
    { id: "deepseek", name: "DeepSeek", match: ({ hostname }) => hostname === "chat.deepseek.com" || hostname.endsWith(".deepseek.com") },
    { id: "claude", name: "Claude", match: ({ hostname }) => hostname === "claude.ai" || hostname.endsWith(".claude.ai") },
    { id: "manus", name: "Manus", match: ({ hostname }) => hostname === "manus.im" || hostname.endsWith(".manus.im") }
  ];

  function detect(url = window.location.href) {
    let parsed;
    try { parsed = new URL(url); } catch {
      return { id: "unknown", name: "Site não reconhecido", hostname: "", supported: false };
    }
    const detector = detectors.find(item => item.match(parsed));
    return detector
      ? { id: detector.id, name: detector.name, hostname: parsed.hostname, supported: true }
      : { id: "unknown", name: "Site não reconhecido", hostname: parsed.hostname, supported: false };
  }

  window.ANZUBA_AI_DETECTOR = {
    detect,
    getSupportedSites: () => detectors.map(({ id, name }) => ({ id, name }))
  };
})();
