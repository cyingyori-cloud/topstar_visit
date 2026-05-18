import 'dotenv/config';
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { RemoteMcpClient, loadMcpConfig } from "./mcp-client.mjs";
import { buildVisitCoachRuntimeGuide, hasVisitCoachSkillFile, shouldUseVisitCoach } from "./topstar-visit-coach.mjs";

// 加载知识库
const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR || "./knowledge";
let KNOWLEDGE_BASE = "";

function loadKnowledgeBase() {
  try {
    const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
    const contents = files.map(file => {
      const content = readFileSync(`${KNOWLEDGE_DIR}/${file}`, "utf8");
      return `=== ${file.replace('.md', '')} ===\n\n${content}`;
    });
    KNOWLEDGE_BASE = contents.join('\n\n');
    console.log(`[knowledge] Loaded ${files.length} knowledge files, total ${KNOWLEDGE_BASE.length} chars`);
  } catch (err) {
    console.log(`[knowledge] Could not load knowledge base: ${err.message}`);
    KNOWLEDGE_BASE = "";
  }
}

loadKnowledgeBase();

const PORT = Number(process.env.PORT || 8788);
const MODEL_PROVIDER = process.env.MODEL_PROVIDER || (process.env.ANTHROPIC_AUTH_TOKEN ? "anthropic" : "openai");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || process.env.OPENAI_MODEL || "claude-opus-4-7";
const MODEL = MODEL_PROVIDER === "anthropic" ? ANTHROPIC_MODEL : OPENAI_MODEL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_API_MODE = process.env.OPENAI_API_MODE || (
  /\/chat\/completions\/?$/.test(OPENAI_BASE_URL) ? "chat_completions" : "responses"
);
const OPENAI_ENDPOINT_OVERRIDE = process.env.OPENAI_ENDPOINT_OVERRIDE || "";
const OPENAI_AUTH_HEADER_NAME = process.env.OPENAI_AUTH_HEADER_NAME || "Authorization";
const OPENAI_AUTH_TOKEN_PREFIX = process.env.OPENAI_AUTH_TOKEN_PREFIX || "Bearer";
const OPENAI_EXTRA_HEADERS = parseJsonObject(process.env.OPENAI_EXTRA_HEADERS);
const ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";
const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 2048);
const ANTHROPIC_ENDPOINT_OVERRIDE = process.env.ANTHROPIC_ENDPOINT_OVERRIDE || "";
const ANTHROPIC_AUTH_HEADER_NAME = process.env.ANTHROPIC_AUTH_HEADER_NAME || "x-api-key";
const ANTHROPIC_AUTH_TOKEN_PREFIX = process.env.ANTHROPIC_AUTH_TOKEN_PREFIX || "";
const ANTHROPIC_EXTRA_HEADERS = parseJsonObject(process.env.ANTHROPIC_EXTRA_HEADERS);
const MCP_CONFIG = await loadMcpConfig();
const remoteMcpClient = new RemoteMcpClient(MCP_CONFIG);

const DEFAULT_QUICK_ACTIONS = [
  { label: "本周拜访概览", icon: "📋", action: "weekly_overview" },
  { label: "拜访频率检查", icon: "📊", action: "check_frequency" },
  { label: "行业案例匹配", icon: "📂", action: "industry_cases" },
  { label: "话术推荐", icon: "🗣️", action: "script_recommend" },
];

const TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "skill_visit_board_summary",
    description:
      "查看当前销售视角下的拜访看板摘要、今日/本周任务、已完成拜访和覆盖率情况。用户问本周安排、看板概览、完成情况、覆盖率时使用。",
    parameters: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          enum: ["today", "week", "completed", "coverage"],
          description: "想重点看的板块。",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "skill_customer_snapshot",
    description:
      "查询某个客户的客户画像、联系人、商机、待办任务和历史拜访。用户点客户卡片、问某客户情况、要跟进建议时使用。",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "客户ID，已知时优先传。" },
        customerName: { type: "string", description: "客户名称或简称。" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "skill_visit_frequency",
    description:
      "按 SABC 规则分析拜访频率、超期天数和预警。用户问拜访频率、到期、超期、需优先拜访客户时使用。",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "可选，分析单个客户。" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "skill_industry_cases",
    description:
      "匹配行业案例、成功案例和相似客户。用户问行业案例、标杆案例、案例故事时使用。",
    parameters: {
      type: "object",
      properties: {
        industry: { type: "string", description: "行业名称。" },
        customerId: { type: "string", description: "可选，按客户自动取行业。" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "skill_knowledge_lookup",
    description:
      "从知识库中检索话术、异议处理、竞品分析和成功案例。用户点击知识卡片、要求展开某条知识、或问推荐话术时使用。",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "检索关键词。" },
        category: { type: "string", description: "可选分类。" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "skill_pocc_visit_prep",
    description:
      "基于客户、案例和知识库生成 POCC/拜访准备建议。用户问怎么准备拜访、需要话术、要下次跟进计划时使用。",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "客户ID，已知时优先传。" },
        customerName: { type: "string", description: "客户名称或简称。" },
      },
      additionalProperties: false,
    },
  },
];

function resolveProviderRuntime(body) {
  const runtimeConfig = body?.runtimeConfig || {};
  const provider = runtimeConfig.provider || MODEL_PROVIDER;
  const isAnthropic = provider === "Anthropic" || provider === "anthropic";

  return {
    provider: isAnthropic ? "anthropic" : "openai",
    model: runtimeConfig.model || (isAnthropic ? ANTHROPIC_MODEL : OPENAI_MODEL),
    baseUrl: runtimeConfig.baseUrl || (isAnthropic ? ANTHROPIC_BASE_URL : OPENAI_BASE_URL),
    apiKey: runtimeConfig.apiKey || (isAnthropic ? ANTHROPIC_AUTH_TOKEN : OPENAI_API_KEY),
    apiMode: runtimeConfig.apiMode || (isAnthropic ? "messages" : OPENAI_API_MODE),
  };
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(res, statusCode, body) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function isGpt5Family(model) {
  return /^gpt-5/i.test(model);
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildAuthHeader(name, token, prefix) {
  if (!token) return {};
  if (!name) return {};
  const trimmedPrefix = String(prefix || "").trim();
  const headerValue = trimmedPrefix ? `${trimmedPrefix} ${token}` : token;
  return {
    [name]: headerValue,
  };
}

function resolveUpstreamEndpoint(baseUrl, mode) {
  if (OPENAI_ENDPOINT_OVERRIDE) {
    return OPENAI_ENDPOINT_OVERRIDE.trim();
  }
  const normalized = stripTrailingSlash(baseUrl);
  const hasVersionSuffix = /\/v\d+$/i.test(normalized);

  if (mode === "chat_completions") {
    if (/\/chat\/completions$/i.test(normalized)) {
      return normalized;
    }
    if (hasVersionSuffix) {
      return `${normalized}/chat/completions`;
    }
    return `${normalized}/v1/chat/completions`;
  }

  if (/\/responses$/i.test(normalized)) {
    return normalized;
  }
  if (hasVersionSuffix) {
    return `${normalized}/responses`;
  }
  return `${normalized}/v1/responses`;
}

function resolveAnthropicEndpoint(baseUrl) {
  if (ANTHROPIC_ENDPOINT_OVERRIDE) {
    return ANTHROPIC_ENDPOINT_OVERRIDE.trim();
  }
  const normalized = stripTrailingSlash(baseUrl);
  const hasVersionSuffix = /\/v\d+$/i.test(normalized);
  if (/\/messages$/i.test(normalized)) {
    return normalized;
  }
  if (hasVersionSuffix) {
    return `${normalized}/messages`;
  }
  return `${normalized}/v1/messages`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function findCustomer(context, customerId, customerName) {
  const customers = Array.isArray(context.filteredCustomers) ? context.filteredCustomers : [];
  if (customerId) {
    const byId = customers.find((item) => item.id === customerId);
    if (byId) return byId;
  }

  if (customerName) {
    const keyword = normalizeText(customerName);
    return (
      customers.find((item) => normalizeText(item.name).includes(keyword)) ||
      customers.find((item) => keyword.includes(normalizeText(item.name)))
    );
  }

  return context.selectedCustomer || null;
}

function getCompletedVisitsForCustomer(context, customerId) {
  const visits = Array.isArray(context.filteredCompletedVisits) ? context.filteredCompletedVisits : [];
  return visits
    .filter((visit) => visit.customerId === customerId)
    .sort((a, b) => String(b.visitDate).localeCompare(String(a.visitDate)));
}

function getPendingTasksForCustomer(context, customerId) {
  const tasks = Array.isArray(context.filteredTasks) ? context.filteredTasks : [];
  return tasks.filter((task) => task.customerId === customerId);
}

function getTierRule(context, tier) {
  const rules = Array.isArray(context.tierRules) ? context.tierRules : [];
  return rules.find((rule) => rule.tier === tier) || null;
}

function diffDays(dateA, dateB) {
  const left = new Date(dateA);
  const right = new Date(dateB);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
    return null;
  }
  return Math.floor((left.getTime() - right.getTime()) / 86400000);
}

function summarizeVisitBoard(context, args) {
  const focus = args.focus || "week";
  const tasks = Array.isArray(context.filteredTasks) ? context.filteredTasks : [];
  const completedVisits = Array.isArray(context.filteredCompletedVisits) ? context.filteredCompletedVisits : [];
  const coverage = context.filteredCoverage || { total: 0, covered: 0, byLevel: [], uncoveredHighPriority: [] };
  const todayTasks = tasks.filter((task) => task.dayLabel === "今天");

  return {
    focus,
    rep: context.currentRep,
    summary: {
      totalTasks: tasks.length,
      todayTasks: todayTasks.length,
      completedVisits: completedVisits.length,
      overallCoverageRate:
        coverage.total > 0 ? Math.round((coverage.covered / coverage.total) * 100) : 0,
    },
    todayTasks,
    weeklyTasks: tasks,
    recentCompletedVisits: completedVisits.slice(0, 5),
    coverage,
  };
}

function customerSnapshot(context, args) {
  const customer = findCustomer(context, args.customerId, args.customerName);
  if (!customer) {
    return { found: false, message: "未找到匹配客户。" };
  }

  const visits = getCompletedVisitsForCustomer(context, customer.id);
  const tasks = getPendingTasksForCustomer(context, customer.id);
  const knowledgeItems = (Array.isArray(context.filteredKnowledge) ? context.filteredKnowledge : [])
    .filter((item) => {
      const title = normalizeText(item.title);
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => normalizeText(tag)) : [];
      return (
        title.includes(normalizeText(customer.industry)) ||
        tags.includes(normalizeText(customer.industry)) ||
        (Array.isArray(item.applicableIndustries) &&
          item.applicableIndustries.some((industry) => industry === customer.industry))
      );
    })
    .slice(0, 5);

  return {
    found: true,
    customer,
    pendingTasks: tasks,
    recentVisits: visits.slice(0, 5),
    recommendedKnowledge: knowledgeItems,
  };
}

function visitFrequency(context, args) {
  const now = context.currentDate || new Date().toISOString().slice(0, 10);
  const customers = Array.isArray(context.filteredCustomers) ? context.filteredCustomers : [];
  const focusCustomer = findCustomer(context, args.customerId);
  const targetCustomers = focusCustomer ? [focusCustomer] : customers;

  const analysis = targetCustomers.map((customer) => {
    const visits = getCompletedVisitsForCustomer(context, customer.id);
    const rule = getTierRule(context, customer.level);
    const lastVisit = visits[0] || null;
    const daysSinceLastVisit = lastVisit ? diffDays(now, lastVisit.visitDate) : null;
    const overdueDays = rule?.overdueDays || null;
    const isOverdue =
      typeof overdueDays === "number" && typeof daysSinceLastVisit === "number"
        ? daysSinceLastVisit > overdueDays
        : false;
    const isCritical =
      typeof overdueDays === "number" && typeof daysSinceLastVisit === "number"
        ? daysSinceLastVisit > overdueDays * 2
        : false;

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerLevel: customer.level,
      lastVisitDate: lastVisit?.visitDate || null,
      daysSinceLastVisit,
      overdueDays,
      isOverdue,
      isCritical,
      nextAction: isCritical
        ? "48小时内优先安排上门拜访"
        : isOverdue
          ? "本周内完成跟进或拜访"
          : "频率合规，保持当前节奏",
    };
  });

  return {
    currentDate: now,
    focusCustomer: focusCustomer ? focusCustomer.name : null,
    analysis,
    uncoveredHighPriority: context.filteredCoverage?.uncoveredHighPriority || [],
  };
}

function industryCases(context, args) {
  const cases = Array.isArray(context.industryCases) ? context.industryCases : [];
  const customer = findCustomer(context, args.customerId);
  const industry = args.industry || customer?.industry || "";

  const matched = industry
    ? cases.filter((item) => item.industry === industry || String(item.result).includes(industry))
    : cases.slice(0, 6);

  return {
    industry: industry || null,
    matchedCases: matched.slice(0, 6),
    matchedCount: matched.length,
  };
}

function knowledgeLookup(context, args) {
  const query = normalizeText(args.query);
  const items = Array.isArray(context.filteredKnowledge) ? context.filteredKnowledge : [];
  const category = args.category ? normalizeText(args.category) : null;

  const matched = items.filter((item) => {
    const text = [
      item.title,
      item.category,
      item.content,
      ...(Array.isArray(item.tags) ? item.tags : []),
      ...(Array.isArray(item.applicableIndustries) ? item.applicableIndustries : []),
    ]
      .join(" ")
      .toLowerCase();

    const categoryMatch = category ? normalizeText(item.category) === category : true;
    return categoryMatch && text.includes(query);
  });

  return {
    query: args.query,
    category: args.category || null,
    matchedItems: matched.slice(0, 5),
    total: matched.length,
  };
}

function poccVisitPrep(context, args) {
  const customer = findCustomer(context, args.customerId, args.customerName);
  if (!customer) {
    return { found: false, message: "未找到匹配客户，无法生成拜访准备建议。" };
  }

  const visits = getCompletedVisitsForCustomer(context, customer.id);
  const tasks = getPendingTasksForCustomer(context, customer.id);
  const cases = industryCases(context, { industry: customer.industry }).matchedCases.slice(0, 3);
  const knowledge = knowledgeLookup(context, {
    query: `${customer.industry} ${customer.currentOpportunity} ${customer.opportunityStage}`,
  }).matchedItems.slice(0, 5);

  const primaryContact = Array.isArray(customer.keyContacts) ? customer.keyContacts[0] : null;

  return {
    found: true,
    customer,
    primaryContact,
    currentTask: tasks[0] || null,
    recentVisits: visits.slice(0, 3),
    matchedCases: cases,
    matchedKnowledge: knowledge,
    suggestedGoals: {
      bestActionCommitment: `推进 ${customer.currentOpportunity} 的下一次方案评审或关键人会面`,
      minimumActionCommitment: "确认客户最新需求、预算边界和时间表",
    },
  };
}

function executeLocalTool(name, args, context) {
  switch (name) {
    case "skill_visit_board_summary":
      return summarizeVisitBoard(context, args);
    case "skill_customer_snapshot":
      return customerSnapshot(context, args);
    case "skill_visit_frequency":
      return visitFrequency(context, args);
    case "skill_industry_cases":
      return industryCases(context, args);
    case "skill_knowledge_lookup":
      return knowledgeLookup(context, args);
    case "skill_pocc_visit_prep":
      return poccVisitPrep(context, args);
    default:
      return { ok: false, message: `Unknown tool: ${name}` };
  }
}

async function executeTool(name, args, context) {
  const remoteResult = await remoteMcpClient.callMappedTool(name, args);
  if (remoteResult.usedRemote) {
    return {
      source: "remote_mcp",
      remoteToolName: remoteResult.remoteToolName,
      text: remoteResult.text,
      raw: remoteResult.raw,
    };
  }

  const local = executeLocalTool(name, args, context);
  return {
    source: "local",
    fallbackReason: remoteResult.reason || "no_remote_mapping",
    remoteError: remoteResult.error || null,
    data: local,
  };
}

function extractResponseText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const chunks = [];

  for (const item of output) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
      if (content.type === "text" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function extractFunctionCalls(response) {
  const output = Array.isArray(response.output) ? response.output : [];
  return output.filter((item) => item.type === "function_call");
}

function instructionsForContext(context) {
  const knowledgeSection = KNOWLEDGE_BASE
    ? `\n\n## 拓斯达行业知识库\n\n以下是拓斯达销售必须掌握的行业Know-How，在回答客户问题、推荐话术、分析竞品时，请优先使用这些知识：\n\n${KNOWLEDGE_BASE}\n`
    : "";

  return [
    "你是 TopStar 智能拜访助手的真实业务 Agent。",
    `当前用户角色：${(context.currentRep || { name: "销售同事", role: "销售" }).name}（${(context.currentRep || { name: "销售同事", role: "销售" }).role}）。`,
    `当前页面：${context.activeNav || "拜访看板"}。`,
    context.selectedCustomer
      ? `当前重点客户：${context.selectedCustomer.name}，行业 ${context.selectedCustomer.industry}，当前商机 ${context.selectedCustomer.currentOpportunity}。`
      : "当前没有锁定重点客户。",
    "优先使用 tools 获取真实业务上下文，不要假设客户数据。",
    "回答要贴近一线销售拜访场景，默认使用中文。",
    "如果用户问具体客户、拜访频率、行业案例、话术、POCC 准备，请先调用对应 tool 再回答。",
    "输出风格：先给结论，再给 3-5 条可执行建议；必要时用表格。",
    "不要声称已经写入 CRM 或创建了任务，除非工具结果明确说明已经落库。",
    knowledgeSection,
  ].join("\n");
}

async function buildInstructions(body) {
  const base = instructionsForContext(body.context || {});
  if (!shouldUseVisitCoach(body.message, body.context || {})) {
    return {
      text: base,
      coachMeta: null,
    };
  }

  const runtimeGuide = buildVisitCoachRuntimeGuide(body.message, body.context || {});
  const context = body.context || {};
  const currentRep = context.currentRep || { name: "销售同事", role: "销售" };
  const selectedCustomer = context.selectedCustomer;

  return {
    text: [
      base,
      "",
      "以下内容来自已接入的本地销售拜访教练 skill，请在本轮严格遵循。",
      runtimeGuide.prompt,
    ].join("\n"),
    coachMeta: {
      role: runtimeGuide.role,
      mode: runtimeGuide.mode,
      dataLevel: runtimeGuide.dataLevel,
      customerName: selectedCustomer?.name || null,
      repName: currentRep?.name || null,
    },
  };
}

function buildInitialRequest(body) {
  const runtime = resolveProviderRuntime(body);

  if (runtime.provider === "anthropic") {
    return {
      model: runtime.model,
      system: body.instructionsText,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      temperature: 0.3,
      messages: body.messagesOverride || [
        {
          role: "user",
          content: body.message,
        },
      ],
      tools: TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      })),
    };
  }

  const instructionText = body.instructionsText;

  if (runtime.apiMode === "chat_completions") {
    return {
      model: runtime.model,
      messages: [
        {
          role: "system",
          content: instructionText,
        },
        {
          role: "user",
          content: body.message,
        },
      ],
      tools: TOOL_DEFINITIONS.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: "auto",
      temperature: 0.3,
    };
  }

  const request = {
    model: runtime.model,
    instructions: instructionText,
    input: body.message,
    tools: TOOL_DEFINITIONS,
    store: true,
  };

  if (body.previousResponseId) {
    request.previous_response_id = body.previousResponseId;
  }

  if (isGpt5Family(MODEL)) {
    request.reasoning = { effort: "medium" };
    request.text = { verbosity: "low" };
  }

  return request;
}

async function createOpenAIResponse(requestBody, runtime) {
  const endpoint = resolveUpstreamEndpoint(runtime.baseUrl, runtime.apiMode);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeader(OPENAI_AUTH_HEADER_NAME, runtime.apiKey, OPENAI_AUTH_TOKEN_PREFIX),
      ...OPENAI_EXTRA_HEADERS,
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "OpenAI request failed";
    const error = new Error(`${message} [status=${response.status}]`);
    error.cause = {
      provider: "openai",
      endpoint,
      status: response.status,
      payload,
    };
    throw error;
  }

  return payload;
}

async function createAnthropicResponse(requestBody, runtime) {
  const endpoint = resolveAnthropicEndpoint(runtime.baseUrl);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
      ...buildAuthHeader(ANTHROPIC_AUTH_HEADER_NAME, runtime.apiKey, ANTHROPIC_AUTH_TOKEN_PREFIX),
      ...ANTHROPIC_EXTRA_HEADERS,
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "Anthropic request failed";
    const error = new Error(`${message} [status=${response.status}]`);
    error.cause = {
      provider: "anthropic",
      endpoint,
      status: response.status,
      payload,
    };
    throw error;
  }

  return payload;
}

function extractAnthropicText(response) {
  const content = Array.isArray(response?.content) ? response.content : [];
  return content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function extractAnthropicToolUses(response) {
  const content = Array.isArray(response?.content) ? response.content : [];
  return content
    .filter((item) => item?.type === "tool_use" && item?.name)
    .map((item) => ({
      id: item.id,
      name: item.name,
      input: item.input || {},
    }));
}

function extractChatCompletionsText(response) {
  const choice = Array.isArray(response?.choices) ? response.choices[0] : null;
  const message = choice?.message;
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text") return item.text || "";
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function extractChatCompletionsToolCalls(response) {
  const choice = Array.isArray(response?.choices) ? response.choices[0] : null;
  const calls = choice?.message?.tool_calls;
  if (!Array.isArray(calls)) return [];
  return calls
    .filter((call) => call?.type === "function" && call.function?.name)
    .map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments || "{}",
    }));
}

function quickActionsForTools(toolNames) {
  if (!toolNames.length) {
    return DEFAULT_QUICK_ACTIONS;
  }

  const map = {
    skill_visit_board_summary: [
      { label: "本周拜访概览", icon: "📋", action: "weekly_overview" },
      { label: "覆盖率统计", icon: "📊", action: "coverage_overview" },
    ],
    skill_customer_snapshot: [
      { label: "准备这次拜访", icon: "📋", action: "prepare_visit" },
      { label: "推荐跟进策略", icon: "🎯", action: "follow_up" },
    ],
    skill_visit_frequency: [
      { label: "安排超期拜访", icon: "📅", action: "schedule_overdue" },
      { label: "查看高优先客户", icon: "⚠️", action: "priority_customers" },
    ],
    skill_industry_cases: [
      { label: "展开标杆案例", icon: "⭐", action: "expand_case" },
      { label: "生成 STAR-R 话术", icon: "🗣️", action: "starr_script" },
    ],
    skill_knowledge_lookup: [
      { label: "展开这条话术", icon: "📖", action: "expand_knowledge" },
      { label: "推荐异议处理", icon: "💬", action: "objection_handling" },
    ],
    skill_pocc_visit_prep: [
      { label: "生成拜访提纲", icon: "📝", action: "visit_outline" },
      { label: "模拟开场话术", icon: "🎤", action: "opening_script" },
    ],
  };

  const actions = [];
  for (const name of toolNames) {
    const candidates = map[name] || [];
    for (const action of candidates) {
      if (!actions.find((item) => item.label === action.label)) {
        actions.push(action);
      }
    }
  }

  return actions.slice(0, 4);
}

async function runAgent(body) {
  const runtime = resolveProviderRuntime(body);
  const builtInstructions = await buildInstructions(body);
  const requestBody = {
    ...body,
    instructionsText: builtInstructions.text,
  };

  if (runtime.provider === "anthropic") {
    let messages = [
      {
        role: "user",
        content: body.message,
      },
    ];
    let response = await createAnthropicResponse(
      buildInitialRequest({
        ...requestBody,
        messagesOverride: messages,
      }),
      runtime
    );
    const toolNames = [];

    for (let round = 0; round < 6; round += 1) {
      const toolUses = extractAnthropicToolUses(response);
      if (!toolUses.length) {
        break;
      }

      messages = [
        ...messages,
        {
          role: "assistant",
          content: response.content,
        },
      ];

      const toolResults = [];

      for (const call of toolUses) {
        toolNames.push(call.name);
        const result = await executeTool(call.name, call.input, body.context || {});
        toolResults.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        {
          role: "user",
          content: toolResults,
        },
      ];

      response = await createAnthropicResponse(
        buildInitialRequest({
          ...requestBody,
          messagesOverride: messages,
        }),
        runtime
      );
    }

    return {
      responseId: response.id || null,
      model: response.model || runtime.model,
      text: extractAnthropicText(response) || "我拿到了数据，但这次没有成功整理成回答。请再试一次。",
      toolCalls: [...new Set(toolNames)],
      quickActions: quickActionsForTools(toolNames),
      coachMeta: builtInstructions.coachMeta,
      debugMeta: buildDebugMeta(runtime),
    };
  }

  if (runtime.apiMode === "chat_completions") {
    let response = await createOpenAIResponse(buildInitialRequest(requestBody), runtime);
    const toolNames = [];
    const baseMessages = buildInitialRequest(requestBody).messages;

    for (let round = 0; round < 6; round += 1) {
      const functionCalls = extractChatCompletionsToolCalls(response);
      if (!functionCalls.length) {
        break;
      }

      const assistantMessage = Array.isArray(response?.choices)
        ? response.choices[0]?.message
        : null;

      baseMessages.push({
        role: "assistant",
        content: assistantMessage?.content || "",
        tool_calls: functionCalls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: call.arguments,
          },
        })),
      });

      for (const call of functionCalls) {
        let args = {};
        try {
          args = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          args = {};
        }

        toolNames.push(call.name);
        const result = await executeTool(call.name, args, body.context || {});
        baseMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      response = await createOpenAIResponse({
        model: runtime.model,
        messages: baseMessages,
        tools: TOOL_DEFINITIONS.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice: "auto",
        temperature: 0.3,
      }, runtime);
    }

    return {
      responseId: response.id || null,
      model: response.model || runtime.model,
      text: extractChatCompletionsText(response) || "我拿到了数据，但这次没有成功整理成回答。请再试一次。",
      toolCalls: [...new Set(toolNames)],
      quickActions: quickActionsForTools(toolNames),
      coachMeta: builtInstructions.coachMeta,
      debugMeta: buildDebugMeta(runtime),
    };
  }

  let response = await createOpenAIResponse(buildInitialRequest(requestBody), runtime);
  const toolNames = [];

  for (let round = 0; round < 6; round += 1) {
    const functionCalls = extractFunctionCalls(response);
    if (!functionCalls.length) {
      break;
    }

    const outputs = [];

    for (const call of functionCalls) {
      let args = {};
      try {
        args = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        args = {};
      }

      toolNames.push(call.name);
        const result = await executeTool(call.name, args, body.context || {});
      outputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }

    response = await createOpenAIResponse({
      model: runtime.model,
      previous_response_id: response.id,
      input: outputs,
      ...(isGpt5Family(MODEL)
        ? {
            reasoning: { effort: "medium" },
            text: { verbosity: "low" },
          }
        : {}),
    }, runtime);
  }

  return {
    responseId: response.id || null,
    model: runtime.model,
    text: extractResponseText(response) || "我拿到了数据，但这次没有成功整理成回答。请再试一次。",
    toolCalls: [...new Set(toolNames)],
    quickActions: quickActionsForTools(toolNames),
    coachMeta: builtInstructions.coachMeta,
    debugMeta: buildDebugMeta(runtime),
  };
}

function buildDebugMeta(runtime) {
  return {
    provider: runtime.provider,
    model: runtime.model,
    apiMode: runtime.provider === "anthropic" ? "messages" : runtime.apiMode,
    endpoint: runtime.provider === "anthropic"
      ? resolveAnthropicEndpoint(runtime.baseUrl)
      : resolveUpstreamEndpoint(runtime.baseUrl, runtime.apiMode),
    authHeader: runtime.provider === "anthropic" ? ANTHROPIC_AUTH_HEADER_NAME : OPENAI_AUTH_HEADER_NAME,
  };
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// 流式 Agent：每一步都实时推送思考过程
async function runAgentStream(body, runtime, res) {
  const builtInstructions = await buildInstructions(body);

  if (runtime.provider === "anthropic") {
    let messages = [{ role: "user", content: body.message }];

    sendEvent(res, "thinking", { text: "正在分析您的问题..." });
    let response = await createAnthropicResponse(buildInitialRequest({
      ...body,
      instructionsText: builtInstructions.text,
      messagesOverride: messages,
    }), runtime);

    for (let round = 0; round < 6; round++) {
      const toolUses = extractAnthropicToolUses(response);
      if (!toolUses.length) break;

      messages.push({ role: "assistant", content: response.content });

      for (const call of toolUses) {
        sendEvent(res, "thinking", { text: `调用工具 ${call.name}...` });
        const result = await executeTool(call.name, call.input, body.context || {});
        sendEvent(res, "tool", { name: call.name, result });
        messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(result) }],
        });
      }

      sendEvent(res, "thinking", { text: "处理工具结果中..." });
      response = await createAnthropicResponse(buildInitialRequest({
        ...body,
        instructionsText: builtInstructions.text,
        messagesOverride: messages,
      }), runtime);
    }

    const finalText = extractAnthropicText(response) || "处理完成";
    sendEvent(res, "done", { text: finalText });
    res.end();
    return;
  }

  if (runtime.apiMode === "chat_completions") {
    const baseMessages = [
      { role: "system", content: builtInstructions.text },
      { role: "user", content: body.message },
    ];

    sendEvent(res, "thinking", { text: "正在分析您的问题..." });
    let response = await createOpenAIResponse({
      model: runtime.model,
      messages: baseMessages,
      tools: TOOL_DEFINITIONS.map(tool => ({ type: "function", function: tool })),
      tool_choice: "auto",
      temperature: 0.3,
    }, runtime);

    for (let round = 0; round < 6; round++) {
      const functionCalls = extractChatCompletionsToolCalls(response);
      if (!functionCalls.length) break;

      const assistantMsg = response.choices?.[0]?.message;
      baseMessages.push({
        role: "assistant",
        content: assistantMsg?.content || "",
        tool_calls: functionCalls.map(call => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments },
        })),
      });

      for (const call of functionCalls) {
        sendEvent(res, "thinking", { text: `调用工具 ${call.name}...` });
        let args = {};
        try { args = JSON.parse(call.arguments); } catch {}
        const result = await executeTool(call.name, args, body.context || {});
        sendEvent(res, "tool", { name: call.name, result });
        baseMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      sendEvent(res, "thinking", { text: "处理工具结果中..." });
      response = await createOpenAIResponse({
        model: runtime.model,
        messages: baseMessages,
        tools: TOOL_DEFINITIONS.map(tool => ({ type: "function", function: tool })),
        tool_choice: "auto",
        temperature: 0.3,
      }, runtime);
    }

    const finalText = extractChatCompletionsText(response) || "处理完成";
    sendEvent(res, "done", { text: finalText });
    res.end();
    return;
  }

  // Responses API 流式
  sendEvent(res, "thinking", { text: "正在分析您的问题..." });
  let response = await createOpenAIResponse(buildInitialRequest({
    ...body,
    instructionsText: builtInstructions.text,
  }), runtime);

  for (let round = 0; round < 6; round++) {
    const functionCalls = extractFunctionCalls(response);
    if (!functionCalls.length) break;

    const outputs = [];
    for (const call of functionCalls) {
      sendEvent(res, "thinking", { text: `调用工具 ${call.name}...` });
      let args = {};
      try { args = JSON.parse(call.arguments); } catch {}
      const result = await executeTool(call.name, args, body.context || {});
      sendEvent(res, "tool", { name: call.name, result });
      outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }

    sendEvent(res, "thinking", { text: "处理工具结果中..." });
    response = await createOpenAIResponse({
      model: runtime.model,
      previous_response_id: response.id,
      input: outputs,
      ...(isGpt5Family(MODEL) ? { reasoning: { effort: "medium" }, text: { verbosity: "low" } } : {}),
    }, runtime);
  }

  const finalText = extractResponseText(response) || "处理完成";
  sendEvent(res, "done", { text: finalText });
  res.end();
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "OPTIONS") {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      configured: MODEL_PROVIDER === "anthropic" ? Boolean(ANTHROPIC_AUTH_TOKEN) : Boolean(OPENAI_API_KEY),
      provider: MODEL_PROVIDER,
      model: MODEL,
      apiMode: MODEL_PROVIDER === "anthropic" ? "messages" : OPENAI_API_MODE,
      baseUrl: MODEL_PROVIDER === "anthropic" ? ANTHROPIC_BASE_URL : OPENAI_BASE_URL,
      visitCoachSkill: await hasVisitCoachSkillFile(),
      port: PORT,
      mcp: {
        enabled: remoteMcpClient.isEnabled(),
        transport: MCP_CONFIG.transport,
        baseUrl: MCP_CONFIG.baseUrl || null,
        mappedTools: Object.keys(MCP_CONFIG.toolMap || {}),
      },
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/agent/test-connection") {
    const requestBody = await readJsonBody(req);
    const runtime = resolveProviderRuntime(requestBody);
    if (!runtime.apiKey) {
      sendJson(res, 400, {
        ok: false,
        provider: runtime.provider,
        model: runtime.model,
        endpoint: runtime.baseUrl,
        apiMode: runtime.apiMode,
        error: "缺少 API Key",
      });
      return;
    }

    try {
      if (runtime.provider === "anthropic") {
        await createAnthropicResponse(buildInitialRequest({
          message: "ping",
          instructionsText: "You are a connectivity probe. Reply briefly.",
          messagesOverride: [{ role: "user", content: "ping" }],
        }), runtime);
      } else if (runtime.apiMode === "chat_completions") {
        await createOpenAIResponse(buildInitialRequest({
          message: "ping",
          instructionsText: "You are a connectivity probe. Reply briefly.",
        }), runtime);
      } else {
        await createOpenAIResponse({
          model: runtime.model,
          input: "ping",
        }, runtime);
      }

      sendJson(res, 200, {
        ok: true,
        provider: runtime.provider,
        model: runtime.model,
        endpoint: runtime.provider === "anthropic"
          ? resolveAnthropicEndpoint(runtime.baseUrl)
          : resolveUpstreamEndpoint(runtime.baseUrl, runtime.apiMode),
        apiMode: runtime.provider === "anthropic" ? "messages" : runtime.apiMode,
      });
      return;
    } catch (error) {
      const cause = error instanceof Error ? error.cause : null;
      sendJson(res, 500, {
        ok: false,
        provider: runtime.provider,
        model: runtime.model,
        endpoint: runtime.provider === "anthropic"
          ? resolveAnthropicEndpoint(runtime.baseUrl)
          : resolveUpstreamEndpoint(runtime.baseUrl, runtime.apiMode),
        apiMode: runtime.provider === "anthropic" ? "messages" : runtime.apiMode,
        error: error instanceof Error ? error.message : "连接测试失败",
        debug: cause && typeof cause === "object" ? cause : null,
      });
      return;
    }
  }

  if (req.method === "POST" && req.url === "/api/agent/chat") {
    const requestBody = await readJsonBody(req);
    const runtime = resolveProviderRuntime(requestBody);
    const hasCredentials = Boolean(runtime.apiKey);
    if (!hasCredentials) {
      sendJson(res, 503, {
        error: runtime.provider === "anthropic" ? "ANTHROPIC_AUTH_TOKEN is not set" : "OPENAI_API_KEY is not set",
        configured: false,
      });
      return;
    }

    try {
      if (!requestBody?.message || typeof requestBody.message !== "string") {
        sendJson(res, 400, { error: "message is required" });
        return;
      }

      // 支持流式输出
      const wantStream = requestBody.stream === true;
      if (wantStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 200;

        runAgentStream(requestBody, runtime, res).catch(err => {
          res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        });
        return;
      }

      const result = await runAgent(requestBody);
      sendJson(res, 200, result);
      return;
    } catch (error) {
      const cause = error instanceof Error ? error.cause : null;
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Unknown server error",
        debug: cause && typeof cause === "object" ? cause : null,
      });
      return;
    }
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[topstar-agent] listening on http://127.0.0.1:${PORT}`);
});
