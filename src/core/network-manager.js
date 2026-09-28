(() => {
  const NETWORK_KEY = "network";

  const DEFAULT_NETWORK = {
    hostname: "anzuba",
    domain: "local",
    interfaces: [
      {
        name: "lo",
        type: "loopback",
        address: "127.0.0.1",
        netmask: "255.0.0.0",
        state: "up"
      },
      {
        name: "anz0",
        type: "virtual",
        address: "10.0.0.2",
        netmask: "255.255.255.0",
        gateway: "10.0.0.1",
        state: "up"
      }
    ],
    dns: ["10.0.0.1"],
    routes: [
      {
        destination: "0.0.0.0/0",
        gateway: "10.0.0.1",
        interface: "anz0"
      }
    ],
    online: true,
    networkAccess: "controlled",
    updatedAt: null
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function projectId(id) {
    return id || window.ANZUBA_PROJECTS?.getActive?.()?.id || null;
  }

  function validIPv4(value) {
    const parts = String(value || "").split(".");
    return parts.length === 4 && parts.every(part => {
      const n = Number(part);
      return /^\d+$/.test(part) && n >= 0 && n <= 255;
    });
  }

  function normalizeInterface(item) {
    return {
      name: String(item?.name || "anz0").slice(0, 32),
      type: String(item?.type || "virtual").slice(0, 32),
      address: String(item?.address || "10.0.0.2"),
      netmask: String(item?.netmask || "255.255.255.0"),
      gateway: item?.gateway ? String(item.gateway) : null,
      state: item?.state === "down" ? "down" : "up"
    };
  }

  async function get(id) {
    const pid = projectId(id);
    if (!pid) return null;

    const data = await window.ANZUBA_PROJECTS?.getData?.(pid);
    if (!data) return null;

    if (!data[NETWORK_KEY] || typeof data[NETWORK_KEY] !== "object") {
      const initial = clone(DEFAULT_NETWORK);
      await window.ANZUBA_PROJECTS.setData({ [NETWORK_KEY]: initial }, pid);
      return initial;
    }

    const stored = data[NETWORK_KEY];
    return {
      ...clone(DEFAULT_NETWORK),
      ...clone(stored),
      interfaces: Array.isArray(stored.interfaces)
        ? stored.interfaces.map(normalizeInterface)
        : clone(DEFAULT_NETWORK.interfaces),
      dns: Array.isArray(stored.dns) ? stored.dns.map(String) : clone(DEFAULT_NETWORK.dns),
      routes: Array.isArray(stored.routes) ? clone(stored.routes) : clone(DEFAULT_NETWORK.routes),
      online: stored.online !== false,
      networkAccess: stored.networkAccess === "blocked" ? "blocked" : "controlled"
    };
  }

  async function save(network, id) {
    const pid = projectId(id);
    if (!pid || !network) return false;

    const next = {
      ...clone(DEFAULT_NETWORK),
      ...clone(network),
      hostname: String(network.hostname || DEFAULT_NETWORK.hostname).slice(0, 63),
      interfaces: Array.isArray(network.interfaces)
        ? network.interfaces.map(normalizeInterface)
        : clone(DEFAULT_NETWORK.interfaces),
      updatedAt: new Date().toISOString()
    };

    await window.ANZUBA_PROJECTS.setData({ [NETWORK_KEY]: next }, pid);
    return true;
  }

  async function status(id) {
    return get(id);
  }

  async function setOnline(online, id) {
    const pid = projectId(id);
    const network = await get(pid);
    if (!network) return null;

    network.online = Boolean(online);
    network.interfaces = network.interfaces.map(item => ({
      ...item,
      state: network.online ? "up" : "down"
    }));

    await save(network, pid);
    window.dispatchEvent(new CustomEvent("anzuba:network-updated", {
      detail: { projectId: pid, network: clone(network) }
    }));
    return network;
  }

  async function setAccess(mode, id) {
    const pid = projectId(id);
    const network = await get(pid);
    if (!network) return null;

    if (mode !== "controlled" && mode !== "blocked") {
      throw new Error("Modo de rede inválido.");
    }

    network.networkAccess = mode;
    await save(network, pid);
    return network;
  }

  async function addInterface(item, id) {
    const pid = projectId(id);
    const network = await get(pid);
    if (!network) return null;

    const iface = normalizeInterface(item);
    if (!iface.name || !validIPv4(iface.address) || !validIPv4(iface.netmask)) {
      throw new Error("Interface de rede inválida.");
    }

    if (network.interfaces.some(existing => existing.name === iface.name)) {
      throw new Error("A interface já existe.");
    }

    network.interfaces.push(iface);
    await save(network, pid);
    return iface;
  }

  async function removeInterface(name, id) {
    const pid = projectId(id);
    const network = await get(pid);
    if (!network) return false;

    if (String(name) === "lo") return false;

    const before = network.interfaces.length;
    network.interfaces = network.interfaces.filter(item => item.name !== String(name));
    if (network.interfaces.length === before) return false;

    await save(network, pid);
    return true;
  }

  async function resolveHost(host, id) {
    const pid = projectId(id);
    const network = await get(pid);
    if (!network) return null;

    const value = String(host || "").trim().toLowerCase();
    if (!value) return null;

    if (!network.online || network.networkAccess === "blocked") {
      return { host: value, address: null, reachable: false, reason: "network-unavailable" };
    }

    if (value === "localhost" || value === network.hostname || value === network.hostname + "." + network.domain) {
      return { host: value, address: "127.0.0.1", reachable: true };
    }

    const iface = network.interfaces.find(item => item.state === "up" && item.name !== "lo");
    return {
      host: value,
      address: iface?.gateway || null,
      reachable: Boolean(iface)
    };
  }

  window.ANZUBA_NETWORK = {
    defaults: clone(DEFAULT_NETWORK),
    get,
    status,
    setOnline,
    setAccess,
    addInterface,
    removeInterface,
    resolveHost
  };

  window.ANZUBA_AI_BRIDGE?.on("network.status", ({ id } = {}) => status(id));
  window.ANZUBA_AI_BRIDGE?.on("network.online.set", ({ online, id } = {}) => setOnline(online, id));
  window.ANZUBA_AI_BRIDGE?.on("network.access.set", ({ mode, id } = {}) => setAccess(mode, id));
  window.ANZUBA_AI_BRIDGE?.on("network.interface.add", ({ interface: item, id } = {}) => addInterface(item, id));
  window.ANZUBA_AI_BRIDGE?.on("network.interface.remove", ({ name, id } = {}) => removeInterface(name, id));
  window.ANZUBA_AI_BRIDGE?.on("network.resolve", ({ host, id } = {}) => resolveHost(host, id));

  setTimeout(() => {
    const active = window.ANZUBA_PROJECTS?.getActive?.();
    if (active) get(active.id).catch(() => {});
  }, 0);
})();