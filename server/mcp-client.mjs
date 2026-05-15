import { readFile } from "node:fs/promises";

const DEFAULT_CONFIG = {
  enabled: false,
  name: "remote-mcp",
  baseUrl: "",
  transport: "streamable-http",
  mcpPath: "/mcp",
  ssePath: "/mcp/sse",
  messagesPath: "/mcp/messages",
  auth: {
    type: "none",
    token: "",
    headerName: "",
    headerValue: "",
  },
  toolMap: {},
};

function joinUrl(baseUrl, path) {
  if (!baseUrl) return "";
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function loadConfigFromFile(configPath) {
  if (!configPath) return null;
  try {
    const raw = await readFile(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function headersFromAuth(auth) {
  if (!auth || !auth.type || auth.type === "none") {
    return {};
  }

  if (auth.type === "bearer" && auth.token) {
    return { Authorization: `Bearer ${auth.token}` };
  }

  if (auth.type === "x-api-key" && auth.token) {
    return { "X-API-Key": auth.token };
  }

  if (auth.type === "header" && auth.headerName && auth.headerValue) {
    return { [auth.headerName]: auth.headerValue };
  }

  return {};
}

export async function loadMcpConfig() {
  const fileConfig = await loadConfigFromFile(process.env.MCP_CONFIG_PATH);
  const envConfig = {
    enabled: process.env.MCP_ENABLED === "true",
    name: process.env.MCP_NAME,
    baseUrl: process.env.MCP_BASE_URL,
    transport: process.env.MCP_TRANSPORT,
    mcpPath: process.env.MCP_PATH,
    ssePath: process.env.MCP_SSE_PATH,
    messagesPath: process.env.MCP_MESSAGES_PATH,
    auth: {
      type: process.env.MCP_AUTH_TYPE,
      token: process.env.MCP_AUTH_TOKEN,
      headerName: process.env.MCP_AUTH_HEADER_NAME,
      headerValue: process.env.MCP_AUTH_HEADER_VALUE,
    },
    toolMap: parseJsonSafe(process.env.MCP_TOOL_MAP) || undefined,
  };

  const merged = {
    ...DEFAULT_CONFIG,
    ...(fileConfig || {}),
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([, value]) => value !== undefined && value !== "")
    ),
  };

  merged.auth = {
    ...DEFAULT_CONFIG.auth,
    ...((fileConfig && fileConfig.auth) || {}),
    ...Object.fromEntries(
      Object.entries(envConfig.auth).filter(([, value]) => value !== undefined && value !== "")
    ),
  };

  merged.toolMap = {
    ...DEFAULT_CONFIG.toolMap,
    ...((fileConfig && fileConfig.toolMap) || {}),
    ...((envConfig.toolMap && typeof envConfig.toolMap === "object") ? envConfig.toolMap : {}),
  };

  merged.enabled = Boolean(merged.enabled && merged.baseUrl);

  return merged;
}

async function rpcRequest(url, authHeaders, method, params, sessionId) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders,
  };

  if (sessionId) {
    headers["MCP-Session-Id"] = sessionId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `MCP request failed: ${response.status}`);
  }

  if (data?.error?.message) {
    throw new Error(data.error.message);
  }

  return data?.result ?? data;
}

async function tryInitializeStreamable(config, authHeaders) {
  const endpoint = joinUrl(config.baseUrl, config.mcpPath);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "topstar-visit-agent",
          version: "0.1.0",
        },
      },
    }),
  });

  const sessionId = response.headers.get("mcp-session-id");
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || `MCP initialize failed: ${response.status}`);
  }

  return { sessionId, data };
}

function extractTextResult(result) {
  if (!result) return null;
  if (typeof result === "string") return result;
  if (Array.isArray(result.content)) {
    const text = result.content
      .filter((item) => item && item.type === "text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n");
    return text || null;
  }
  return null;
}

export class RemoteMcpClient {
  constructor(config) {
    this.config = config;
    this.authHeaders = headersFromAuth(config.auth);
    this.sessionId = null;
    this.cachedTools = null;
  }

  isEnabled() {
    return Boolean(this.config.enabled && this.config.baseUrl);
  }

  async ensureSession() {
    if (this.sessionId || this.config.transport !== "streamable-http") {
      return;
    }

    const initialized = await tryInitializeStreamable(this.config, this.authHeaders);
    this.sessionId = initialized.sessionId || null;
  }

  async health() {
    if (!this.isEnabled()) {
      return { ok: false, enabled: false };
    }

    const candidates = [
      joinUrl(this.config.baseUrl, "/mcp/health"),
      joinUrl(this.config.baseUrl, `${this.config.mcpPath}/health`),
    ];

    let lastError = null;
    for (const url of candidates) {
      try {
        const response = await fetch(url, {
          headers: this.authHeaders,
        });
        if (!response.ok) {
          lastError = `health ${response.status}`;
          continue;
        }
        const data = await response.json().catch(() => ({}));
        return { ok: true, url, data };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "health failed";
      }
    }

    return { ok: false, enabled: true, error: lastError || "health failed" };
  }

  async listTools() {
    if (!this.isEnabled()) {
      return [];
    }

    if (this.cachedTools) {
      return this.cachedTools;
    }

    try {
      if (this.config.transport === "streamable-http") {
        await this.ensureSession();
        const result = await rpcRequest(
          joinUrl(this.config.baseUrl, this.config.mcpPath),
          this.authHeaders,
          "tools/list",
          {},
          this.sessionId
        );
        this.cachedTools = Array.isArray(result?.tools) ? result.tools : [];
        return this.cachedTools;
      }

      const response = await fetch(joinUrl(this.config.baseUrl, "/mcp/tools"), {
        headers: this.authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      this.cachedTools = Array.isArray(data?.tools) ? data.tools : [];
      return this.cachedTools;
    } catch {
      this.cachedTools = [];
      return this.cachedTools;
    }
  }

  resolveRemoteTool(localToolName) {
    return this.config.toolMap?.[localToolName] || null;
  }

  async callMappedTool(localToolName, args) {
    if (!this.isEnabled()) {
      return { usedRemote: false, reason: "mcp_disabled" };
    }

    const remoteToolName = this.resolveRemoteTool(localToolName);
    if (!remoteToolName) {
      return { usedRemote: false, reason: "tool_not_mapped" };
    }

    const tools = await this.listTools();
    if (tools.length && !tools.find((tool) => tool.name === remoteToolName)) {
      return { usedRemote: false, reason: "remote_tool_not_found", remoteToolName };
    }

    try {
      let result;

      if (this.config.transport === "streamable-http") {
        await this.ensureSession();
        result = await rpcRequest(
          joinUrl(this.config.baseUrl, this.config.mcpPath),
          this.authHeaders,
          "tools/call",
          {
            name: remoteToolName,
            arguments: args || {},
          },
          this.sessionId
        );
      } else if (this.config.transport === "mcp-call") {
        const response = await fetch(joinUrl(this.config.baseUrl, "/mcp/call"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.authHeaders,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: {
              name: remoteToolName,
              arguments: args || {},
            },
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error?.message || `MCP call failed: ${response.status}`);
        }
        result = data?.result ?? data;
      } else if (this.config.transport === "simple-http") {
        const response = await fetch(
          joinUrl(this.config.baseUrl, `/mcp/tools/${remoteToolName}`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...this.authHeaders,
            },
            body: JSON.stringify(args || {}),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error?.message || `Simple MCP call failed: ${response.status}`);
        }
        result = data;
      } else {
        return { usedRemote: false, reason: "unsupported_transport" };
      }

      return {
        usedRemote: true,
        remoteToolName,
        raw: result,
        text: extractTextResult(result),
      };
    } catch (error) {
      return {
        usedRemote: false,
        reason: "remote_call_failed",
        remoteToolName,
        error: error instanceof Error ? error.message : "remote_call_failed",
      };
    }
  }
}
