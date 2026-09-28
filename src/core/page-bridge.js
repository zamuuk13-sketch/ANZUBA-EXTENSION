(() => {
  const CHANNEL = "ANZUBA_MAIN_BRIDGE_V1";
  const MAX_PAYLOAD = 200000;

  async function request(command, payload) {
    if (command === "fs.list") return window.ANZUBA_FS.list(payload?.path || "/", payload?.id);
    if (command === "fs.read") return window.ANZUBA_FS.readFile(payload?.path || "/", payload?.id);
    if (command === "fs.write") return window.ANZUBA_FS.writeFile(payload?.path || "/", payload?.content ?? "", payload?.id);
    if (command === "fs.mkdir") return window.ANZUBA_FS.mkdir(payload?.path || "/", payload?.id);
    return window.ANZUBA_AI_BRIDGE.request(command, payload || {});
  }

  window.addEventListener("message", async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== CHANNEL || data.direction !== "request") return;
    if (typeof data.id !== "string" || typeof data.command !== "string" || !data.command || data.command.length > 160) return;

    try {
      if (JSON.stringify(data.payload ?? {}).length > MAX_PAYLOAD) throw new Error("Payload do ANZUBA excede o limite.");
      const result = await request(data.command, data.payload);
      window.postMessage({ source: CHANNEL, direction: "response", id: data.id, ok: true, result }, location.origin);
    } catch (error) {
      window.postMessage({
        source: CHANNEL, direction: "response", id: data.id, ok: false,
        error: error instanceof Error ? error.message : String(error)
      }, location.origin);
    }
  });
})();