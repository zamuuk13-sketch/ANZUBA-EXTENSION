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

  function getConversationId() {
    const url = new URL(location.href);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "current";
  }

  function getConversationSnapshot() {
    const context = getConversationContext();
    return {
      conversationId: getConversationId(),
      ai: context.ai,
      url: context.url,
      messageCount: context.messages.length,
      messages: context.messages.map((message, index) => ({
        id: message.role + "_" + index + "_" + message.text.length,
        role: message.role,
        text: message.text
      }))
    };
  }

  function observeConversation(onChange) {
    if (typeof onChange !== "function") {
      throw new Error("Callback inválido.");
    }

    let previous = JSON.stringify(getConversationSnapshot());

    const scan = () => {
      const snapshot = getConversationSnapshot();
      const current = JSON.stringify(snapshot);
      if (current === previous) return;
      previous = current;
      onChange(snapshot);
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

  function getPageState() {
    const context = getConversationContext();
    return {
      ai: context.ai,
      url: context.url,
      title: context.title,
      conversationId: getConversationId(),
      messageCount: context.messages.length
    };
  }

  function observePageState(onChange) {
    if (typeof onChange !== "function") {
      throw new Error("Callback inválido.");
    }

    let previous = JSON.stringify(getPageState());
    const scan = () => {
      const state = getPageState();
      const current = JSON.stringify(state);
      if (current === previous) return;
      previous = current;
      onChange(state);
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const onPopState = () => scan();

    history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      scan();
      return result;
    };

    history.replaceState = function(...args) {
      const result = originalReplaceState.apply(this, args);
      scan();
      return result;
    };

    window.addEventListener("popstate", onPopState);

    const observer = new MutationObserver(scan);
    observer.observe(document.title ? document.head : document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", onPopState);
      observer.disconnect();
    };
  }

  function getCapabilities() {
    const adapter = getAdapter();
    if (!adapter) {
      return {
        supported: false,
        ai: null,
        capabilities: {
          readConversation: false,
          observeConversation: false,
          sendMessage: false,
          observePage: false
        }
      };
    }

    return {
      supported: true,
      ai: { id: adapter.id, name: adapter.name },
      capabilities: {
        readConversation: typeof findMessages === "function",
        observeConversation: typeof observeConversation === "function",
        sendMessage: typeof sendMessage === "function",
        observePage: typeof observePageState === "function"
      }
    };
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
    getConversationId,
    getConversationSnapshot,
    getPageState,
    getCapabilities,
    observeConversation,
    observePageState,
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
  window.ANZUBA_AI_BRIDGE?.on("ai.capabilities", () => getCapabilities());
  window.ANZUBA_AI_BRIDGE?.on("ai.message.list", () => findMessages());
  window.ANZUBA_AI_BRIDGE?.on("ai.conversation.context", () => getConversationContext());
  window.ANZUBA_AI_BRIDGE?.on("ai.conversation.snapshot", () => getConversationSnapshot());
  window.ANZUBA_AI_BRIDGE?.on("ai.page.state", () => getPageState());
  window.ANZUBA_AI_BRIDGE?.on("ai.page.observe", ({ enabled = true }) => {
    if (!enabled) {
      window.__ANZUBA_AI_PAGE_STOP__?.();
      window.__ANZUBA_AI_PAGE_STOP__ = null;
      return { observing: false };
    }

    window.__ANZUBA_AI_PAGE_STOP__?.();
    window.__ANZUBA_AI_PAGE_STOP__ = observePageState((state) => {
      window.ANZUBA_AI_BRIDGE?.emit("ai:page-changed", { state });
    });

    return { observing: true };
  });

  window.ANZUBA_AI_BRIDGE?.on("ai.conversation.observe", ({ enabled = true }) => {
    if (!enabled) {
      window.__ANZUBA_AI_CONVERSATION_STOP__?.();
      window.__ANZUBA_AI_CONVERSATION_STOP__ = null;
      return { observing: false };
    }

    window.__ANZUBA_AI_CONVERSATION_STOP__?.();
    window.__ANZUBA_AI_CONVERSATION_STOP__ = observeConversation((snapshot) => {
      window.ANZUBA_AI_BRIDGE?.emit("ai:conversation-changed", { snapshot });
    });

    return { observing: true };
  });

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