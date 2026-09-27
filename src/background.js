chrome.runtime.onInstalled.addListener(() => {
  console.log("ANZUBA iniciado.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ANZUBA_PING") {
    sendResponse({ ok: true, version: "0.1.0" });
  }
  return true;
});
