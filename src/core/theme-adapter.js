(() => {
  const state = {
    last: null
  };

  function parseColor(value) {
    if (!value) return null;
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return value.trim();
    const parts = match[1].split(",").map(v => Number.parseFloat(v.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return parts.slice(0, 3).map(Math.round).join(",");
  }

  function luminance(rgb) {
    const values = rgb.split(",").map(Number);
    const linear = values.map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function analyze() {
    const body = document.body;
    const root = document.documentElement;
    if (!body) return null;

    const bodyStyle = getComputedStyle(body);
    const rootStyle = getComputedStyle(root);
    const bg = parseColor(bodyStyle.backgroundColor) || parseColor(rootStyle.backgroundColor);
    const text = parseColor(bodyStyle.color) || parseColor(rootStyle.color);
    const darkByMedia = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const darkByColor = bg ? luminance(bg) < 0.45 : false;

    const result = {
      mode: darkByColor || darkByMedia ? "dark" : "light",
      background: bg ? "rgb(" + bg + ")" : null,
      text: text ? "rgb(" + text + ")" : null,
      borderRadius: getComputedStyle(document.querySelector("button, input, [role='button']") || body).borderRadius || null,
      fontFamily: bodyStyle.fontFamily || rootStyle.fontFamily || null
    };

    state.last = result;
    root.dataset.anzubaTheme = result.mode;
    root.style.setProperty("--anzuba-host-font", result.fontFamily || "system-ui, sans-serif");
    if (result.background) root.style.setProperty("--anzuba-host-background", result.background);
    if (result.text) root.style.setProperty("--anzuba-host-text", result.text);
    return result;
  }

  window.ANZUBA_THEME = { analyze, getCurrent: () => state.last };
})();