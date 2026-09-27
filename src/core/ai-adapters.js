(() => {
  const adapters = {
    chatgpt: {
      id: "chatgpt",
      name: "ChatGPT",
      findComposer() {
        return document.querySelector(
          'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'
        );
      }
    },
    gemini: {
      id: "gemini",
      name: "Gemini",
      findComposer() {
        return document.querySelector(
          'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'
        );
      }
    },
    deepseek: {
      id: "deepseek",
      name: "DeepSeek",
      findComposer() {
        return document.querySelector(
          'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'
        );
      }
    },
    claude: {
      id: "claude",
      name: "Claude",
      findComposer() {
        return document.querySelector(
          'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'
        );
      }
    },
    manus: {
      id: "manus",
      name: "Manus",
      findComposer() {
        return document.querySelector(
          'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'
        );
      }
    }
  };

  function getAdapter() {
    const ai = window.ANZUBA_AI_DETECTOR?.detect();
    return ai?.supported ? adapters[ai.id] || null : null;
  }

  function inspect() {
    const adapter = getAdapter();
    const composer = adapter?.findComposer?.() || null;

    return {
      supported: Boolean(adapter),
      ai: adapter ? { id: adapter.id, name: adapter.name } : null,
      composer: composer
        ? {
            found: true,
            tagName: composer.tagName.toLowerCase(),
            contentEditable: composer.getAttribute("contenteditable") === "true"
          }
        : {
            found: false,
            tagName: null,
            contentEditable: false
          }
    };
  }

  window.ANZUBA_AI_ADAPTERS = {
    getAdapter,
    inspect,
    getSupported: () => Object.values(adapters).map(({ id, name }) => ({ id, name }))
  };

  window.ANZUBA_AI_BRIDGE?.on("ai.adapter.inspect", () => inspect());
})();