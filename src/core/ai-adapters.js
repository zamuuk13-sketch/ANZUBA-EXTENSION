(() => {
  const adapters = {
    chatgpt: {
      id: "chatgpt",
      name: "ChatGPT",
      findComposer() {
        return document.querySelector(
          'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'
        );
      },
      findSendButton() {
        return document.querySelector(
          'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Enviar" i]'
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
      },
      findSendButton() {
        return document.querySelector(
          'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Enviar" i]'
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
      },
      findSendButton() {
        return document.querySelector(
          'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Enviar" i]'
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
      },
      findSendButton() {
        return document.querySelector(
          'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Enviar" i]'
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
      },
      findSendButton() {
        return document.querySelector(
          'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Enviar" i]'
        );
      }
    }
  };

  function getAdapter() {
    const ai = window.ANZUBA_AI_DETECTOR?.detect();
    return ai?.supported ? adapters[ai.id] || null : null;
  }

  function setComposerValue(value) {
    const adapter = getAdapter();
    const composer = adapter?.findComposer?.();
    if (!composer) throw new Error("Campo de mensagem não encontrado.");

    const text = String(value ?? "");

    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(composer),
        "value"
      )?.set;
      setter ? setter.call(composer, text) : (composer.value = text);
      composer.dispatchEvent(new Event("input", { bubbles: true }));
      composer.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      composer.focus();
      composer.textContent = text;
      composer.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text
      }));
    }

    return { updated: true, length: text.length };
  }

  function sendMessage(value) {
    const adapter = getAdapter();
    if (!adapter) throw new Error("IA não suportada.");

    setComposerValue(value);

    const button = adapter.findSendButton?.();
    if (button && !button.disabled) {
      button.click();
      return { sent: true, method: "button" };
    }

    const composer = adapter.findComposer?.();
    if (composer) {
      composer.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true
      }));
      return { sent: true, method: "enter" };
    }

    throw new Error("Não foi possível enviar a mensagem.");
  }

  function findMessages() {
    const candidates = Array.from(document.querySelectorAll(
      '[data-message-author-role="user"], [data-message-author-role="assistant"], [data-message-author-role="model"], [data-testid*="user" i], [data-testid*="assistant" i], [data-testid*="model" i]'
    ));

    return candidates.map((element, index) => ({
      index,
      role: element.getAttribute("data-message-author-role") ||
        (element.matches('[data-testid*="user" i]') ? "user" : "assistant"),
      text: (element.innerText || element.textContent || "").trim()
    })).filter(message => message.text);
  }

  function getConversationContext() {
    return {
      ai: getAdapter()?.id || null,
      url: location.href,
      title: document.title,
      messages: findMessages()
    };
  }

  function observeMessages(onMessage) {
    if (typeof onMessage !== "function") {
      throw new Error("Callback inválido.");
    }

    let lastText = "";
    const scan = () => {
      const messages = findMessages();
      const latest = messages[messages.length - 1];
      if (!latest || latest.text === lastText) return;

      lastText = latest.text;
      onMessage(latest);
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
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
    setComposerValue,
    sendMessage,
    findMessages,
    getConversationContext,
    observeMessages,
    getSupported: () => Object.values(adapters).map(({ id, name }) => ({ id, name }))
  };

  window.ANZUBA_AI_BRIDGE?.on("ai.message.set", ({ value }) => {
    return setComposerValue(value);
  });

  window.ANZUBA_AI_BRIDGE?.on("ai.message.send", ({ value }) => {
    return sendMessage(value);
  });

  window.ANZUBA_AI_BRIDGE?.on("ai.adapter.inspect", () => inspect());
  window.ANZUBA_AI_BRIDGE?.on("ai.message.list", () => findMessages());
  window.ANZUBA_AI_BRIDGE?.on("ai.conversation.context", () => getConversationContext());

  window.ANZUBA_AI_BRIDGE?.on("ai.message.observe", ({ enabled = true }) => {
    if (!enabled) return { observing: false };

    if (window.__ANZUBA_AI_MESSAGE_STOP__) {
      window.__ANZUBA_AI_MESSAGE_STOP__();
    }

    window.__ANZUBA_AI_MESSAGE_STOP__ = observeMessages((message) => {
      window.ANZUBA_AI_BRIDGE?.emit("ai:message", { message });
    });

    return { observing: true };
  });
})();