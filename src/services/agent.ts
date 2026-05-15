import type { CompletedVisit, CoverageData, Customer, KnowledgeItem, VisitTask } from "../data/mockData";
import type { SalesRep } from "../data/roles";
import type { ScriptRule, TierRule } from "../data/skills";

export interface AgentQuickAction {
  label: string;
  icon: string;
  action: string;
}

export interface IndustryCase {
  industry: string;
  product: string;
  customer: string;
  amount: number;
  result: string;
}

export interface AgentContextPayload {
  currentDate: string;
  currentRep: SalesRep;
  activeNav: string;
  selectedCustomerId: string | null;
  selectedCustomer: Customer | null;
  filteredCustomers: Customer[];
  filteredTasks: VisitTask[];
  filteredCompletedVisits: CompletedVisit[];
  filteredCoverage: CoverageData;
  filteredKnowledge: KnowledgeItem[];
  tierRules: TierRule[];
  industryCases: IndustryCase[];
  scriptRules: ScriptRule[];
}

export interface AgentRuntimeConfig {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  apiMode?: string;
}

export interface AgentConnectionTestResponse {
  ok: boolean;
  provider: string;
  model: string;
  endpoint: string;
  apiMode: string;
  error?: string | null;
}

export interface AgentChatResponse {
  responseId: string | null;
  model: string;
  text: string;
  toolCalls: string[];
  quickActions: AgentQuickAction[];
  coachMeta?: {
    role?: string | null;
    mode?: string | null;
    dataLevel?: string | null;
    customerName?: string | null;
    repName?: string | null;
  } | null;
  debugMeta?: {
    provider?: string;
    model?: string;
    apiMode?: string;
    endpoint?: string;
    authHeader?: string;
  } | null;
}

interface AgentChatRequest {
  message: string;
  previousResponseId: string | null;
  context: AgentContextPayload;
  runtimeConfig?: AgentRuntimeConfig | null;
}

function getAgentBaseUrl() {
  const envBase = import.meta.env.VITE_AGENT_BASE_URL;
  if (envBase) return envBase;
  return "http://127.0.0.1:8788";
}

export async function sendAgentChat(payload: AgentChatRequest): Promise<AgentChatResponse> {
  const response = await fetch(`${getAgentBaseUrl()}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : `Agent request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    responseId: typeof data.responseId === "string" ? data.responseId : null,
    model: typeof data.model === "string" ? data.model : "unknown",
    text: typeof data.text === "string" ? data.text : "",
    toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
    quickActions: Array.isArray(data.quickActions) ? data.quickActions : [],
    coachMeta: data && typeof data === "object" ? (data.coachMeta ?? null) : null,
    debugMeta: data && typeof data === "object" ? (data.debugMeta ?? null) : null,
  };
}

export async function testAgentConnection(runtimeConfig: AgentRuntimeConfig): Promise<AgentConnectionTestResponse> {
  const response = await fetch(`${getAgentBaseUrl()}/api/agent/test-connection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ runtimeConfig }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      provider: runtimeConfig.provider,
      model: runtimeConfig.model,
      endpoint: runtimeConfig.baseUrl,
      apiMode: runtimeConfig.apiMode || 'unknown',
      error: typeof data?.error === 'string' ? data.error : `连接测试失败（${response.status}）`,
    };
  }

  return {
    ok: Boolean(data?.ok),
    provider: typeof data?.provider === 'string' ? data.provider : runtimeConfig.provider,
    model: typeof data?.model === 'string' ? data.model : runtimeConfig.model,
    endpoint: typeof data?.endpoint === 'string' ? data.endpoint : runtimeConfig.baseUrl,
    apiMode: typeof data?.apiMode === 'string' ? data.apiMode : (runtimeConfig.apiMode || 'unknown'),
    error: typeof data?.error === 'string' ? data.error : null,
  };
}
