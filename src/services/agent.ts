import type { CompletedVisit, CoverageData, Customer, KnowledgeItem, VisitTask } from "../data/mockData";
import type { SalesRep } from "../data/roles";
import type { ScriptRule, TierRule } from "../data/skills";
import type { CustomerMemoryNote } from "../utils/agentMemory";

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
  lastAssistantText?: string | null;
  selectedCustomerId: string | null;
  selectedCustomer: Customer | null;
  filteredCustomers: Customer[];
  filteredTasks: VisitTask[];
  filteredCompletedVisits: CompletedVisit[];
  filteredCoverage: CoverageData;
  filteredKnowledge: KnowledgeItem[];
  customerMemory: CustomerMemoryNote[];
  savedAnswerCount: number;
  answerFeedbackSummary: {
    useful: number;
    notUseful: number;
  };
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

// 流式事件回调
export type StreamCallback = (event: string, data: any) => void;

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

// 流式发送消息（实时显示思考过程）
export async function sendAgentChatStream(
  payload: AgentChatRequest,
  onThinking: (text: string) => void,
  onToolCall: (name: string, result: any) => void,
  onDelta: (text: string) => void,
  onDone: (text: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const baseUrl = getAgentBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, stream: true }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      onError(data?.error || "请求失败");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback: 如果不支持流式，使用普通响应
      const data = await response.json();
      onDone(data.text || "");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // 按双换行分割事件
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        const lines = eventBlock.split('\n');
        let eventType = '';
        let dataContent = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataContent = line.slice(6);
          }
        }

        if (dataContent) {
          try {
            const parsed = JSON.parse(dataContent);
            if (eventType === 'thinking') {
              onThinking(parsed.text || '');
            } else if (eventType === 'tool') {
              onToolCall(parsed.name || '', parsed.result);
            } else if (eventType === 'delta') {
              onDelta(parsed.text || '');
            } else if (eventType === 'done') {
              onDone(parsed.text || '');
            }
          } catch {}
        }
      }
    }
  } catch (err: any) {
    onError(err.message || "连接失败");
  }
}
