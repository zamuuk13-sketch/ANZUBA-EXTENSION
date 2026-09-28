(() => {
  const KEY = "shell";
  const MAX_HISTORY = 100;
  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(projectId) {
    return projectId || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  async function state(project) {
    const id = projectId(project);
    if (!id) return null;
    const data = await window.ANZUBA_PROJECTS?.getData?.(id);
    if (!data) return null;
    const value = data[KEY] && typeof data[KEY] === "object" ? data[KEY] : {};
    const result = {
      cwd: String(value.cwd || "/workspace"),
      history: Array.isArray(value.history) ? value.history.map(String).slice(-MAX_HISTORY) : []
    };
    if (!data[KEY]) await window.ANZUBA_PROJECTS.setData({ [KEY]: result }, id);
    return result;
  }

  async function save(value, project) {
    const id = projectId(project);
    if (!id) return false;
    value.cwd = window.ANZUBA_FS.normalize(value.cwd || "/workspace");
    value.history = value.history.slice(-MAX_HISTORY);
    await window.ANZUBA_PROJECTS.setData({ [KEY]: clone(value) }, id);
    return true;
  }

  function tokenize(input) {
    const out = [];
    let token = "", quote = null, escaped = false;
    for (const char of String(input || "")) {
      if (escaped) { token += char; escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (quote) { if (char === quote) quote = null; else token += char; continue; }
      if (char === "'" || char === '"') { quote = char; continue; }
      if (/\s/.test(char)) { if (token) { out.push(token); token = ""; } }
      else token += char;
    }
    if (escaped) token += "\\";
    if (quote) throw new Error("Aspas não fechadas.");
    if (token) out.push(token);
    return out;
  }

  function resolvePath(path, cwd) {
    const value = String(path || "").trim();
    if (!value || value === ".") return window.ANZUBA_FS.normalize(cwd);
    if (value === "~") return "/home/ai";
    if (value.startsWith("~/")) return window.ANZUBA_FS.normalize("/home/ai/" + value.slice(2));
    if (value.startsWith("/")) return window.ANZUBA_FS.normalize(value);
    return window.ANZUBA_FS.normalize((cwd || "/") + "/" + value);
  }

  async function cd(args, value) {
    const target = resolvePath(args[0] || "~", value.cwd);
    const fs = await window.ANZUBA_FS.get();
    const key = target === "/" ? "/" : target + "/";
    if (!fs?.[key] || fs[key].type !== "directory") {
      return { stderr: "cd: diretório não encontrado: " + (args[0] || "~"), exitCode: 1 };
    }
    value.cwd = target;
    return {};
  }

  async function ls(args, value) {
    const target = resolvePath(args.find(x => !x.startsWith("-")) || ".", value.cwd);
    const fs = await window.ANZUBA_FS.get();
    if (fs?.[target]?.type === "file") return { stdout: target };
    const key = target === "/" ? "/" : target + "/";
    if (!fs?.[key] && target !== "/") return { stderr: "ls: caminho não encontrado: " + target, exitCode: 1 };
    const items = await window.ANZUBA_FS.list(target);
    return { stdout: items.map(x => x.type === "directory" ? x.name + "/" : x.name).join("\n") };
  }

  async function cat(args, value) {
    if (!args.length) return { stderr: "cat: informe um arquivo", exitCode: 1 };
    const out = [];
    let code = 0;
    for (const arg of args) {
      const path = resolvePath(arg, value.cwd);
      const text = await window.ANZUBA_FS.readFile(path);
      if (text === null) { out.push("cat: arquivo não encontrado: " + arg); code = 1; }
      else out.push(text);
    }
    return { stdout: out.join("\n"), exitCode: code };
  }

  async function mkdir(args, value) {
    if (!args.length) return { stderr: "mkdir: informe um diretório", exitCode: 1 };
    const fs = await window.ANZUBA_FS.get();
    for (const arg of args) {
      const path = resolvePath(arg, value.cwd);
      if (await window.ANZUBA_FS.exists(path)) return { stderr: "mkdir: já existe: " + arg, exitCode: 1 };
      const parent = path.split("/").slice(0, -1).join("/") || "/";
      const key = parent === "/" ? "/" : parent + "/";
      if (!fs?.[key]) return { stderr: "mkdir: diretório pai não encontrado: " + parent, exitCode: 1 };
      await window.ANZUBA_FS.mkdir(path);
    }
    return {};
  }

  async function touch(args, value) {
    if (!args.length) return { stderr: "touch: informe um arquivo", exitCode: 1 };
    const fs = await window.ANZUBA_FS.get();
    for (const arg of args) {
      const path = resolvePath(arg, value.cwd);
      if (await window.ANZUBA_FS.exists(path)) continue;
      const parent = path.split("/").slice(0, -1).join("/") || "/";
      const key = parent === "/" ? "/" : parent + "/";
      if (!fs?.[key]) return { stderr: "touch: diretório pai não encontrado: " + parent, exitCode: 1 };
      await window.ANZUBA_FS.writeFile(path, "");
    }
    return {};
  }

  async function env() {
    const value = await window.ANZUBA_ENV.get();
    return { stdout: Object.keys(value).sort().map(key => key + "=" + (Array.isArray(value[key]) ? value[key].join(":") : value[key])).join("\n") };
  }

  async function processes() {
    const list = await window.ANZUBA_PROCESSES.list();
    return { stdout: ["PID\tUSER\tSTATE\tCOMMAND", ...list.map(x => [x.pid, x.user, x.state, x.command].join("\t"))].join("\n") };
  }

  async function execute(commandLine, project) {
    const id = projectId(project);
    const value = await state(id);
    if (!value) throw new Error("Projeto ANZUBA não disponível.");
    const raw = String(commandLine ?? "").trim();
    if (!raw) return { command: "", stdout: "", stderr: "", exitCode: 0, cwd: value.cwd };
    const tokens = tokenize(raw), command = tokens.shift(), args = tokens;
    value.history.push(raw);
    let result = {};
    switch (command) {
      case "pwd": result = { stdout: value.cwd }; break;
      case "cd": result = await cd(args, value); break;
      case "ls": result = await ls(args, value); break;
      case "cat": result = await cat(args, value); break;
      case "mkdir": result = await mkdir(args, value); break;
      case "touch": result = await touch(args, value); break;
      case "echo": result = { stdout: args.join(" ") }; break;
      case "env": result = await env(); break;
      case "whoami": { const e = await window.ANZUBA_ENV.get(); result = { stdout: String(e?.USER || "ai") }; break; }
      case "ps": result = await processes(); break;
      case "uname": { const os = await window.ANZUBA_OS.status(); result = { stdout: "ANZUBA OS " + (os?.version || "0.1.0") + " " + (os?.architecture || "wasm32") }; break; }
      case "clear": result = { clear: true }; break;
      case "help": result = { stdout: "pwd cd ls cat mkdir touch echo env whoami ps uname clear help" }; break;
      default: result = { stderr: command + ": comando não encontrado", exitCode: 127 };
    }
    await save(value, id);
    return { command, stdout: String(result.stdout || ""), stderr: String(result.stderr || ""), exitCode: Number(result.exitCode || 0), clear: Boolean(result.clear), cwd: value.cwd };
  }

  async function history(project) {
    const value = await state(project);
    return value ? [...value.history] : [];
  }

  async function clearHistory(project) {
    const value = await state(project);
    if (!value) return false;
    value.history = [];
    return save(value, project);
  }

  window.ANZUBA_SHELL = { tokenize, resolvePath, execute, history, clearHistory };
  window.ANZUBA_AI_BRIDGE?.on("shell.exec", ({ command, id } = {}) => execute(command, id));
  window.ANZUBA_AI_BRIDGE?.on("shell.history", ({ id } = {}) => history(id));
  window.ANZUBA_AI_BRIDGE?.on("shell.history.clear", ({ id } = {}) => clearHistory(id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) state(active.id).catch(() => {});
  }, 0);
})();