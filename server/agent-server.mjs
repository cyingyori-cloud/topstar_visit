import 'dotenv/config';
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { RemoteMcpClient, loadMcpConfig } from "./mcp-client.mjs";
import { buildVisitCoachRuntimeGuide, hasVisitCoachSkillFile, shouldUseVisitCoach } from "./topstar-visit-coach.mjs";

// 加载知识库
const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR || "./knowledge";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "./server/artifacts";
const PUBLIC_AGENT_BASE_URL = (process.env.PUBLIC_AGENT_BASE_URL || process.env.RENDER_EXTERNAL_URL || "https://topstar-visit.onrender.com").replace(/\/$/, "");
let KNOWLEDGE_BASE = "";
let KNOWLEDGE_FILES = [];
let KNOWLEDGE_CHUNKS = [];

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenizeQuery(value) {
  return [...new Set(
    normalizeSearchText(value)
      .split(/[\s,，。；;、/|()（）【】\[\]:"“”'《》<>]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
  )];
}

function excerptText(value, limit = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function buildKnowledgeChunks(filename, content) {
  const title = filename.replace(/\.md$/i, "");
  const sections = String(content || "")
    .split(/\n(?=#{1,4}\s+)/g)
    .map((section) => section.trim())
    .filter(Boolean);
  const sourceSections = sections.length ? sections : [content];

  return sourceSections.map((section, index) => {
    const heading = section.match(/^#{1,4}\s+(.+)$/m)?.[1]?.trim() || title;
    return {
      id: `${filename}#${index + 1}`,
      filename,
      title,
      heading,
      content: section,
      searchText: normalizeSearchText(`${title} ${heading} ${section}`),
    };
  });
}

function searchKnowledgeChunks(query, limit = 6) {
  const tokens = tokenizeQuery(query);
  const normalizedQuery = normalizeSearchText(query);
  return KNOWLEDGE_CHUNKS
    .map((chunk) => {
      const exactScore = normalizedQuery && chunk.searchText.includes(normalizedQuery) ? 5 : 0;
      const tokenScore = tokens.reduce((score, token) => score + (chunk.searchText.includes(token) ? 1 : 0), 0);
      return { chunk, score: exactScore + tokenScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk }) => ({
      title: chunk.title,
      heading: chunk.heading,
      excerpt: excerptText(chunk.content, 700),
    }));
}

function loadKnowledgeBase() {
  try {
    const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
    const contents = files.map(file => {
      const content = readFileSync(`${KNOWLEDGE_DIR}/${file}`, "utf8");
      return `=== ${file.replace('.md', '')} ===\n\n${content}`;
    });
    KNOWLEDGE_BASE = contents.join('\n\n');
    KNOWLEDGE_FILES = files.map(file => ({
      name: file.replace('.md', ''),
      filename: file,
      size: readFileSync(`${KNOWLEDGE_DIR}/${file}`, "utf8").length,
    }));
    KNOWLEDGE_CHUNKS = files.flatMap((file) => {
      const content = readFileSync(`${KNOWLEDGE_DIR}/${file}`, "utf8");
      return buildKnowledgeChunks(file, content);
    });
    console.log(`[knowledge] Loaded ${files.length} knowledge files, total ${KNOWLEDGE_BASE.length} chars`);
  } catch (err) {
    console.log(`[knowledge] Could not load knowledge base: ${err.message}`);
    KNOWLEDGE_BASE = "";
    KNOWLEDGE_FILES = [];
    KNOWLEDGE_CHUNKS = [];
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
  {
    type: "function",
    name: "skill_creator",
    description:
      "设计新的 Agent Skill，包括用途、触发场景、输入参数、输出结构、执行流程和验收标准。用户要新增能力、创建 skill、扩展 agent 工具时使用。",
    parameters: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "要创建的 skill 名称。" },
        goal: { type: "string", description: "这个 skill 要解决的业务目标。" },
        triggerExamples: {
          type: "array",
          items: { type: "string" },
          description: "用户可能怎么触发这个 skill。",
        },
      },
      required: ["skillName", "goal"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "word_generator",
    description:
      "生成 Word 文档内容草稿和结构，例如拜访纪要、客户方案、商机推进报告、周报、会议纪要。用户要求生成 Word、docx、文档、报告时使用。",
    parameters: {
      type: "object",
      properties: {
        documentType: { type: "string", description: "文档类型，例如拜访纪要、客户方案、周报。" },
        customerId: { type: "string", description: "可选，关联客户ID。" },
        customerName: { type: "string", description: "可选，关联客户名称。" },
        topic: { type: "string", description: "文档主题。" },
      },
      required: ["documentType"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "pdf_generator",
    description:
      "生成适合导出为 PDF 的正式版内容结构，例如客户方案PDF、拜访报告PDF、管理汇报PDF。用户要求生成 PDF、正式报告、可归档材料时使用。",
    parameters: {
      type: "object",
      properties: {
        documentType: { type: "string", description: "PDF 类型，例如方案书、拜访报告、管理汇报。" },
        customerId: { type: "string", description: "可选，关联客户ID。" },
        customerName: { type: "string", description: "可选，关联客户名称。" },
        topic: { type: "string", description: "PDF主题。" },
      },
      required: ["documentType"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ppt_generator",
    description:
      "生成 PPT 演示稿大纲、页标题、每页要点、图表建议和讲述备注。用户要求生成 PPT、汇报材料、方案演示、拜访演示时使用。",
    parameters: {
      type: "object",
      properties: {
        deckType: { type: "string", description: "PPT 类型，例如客户方案、经营复盘、拜访汇报。" },
        customerId: { type: "string", description: "可选，关联客户ID。" },
        customerName: { type: "string", description: "可选，关联客户名称。" },
        audience: { type: "string", description: "听众对象，例如客户高层、内部主管、技术团队。" },
      },
      required: ["deckType"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "excel_generator",
    description:
      "生成 Excel 表格结构和数据字段，例如客户清单、拜访计划、商机台账、覆盖率报表、行动计划表。用户要求生成 Excel、表格、台账、清单时使用。",
    parameters: {
      type: "object",
      properties: {
        workbookType: { type: "string", description: "表格类型，例如拜访计划、商机台账、客户清单。" },
        scope: { type: "string", enum: ["current_rep", "selected_customer", "all_visible"], description: "数据范围。" },
        customerId: { type: "string", description: "可选，关联客户ID。" },
        customerName: { type: "string", description: "可选，关联客户名称。" },
      },
      required: ["workbookType"],
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
  const tokens = tokenizeQuery(args.query);

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

  const scoredChunks = searchKnowledgeChunks(args.query, 8).map((item) => ({
    source: item.title,
    heading: item.heading,
    excerpt: item.excerpt,
  }));

  return {
    query: args.query,
    category: args.category || null,
    matchedItems: matched.slice(0, 5),
    matchedKnowledgeBase: scoredChunks,
    total: matched.length + scoredChunks.length,
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
  });

  const primaryContact = Array.isArray(customer.keyContacts) ? customer.keyContacts[0] : null;

  return {
    found: true,
    customer,
    primaryContact,
    currentTask: tasks[0] || null,
    recentVisits: visits.slice(0, 3),
    matchedCases: cases,
    suggestedGoals: {
      bestActionCommitment: `推进 ${customer.currentOpportunity} 的下一次方案评审或关键人会面`,
      minimumActionCommitment: "确认客户最新需求、预算边界和时间表",
    },
    matchedKnowledge: [
      ...knowledge.matchedItems.slice(0, 3),
      ...knowledge.matchedKnowledgeBase.slice(0, 5),
    ],
  };
}

function buildBusinessContext(context, args = {}) {
  const customer = findCustomer(context, args.customerId, args.customerName);
  const tasks = customer ? getPendingTasksForCustomer(context, customer.id) : (context.filteredTasks || []);
  const visits = customer ? getCompletedVisitsForCustomer(context, customer.id) : (context.filteredCompletedVisits || []);
  return {
    rep: context.currentRep || null,
    customer,
    currentTask: tasks[0] || null,
    recentVisits: visits.slice(0, 5),
    coverage: context.filteredCoverage || null,
  };
}

function skillCreator(context, args) {
  const name = String(args.skillName || "").trim();
  const goal = String(args.goal || "").trim();
  const triggerExamples = Array.isArray(args.triggerExamples) ? args.triggerExamples : [];

  return {
    skillName: name,
    goal,
    recommendedToolName: name.startsWith("skill_") ? name : `skill_${name.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`,
    triggerExamples,
    suggestedSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "可选，关联客户ID。" },
        customerName: { type: "string", description: "可选，关联客户名称。" },
        topic: { type: "string", description: "任务主题或输出主题。" },
      },
      additionalProperties: false,
    },
    workflow: [
      "识别用户意图和业务对象",
      "读取当前销售、客户、商机、拜访任务和知识库上下文",
      "按固定结构生成可复用输出",
      "返回下一步动作和验收标准",
    ],
    acceptanceCriteria: [
      "能说明该 skill 何时触发",
      "能定义输入参数和输出结构",
      "能复用当前 CRM/拜访上下文",
      "回答不虚构落库或文件已生成",
    ],
  };
}

function sanitizeFilename(value, fallback = "topstar-document") {
  return String(value || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!amount) return "暂未明确";
  return `${amount.toLocaleString("zh-CN")} 万元`;
}

function buildWordSections(business, documentType) {
  const customer = business.customer || {};
  const task = business.currentTask || {};
  const visits = business.recentVisits || [];
  const primaryContact = Array.isArray(customer.keyContacts) ? customer.keyContacts[0] : null;

  return [
    {
      heading: "一、背景摘要",
      paragraphs: [
        `客户：${customer.name || "未指定客户"}；行业：${customer.industry || "未明确"}；区域：${customer.region || "未明确"}。`,
        `文档类型：${documentType || "业务文档"}；销售负责人：${business.rep?.name || "未指定"}。`,
      ],
    },
    {
      heading: "二、客户现状",
      paragraphs: [
        `客户等级：${customer.level || "未明确"}；关键联系人：${primaryContact ? `${primaryContact.name}（${primaryContact.title || "职务未填"}）` : "待补充"}。`,
        task.lastVisitSummary || customer.recentProgress || "需补充最近一次拜访情况、技术参数、客户反馈和内部决策链信息。",
      ],
    },
    {
      heading: "三、商机判断",
      paragraphs: [
        `当前商机：${customer.currentOpportunity || task.opportunityTopic || "待明确"}。`,
        `商机阶段：${customer.opportunityStage || "待确认"} ${customer.opportunityPercent ?? "?"}%；预计金额：${formatCurrency(customer.opportunityAmount)}。`,
        task.opportunityRisk ? `主要风险：${task.opportunityRisk}` : "主要风险：技术参数、评审节奏、预算边界和竞品策略仍需持续确认。",
      ],
    },
    {
      heading: "四、解决方案建议",
      paragraphs: [
        task.visitFocus || "围绕客户当前设备需求和产线痛点，输出设备配置、节拍、稳定性、交付保障和投资回报说明。",
        task.expectedCommitment || "建议争取客户确认技术评审时间、样板案例参访意愿和下一轮商务沟通窗口。",
      ],
    },
    {
      heading: "五、行动计划",
      paragraphs: [
        `下一步拜访：${task.dayLabel || "待排期"} ${task.visitTime || ""} ${task.location || ""}`.trim(),
        "内部动作：补齐技术参数、准备案例材料、明确报价策略，并推动技术/产品/交付资源参与关键节点。",
        visits.length
          ? `参考历史拜访：${visits.map((visit) => `${visit.visitDate || ""}${visit.summary ? ` ${visit.summary}` : ""}`.trim()).filter(Boolean).slice(0, 3).join("；")}`
          : "历史拜访：暂无可用记录，建议完成拜访后沉淀纪要。",
      ],
    },
  ];
}

function renderWordHtml({ title, documentType, business, sections }) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #1f2937; line-height: 1.65; }
    h1 { color: #17365d; font-size: 24px; border-bottom: 2px solid #17365d; padding-bottom: 8px; }
    h2 { color: #24486f; font-size: 17px; margin-top: 22px; }
    p { font-size: 12pt; margin: 6px 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 18px; }
    th, td { border: 1px solid #b8c7d9; padding: 8px; font-size: 11pt; text-align: left; }
    th { background: #eaf1f8; color: #17365d; }
    .meta { color: #4b5563; font-size: 10.5pt; margin-bottom: 18px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">生成时间：${escapeHtml(now)}｜文档类型：${escapeHtml(documentType || "Word 文档")}</p>
  <table>
    <tr><th>客户</th><td>${escapeHtml(business.customer?.name || "未指定")}</td><th>销售</th><td>${escapeHtml(business.rep?.name || "未指定")}</td></tr>
    <tr><th>商机</th><td>${escapeHtml(business.customer?.currentOpportunity || business.currentTask?.opportunityTopic || "待明确")}</td><th>阶段</th><td>${escapeHtml(`${business.customer?.opportunityStage || "待确认"} ${business.customer?.opportunityPercent ?? ""}%`)}</td></tr>
  </table>
  ${sections.map((section) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n")}
  `).join("\n")}
</body>
</html>`;
}

function renderMarkdownAsWordHtml({ title, documentType, markdownText }) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const lines = String(markdownText || "").split(/\r?\n/);
  const body = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "<p>&nbsp;</p>";
    if (trimmed.startsWith("### ")) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
    if (trimmed.startsWith("## ")) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith("# ")) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
    if (/^[-*]\s+/.test(trimmed)) return `<p>• ${escapeHtml(trimmed.replace(/^[-*]\s+/, ""))}</p>`;
    if (/^\d+\.\s+/.test(trimmed)) return `<p>${escapeHtml(trimmed)}</p>`;
    return `<p>${escapeHtml(trimmed)}</p>`;
  }).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #1f2937; line-height: 1.65; }
    h1 { color: #17365d; font-size: 24px; border-bottom: 2px solid #17365d; padding-bottom: 8px; }
    h2 { color: #24486f; font-size: 18px; margin-top: 22px; }
    h3 { color: #315f8f; font-size: 15px; margin-top: 16px; }
    p { font-size: 12pt; margin: 6px 0; }
    .meta { color: #4b5563; font-size: 10.5pt; margin-bottom: 18px; }
  </style>
</head>
<body>
  <p class="meta">生成时间：${escapeHtml(now)}｜文档类型：${escapeHtml(documentType || "Word 文档")}</p>
  ${body}
</body>
</html>`;
}

function renderWordMarkdown({ title, documentType, business, sections, artifact }) {
  const metaRows = [
    ["客户", business.customer?.name || "未指定"],
    ["销售", business.rep?.name || "未指定"],
    ["商机", business.customer?.currentOpportunity || business.currentTask?.opportunityTopic || "待明确"],
    ["阶段", `${business.customer?.opportunityStage || "待确认"} ${business.customer?.opportunityPercent ?? ""}%`],
  ];

  return [
    `已生成《${title}》Word 文档，下载文件正文与下方预览一致。`,
    "",
    `[点击下载 Word 文档：${artifact.filename}](${artifact.url})`,
    "",
    `## ${title}`,
    "",
    `文档类型：${documentType || "Word 文档"}`,
    "",
    "| 项目 | 内容 |",
    "| --- | --- |",
    ...metaRows.map(([label, value]) => `| ${label} | ${value} |`),
    "",
    ...sections.flatMap((section) => [
      `### ${section.heading}`,
      "",
      ...section.paragraphs.map((paragraph) => `- ${paragraph}`),
      "",
    ]),
  ].join("\n");
}

function createWordArtifact({ title, documentType, business, sections }) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filenameBase = sanitizeFilename(title);
  const filename = `${Date.now()}-${filenameBase}.doc`;
  const filePath = join(ARTIFACT_DIR, filename);
  writeFileSync(filePath, renderWordHtml({ title, documentType, business, sections }), "utf8");
  return {
    filename,
    url: `${PUBLIC_AGENT_BASE_URL}/artifacts/${encodeURIComponent(filename)}`,
    mimeType: "application/msword",
  };
}

function createWordArtifactFromMarkdown({ title, documentType, markdownText }) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filenameBase = sanitizeFilename(title);
  const filename = `${Date.now()}-${filenameBase}.doc`;
  const filePath = join(ARTIFACT_DIR, filename);
  writeFileSync(filePath, renderMarkdownAsWordHtml({ title, documentType, markdownText }), "utf8");
  return {
    filename,
    url: `${PUBLIC_AGENT_BASE_URL}/artifacts/${encodeURIComponent(filename)}`,
    mimeType: "application/msword",
  };
}

function wordGenerator(context, args) {
  const business = buildBusinessContext(context, args);
  const customer = business.customer;
  const title = args.topic || `${customer?.name || "客户"}${args.documentType}`;
  const sourceText = typeof context.lastAssistantText === "string" ? context.lastAssistantText.trim() : "";

  if (sourceText) {
    const artifact = createWordArtifactFromMarkdown({ title, documentType: args.documentType, markdownText: sourceText });
    return {
      format: "word",
      documentType: args.documentType,
      title,
      source: "last_assistant_text",
      artifact,
      markdownPreview: [
        `已按上一条对话内容生成《${title}》Word 文档，Word 正文与下方内容一致。`,
        "",
        `[点击下载 Word 文档：${artifact.filename}](${artifact.url})`,
        "",
        sourceText,
      ].join("\n"),
      exportSpec: {
        suggestedFilename: artifact.filename,
        downloadUrl: artifact.url,
        note: "已将上一条助手回复原文写入 Word 文件。",
      },
    };
  }

  const sections = buildWordSections(business, args.documentType);
  const artifact = createWordArtifact({ title, documentType: args.documentType, business, sections });
  const markdownPreview = renderWordMarkdown({
    title,
    documentType: args.documentType,
    business,
    sections,
    artifact,
  });

  return {
    format: "word",
    documentType: args.documentType,
    title,
    business,
    sections,
    artifact,
    markdownPreview,
    exportSpec: {
      suggestedFilename: artifact.filename,
      downloadUrl: artifact.url,
      note: "已生成可由 Word 打开的 .doc 文件，可点击下载。后续如接入 docx 渲染库可升级为原生 .docx。",
    },
  };
}

function pdfGenerator(context, args) {
  const business = buildBusinessContext(context, args);
  const customer = business.customer;
  const title = args.topic || `${customer?.name || "客户"}${args.documentType}`;

  return {
    format: "pdf",
    documentType: args.documentType,
    title,
    business,
    layout: {
      style: "正式归档版，A4纵向，商务蓝灰色标题，表格清晰可打印",
      cover: ["标题", "客户/区域", "销售负责人", "生成日期"],
      sections: ["结论摘要", "客户与商机概况", "关键证据", "风险与对策", "行动计划"],
    },
    exportSpec: {
      suggestedFilename: `${title}.pdf`,
      note: "当前工具返回适合 PDF 的正式内容结构，文件服务接入后可渲染为 PDF。",
    },
  };
}

function pptGenerator(context, args) {
  const business = buildBusinessContext(context, args);
  const customer = business.customer;
  const title = `${customer?.name || ""}${args.deckType}`.trim();

  return {
    format: "ppt",
    deckType: args.deckType,
    audience: args.audience || "业务评审对象",
    title,
    business,
    slides: [
      { title: "封面", points: [title, `面向：${args.audience || "业务评审对象"}`], visual: "客户名+商机阶段" },
      { title: "客户与商机概览", points: ["客户等级/行业/区域", "当前商机/金额/阶段", "关键联系人"], visual: "三栏信息卡" },
      { title: "当前问题与机会", points: ["客户痛点", "技术/商务卡点", "竞品风险"], visual: "问题矩阵" },
      { title: "方案与价值主张", points: ["方案方向", "提效/降本/质量价值", "标杆案例"], visual: "价值链路图" },
      { title: "推进计划", points: ["下一步会议", "客户承诺", "内部资源需求"], visual: "时间轴" },
    ],
    exportSpec: {
      suggestedFilename: `${title || "TopStar汇报"}.pptx`,
      note: "当前工具返回 PPT 大纲和每页内容建议，文件服务接入后可写出 pptx。",
    },
  };
}

function excelGenerator(context, args) {
  const scope = args.scope || "current_rep";
  const business = buildBusinessContext(context, args);
  const customers = scope === "selected_customer" && business.customer
    ? [business.customer]
    : (context.filteredCustomers || []);
  const tasks = scope === "selected_customer" && business.customer
    ? getPendingTasksForCustomer(context, business.customer.id)
    : (context.filteredTasks || []);

  return {
    format: "excel",
    workbookType: args.workbookType,
    scope,
    sheets: [
      {
        name: "客户清单",
        columns: ["客户名称", "等级", "行业", "区域", "当前商机", "商机金额", "商机阶段"],
        rows: customers.map((customer) => [
          customer.name,
          customer.level,
          customer.industry,
          customer.region,
          customer.currentOpportunity,
          customer.opportunityAmount,
          `${customer.opportunityStage} ${customer.opportunityPercent}%`,
        ]),
      },
      {
        name: "拜访计划",
        columns: ["客户名称", "拜访类型", "时间", "地点", "目标", "商机主题", "风险"],
        rows: tasks.map((task) => [
          task.customerName,
          task.visitType,
          `${task.dayLabel || ""} ${task.visitTime || ""}`.trim(),
          task.location,
          task.visitGoal,
          task.opportunityTopic || "",
          task.opportunityRisk || "",
        ]),
      },
    ],
    exportSpec: {
      suggestedFilename: `${args.workbookType}.xlsx`,
      note: "当前工具返回工作簿结构和行数据，文件服务接入后可写出 xlsx。",
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
    case "skill_creator":
      return skillCreator(context, args);
    case "word_generator":
      return wordGenerator(context, args);
    case "pdf_generator":
      return pdfGenerator(context, args);
    case "ppt_generator":
      return pptGenerator(context, args);
    case "excel_generator":
      return excelGenerator(context, args);
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

function extractLocalToolData(result) {
  if (!result || typeof result !== "object") return null;
  if (result.source === "local" && result.data) return result.data;
  return result.data || result.raw || null;
}

function getWordGeneratorPreview(result) {
  const data = extractLocalToolData(result);
  return typeof data?.markdownPreview === "string" && data.markdownPreview.trim()
    ? data.markdownPreview
    : null;
}

function shouldForceWordGeneration(message = "") {
  return /生成\s*word|导出\s*word|转\s*word|word\s*文档|生成\s*文档|导出\s*文档|docx?/i.test(String(message));
}

function shouldUseFastVisitPrep(body) {
  const message = String(body?.message || "");
  const context = body?.context || {};
  return Boolean(
    context.selectedCustomer &&
    /拜访|准备|打法|开场|必问|BAC|MAC|收官|明天能直接使用/i.test(message) &&
    !shouldForceWordGeneration(message)
  );
}

function buildVisitPrepCacheKey(body) {
  const context = body?.context || {};
  const customer = context.selectedCustomer;
  if (!customer) return null;
  const visits = Array.isArray(context.filteredCompletedVisits)
    ? context.filteredCompletedVisits
        .filter((visit) => visit.customerId === customer.id)
        .map((visit) => `${visit.visitDate}:${visit.summary}`)
        .slice(0, 3)
        .join("|")
    : "";
  const task = Array.isArray(context.filteredTasks)
    ? context.filteredTasks.find((item) => item.customerId === customer.id)
    : null;
  return [
    "visit-prep-v2",
    customer.id,
    customer.opportunityStage || "",
    customer.opportunityPercent ?? "",
    customer.currentOpportunity || "",
    task?.visitGoal || "",
    task?.expectedCommitment || "",
    visits,
  ].join("::");
}

function findCachedAnswer(body, cacheKey) {
  const caches = Array.isArray(body?.context?.customerAnswerCache) ? body.context.customerAnswerCache : [];
  const matched = caches.find((item) => item.cacheKey === cacheKey);
  if (!matched?.content) return null;
  const ageMs = Date.now() - new Date(matched.createdAt || 0).getTime();
  const maxAgeMs = 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs < maxAgeMs ? matched : null;
}

function pickFirstLine(value, fallback = "待确认") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 58 ? `${text.slice(0, 58)}...` : text;
}

function buildQuickVisitPrepSummary(body, fastPrep) {
  const context = body?.context || {};
  const customer = fastPrep?.compactContext?.customer || context.selectedCustomer || {};
  const task = fastPrep?.compactContext?.currentTask
    || (Array.isArray(context.filteredTasks)
      ? context.filteredTasks.find((item) => item.customerId === customer.id)
      : null);
  const contact = fastPrep?.compactContext?.primaryContact
    || (Array.isArray(customer.keyContacts) ? customer.keyContacts[0] : null);
  const visits = Array.isArray(fastPrep?.compactContext?.recentVisits)
    ? fastPrep.compactContext.recentVisits
    : [];
  const knowledge = [
    ...(Array.isArray(fastPrep?.compactContext?.matchedKnowledge) ? fastPrep.compactContext.matchedKnowledge : []),
    ...(Array.isArray(fastPrep?.compactContext?.knowledgeBase) ? fastPrep.compactContext.knowledgeBase : []),
  ].filter(Boolean);
  const knowledgeTitles = Array.from(new Set(knowledge
    .map((item) => item.title || item.source || item.heading)
    .filter(Boolean)))
    .slice(0, 3);
  const hasOpportunity = !/无商机|休眠|待确认/i.test(`${customer.currentOpportunity || ""} ${customer.opportunityStage || ""}`);
  const stage = `${customer.opportunityStage || "待确认"}${customer.opportunityPercent != null ? ` / ${customer.opportunityPercent}%` : ""}`;
  const bac = task?.expectedCommitment
    || fastPrep?.compactContext?.suggestedGoals?.bestActionCommitment
    || `推动 ${customer.currentOpportunity || "当前项目"} 进入下一次方案评审或关键人沟通`;
  const mac = fastPrep?.compactContext?.suggestedGoals?.minimumActionCommitment
    || "拿到客户最新需求、预算边界、决策链和下一次沟通窗口";
  const currentRisk = task?.opportunityRisk
    || (customer.opportunityStage?.includes("报") ? "方案价值和 ROI 需要被客户内部认可，否则容易停在评估环节" : "")
    || (customer.opportunityStage?.includes("定") ? "商务决策窗口已打开，重点是锁定采购流程、价格边界和签批路径" : "")
    || (hasOpportunity ? "需求存在但决策链、预算和时间表还没有完全闭环" : "当前还不能默认有明确商机，先验证真实痛点和立项可能性");

  return [
    "## 作战总览",
    "",
    `| 客户 | ${customer.name || "当前客户"}（${customer.level || "未知"}级 / ${customer.industry || "行业待确认"}） |`,
    "|---|---|",
    `| 当前商机 | ${customer.currentOpportunity || task?.opportunityTopic || "待确认"}；阶段：${stage} |`,
    `| 核心目标 | ${pickFirstLine(task?.visitGoal || body?.message, "确认客户当前需求强度、项目阶段和下一步推进窗口")} |`,
    `| 关键联系人 | ${contact ? `${contact.name}${contact.title ? `（${contact.title}）` : ""}` : "现场确认业务、技术、采购三类角色"} |`,
    "",
    "## 先抓 3 个重点",
    `1. **先验证卡点**：围绕“${customer.currentOpportunity || "当前自动化需求"}”确认产线痛点、节拍/良率/人力成本和改造边界。`,
    `2. **再要承诺**：BAC 是“${pickFirstLine(bac)}”；MAC 是“${pickFirstLine(mac)}”。`,
    `3. **重点防风险**：${pickFirstLine(currentRisk)}`,
    "",
    "## 必问三问",
    `- 现在这段工艺或产线最影响效率、良率、交付的指标是哪一个？有没有量化数据？`,
    `- 这个项目内部谁负责技术评估、预算判断和最终拍板？目前分别卡在哪一步？`,
    `- 如果我们补齐方案/ROI/案例材料，客户这边能否确认下一次评审时间和参与人？`,
    "",
    `**已先用到**：POCC 拜访准备；${knowledgeTitles.length ? `知识库《${knowledgeTitles.join("》《")}》` : "拓斯达行业知识库匹配中"}。完整打法还在生成，会继续补充开场话术、ROI/竞品切入和收官表达。`,
    visits[0]?.summary ? `\n> 最近拜访参考：${pickFirstLine(visits[0].summary, "")}` : "",
  ].filter(Boolean).join("\n");
}

function buildFastVisitPrepMessages(body, builtInstructions) {
  const context = body.context || {};
  const customer = context.selectedCustomer;
  const prep = executeLocalTool("skill_pocc_visit_prep", {
    customerId: customer?.id,
    customerName: customer?.name,
  }, context);
  const knowledge = executeLocalTool("skill_knowledge_lookup", {
    query: `${customer?.industry || ""} ${customer?.currentOpportunity || ""} ${customer?.opportunityStage || ""} ROI 竞品 话术 工艺 产品 价值`,
  }, context);

  const compactContext = {
    customer: prep.customer,
    primaryContact: prep.primaryContact,
    currentTask: prep.currentTask,
    recentVisits: prep.recentVisits,
    matchedCases: prep.matchedCases,
    matchedKnowledge: prep.matchedKnowledge,
    knowledgeBase: knowledge.matchedKnowledgeBase?.slice(0, 8),
    suggestedGoals: prep.suggestedGoals,
  };

  return {
    toolNames: ["skill_pocc_visit_prep", "skill_knowledge_lookup"],
    compactContext,
    messages: [
      { role: "system", content: builtInstructions.text },
      {
        role: "user",
        content: [
          "请基于以下已取好的客户、任务、知识库和 POCC 数据，直接生成销售拜访作战单。",
          "不要再要求补充信息，不要解释你有哪些功能。",
          "质量优先，速度次之。不要为了短而牺牲客户洞察、知识库依据和话术可用性。",
          "输出控制在 900-1300 字，必须让销售 15 秒内看懂重点，2 分钟内能照着执行。",
          "固定输出结构：## 作战总览；## 先抓 3 个重点；## 马上做什么；## 可复制话术；## 必问三问；## 价值/ROI/竞品切入；## 收官承诺；## 依据。",
          "作战总览必须用 4 行以内 Markdown 表格，包含客户、阶段、目标、风险。",
          "先抓 3 个重点必须是最关键判断，不要超过 3 条，每条不超过 35 个中文字符。",
          "马上做什么只给 3 个动作，每个动作必须有动词和交付物。",
          "可复制话术要给完整可说出口的话，不要只给标题。",
          "依据放最后，只列 skill、方法论和知识库主题，不要展开长解释。",
          "",
          JSON.stringify(compactContext),
          "",
          `原始销售请求：${body.message}`,
        ].join("\n"),
      },
    ],
  };
}

function inferWordArgs(body) {
  const context = body.context || {};
  const customer = context.selectedCustomer || (Array.isArray(context.filteredCustomers) ? context.filteredCustomers[0] : null);
  const message = String(body.message || "");
  const documentType = /纪要/.test(message)
    ? "拜访纪要"
    : /方案/.test(message)
      ? "客户方案"
      : /报告|汇报/.test(message)
        ? "业务报告"
        : "Word文档";

  return {
    documentType,
    customerId: customer?.id,
    customerName: customer?.name,
    topic: customer?.name ? `${customer.name}${documentType}` : documentType,
  };
}

function buildForcedWordResult(body, runtime, builtInstructions = { coachMeta: null }) {
  const result = executeLocalTool("word_generator", inferWordArgs(body), body.context || {});
  const wrapped = { source: "local", data: result };
  return {
    responseId: null,
    model: runtime.model,
    text: getWordGeneratorPreview(wrapped) || "Word 文档已生成，但没有成功生成预览。",
    toolCalls: ["word_generator"],
    quickActions: quickActionsForTools(["word_generator"]),
    coachMeta: builtInstructions.coachMeta || null,
    debugMeta: buildDebugMeta(runtime),
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

function shouldInjectKnowledgeBase(message = "") {
  return /知识库|话术|案例|行业|竞品|异议|方案库|成功案例|标杆|对比|know-?how|拜访|准备|pocc|BPIDC|N-SABE|LSCPA|开场|收官|价值|ROI|投资回报/i.test(String(message));
}

function instructionsForContext(context) {
  const knowledgeQuery = [
    context.userMessage,
    context.selectedCustomer?.industry,
    context.selectedCustomer?.currentOpportunity,
    context.selectedCustomer?.opportunityStage,
  ].filter(Boolean).join(" ");
  const matchedKnowledge = shouldInjectKnowledgeBase(context.userMessage || "")
    ? searchKnowledgeChunks(knowledgeQuery, 6)
    : [];
  const knowledgeSection = matchedKnowledge.length
    ? `\n\n## 拓斯达行业知识库命中片段\n\n以下是本轮问题检索到的相关知识片段，只使用这些片段作为知识库依据，不要假装读完整库：\n\n${matchedKnowledge.map((item, index) => `${index + 1}. 《${item.title}》/${item.heading}\n${item.excerpt}`).join("\n\n")}\n`
    : "";
  const customerMemory = Array.isArray(context.customerMemory) ? context.customerMemory : [];
  const memorySection = customerMemory.length
    ? `\n\n## 当前客户历史沉淀\n\n以下是销售手动沉淀的客户级备注，优先用于拜访准备、话术推荐、异议处理和下一步动作判断：\n\n${customerMemory.map((note, index) => `${index + 1}. ${note.content}`).join("\n")}\n`
    : "";

  return [
    "你是 TopStar 智能拜访助手的真实业务 Agent。",
    "你的用户是一线销售或销售管理者，不关心你有哪些功能，只关心下一次客户拜访怎么赢、怎么问、怎么说、怎么拿承诺。",
    `当前用户角色：${(context.currentRep || { name: "销售同事", role: "销售" }).name}（${(context.currentRep || { name: "销售同事", role: "销售" }).role}）。`,
    `当前页面：${context.activeNav || "拜访看板"}。`,
    context.selectedCustomer
      ? `当前重点客户：${context.selectedCustomer.name}，行业 ${context.selectedCustomer.industry}，当前商机 ${context.selectedCustomer.currentOpportunity}。`
      : "当前没有锁定重点客户。",
    "优先使用 tools 获取真实业务上下文，不要假设客户数据。",
    "回答要贴近一线销售拜访场景，默认使用中文。",
    "如果用户问具体客户、拜访频率、行业案例、话术、POCC 准备，请先调用对应 tool 再回答。",
    "当用户来自左侧拜访卡片或明确说准备拜访某客户时，必须优先调用 skill_pocc_visit_prep；必要时再调用 skill_knowledge_lookup 或 skill_industry_cases。",
    "当用户问拜访准备、话术、异议处理、竞品对比、行业洞察、ROI、产品方案时，必须把拓斯达知识库检索结果和 POCC 方法论结合起来输出。",
    "话术类输出优先给可复制表达，并按 PBC 开场、BPIDC 提问、N-SABE 价值呈现、LSCPA 异议处理、BAC/MAC 收官承诺组织。",
    "引用知识库内容时要说明来自哪类知识底座或文档主题，不要编造未在客户数据或知识库中出现的案例数字。",
    "如果存在当前客户历史沉淀，必须显式参考这些备注，并避免给出与客户已知偏好、痛点或风险相冲突的建议。",
    "所有业务回答都必须先输出“作战总览”或“重点速览”，把结论、风险和下一步动作放在最前面。不要一上来写长篇方法论。",
    "拜访准备类回答固定使用：1）作战总览；2）先抓 3 个重点；3）马上做什么；4）可复制话术；5）必问三问；6）价值/ROI/竞品切入；7）收官承诺；8）依据。",
    "作战总览必须用短表格或 3 条以内短句。马上做什么只给 3 个动作。可复制话术必须能直接对客户说。",
    "普通问答默认控制在 600 字以内；拜访准备/客户打法类回答控制在 900-1300 字，优先保证可执行性和扫读效率。",
    "每段尽量短，单条 bullet 控制在 35 个中文字符以内；避免大段连续文本。不要连续输出超过 4 条 bullet 后不分区。",
    "回答中必须明确标注：使用了哪个 skill、哪类知识库、哪套方法论；但这部分放在末尾，不要压过行动建议。",
    "如果用户要求生成 Word，先调用 word_generator；如果工具结果包含 exportSpec.downloadUrl 或 artifact.url，必须在回答里给出 Markdown 下载链接，并说明这是可由 Word 打开的 .doc 文件。",
    "如果用户要求生成 PDF/PPT/Excel，先调用对应 generator tool 获取结构化内容，再明确说明当前返回的是可导出内容草稿/结构，除非工具结果包含真实下载地址，不要声称已生成真实文件。",
    "如果用户要求新增 agent 能力或设计 skill，先调用 skill_creator 输出 skill 规格。",
    "输出风格：结论先行、行动优先、话术可复制、依据后置。",
    "不要声称已经写入 CRM 或创建了任务，除非工具结果明确说明已经落库。",
    knowledgeSection,
    memorySection,
  ].join("\n");
}

async function buildInstructions(body) {
  const base = instructionsForContext({
    ...(body.context || {}),
    userMessage: body.message || "",
  });
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

async function createOpenAIChatCompletionsStream(requestBody, runtime, onDelta) {
  const endpoint = resolveUpstreamEndpoint(runtime.baseUrl, "chat_completions");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeader(OPENAI_AUTH_HEADER_NAME, runtime.apiKey, OPENAI_AUTH_TOKEN_PREFIX),
      ...OPENAI_EXTRA_HEADERS,
    },
    body: JSON.stringify({ ...requestBody, stream: true }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || payload?.message || "OpenAI stream request failed";
    const error = new Error(`${message} [status=${response.status}]`);
    error.cause = { provider: "openai", endpoint, status: response.status, payload };
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("OpenAI stream response body is empty");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let id = null;
  let model = runtime.model;
  const toolCallsByIndex = new Map();

  function applyChunk(chunk) {
    if (chunk.id) id = chunk.id;
    if (chunk.model) model = chunk.model;
    const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : null;
    const delta = choice?.delta || {};

    if (typeof delta.content === "string" && delta.content) {
      content += delta.content;
      onDelta(delta.content);
    }

    if (Array.isArray(delta.tool_calls)) {
      for (const partial of delta.tool_calls) {
        const index = partial.index ?? 0;
        const current = toolCallsByIndex.get(index) || {
          id: partial.id || "",
          type: "function",
          function: { name: "", arguments: "" },
        };
        if (partial.id) current.id = partial.id;
        if (partial.type) current.type = partial.type;
        if (partial.function?.name) current.function.name += partial.function.name;
        if (partial.function?.arguments) current.function.arguments += partial.function.arguments;
        toolCallsByIndex.set(index, current);
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        const chunk = JSON.parse(data);
        applyChunk(chunk);
      }
    }
  }

  return {
    id,
    model,
    choices: [
      {
        message: {
          role: "assistant",
          content,
          tool_calls: [...toolCallsByIndex.values()].filter(call => call.function.name),
        },
      },
    ],
  };
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
    skill_creator: [
      { label: "生成 Skill 规格", icon: "🧩", action: "skill_spec" },
      { label: "补充触发样例", icon: "✨", action: "skill_examples" },
    ],
    word_generator: [
      { label: "生成 Word 报告", icon: "📄", action: "word_report" },
      { label: "转成正式纪要", icon: "📝", action: "word_minutes" },
    ],
    pdf_generator: [
      { label: "生成 PDF 版报告", icon: "📕", action: "pdf_report" },
      { label: "整理归档版", icon: "🗂️", action: "pdf_archive" },
    ],
    ppt_generator: [
      { label: "生成 PPT 大纲", icon: "📊", action: "ppt_outline" },
      { label: "补充演讲备注", icon: "🎙️", action: "ppt_notes" },
    ],
    excel_generator: [
      { label: "生成 Excel 台账", icon: "📈", action: "excel_workbook" },
      { label: "导出拜访计划表", icon: "📋", action: "visit_plan_sheet" },
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
  if (shouldForceWordGeneration(body.message)) {
    return buildForcedWordResult(body, runtime, builtInstructions);
  }

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
    let wordPreview = null;

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
        if (call.name === "word_generator") {
          wordPreview = getWordGeneratorPreview(result) || wordPreview;
        }
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
      text: wordPreview || extractAnthropicText(response) || "我拿到了数据，但这次没有成功整理成回答。请再试一次。",
      toolCalls: [...new Set(toolNames)],
      quickActions: quickActionsForTools(toolNames),
      coachMeta: builtInstructions.coachMeta,
      debugMeta: buildDebugMeta(runtime),
    };
  }

  if (runtime.apiMode === "chat_completions") {
    let response = await createOpenAIResponse(buildInitialRequest(requestBody), runtime);
    const toolNames = [];
    let wordPreview = null;
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
        if (call.name === "word_generator") {
          wordPreview = getWordGeneratorPreview(result) || wordPreview;
        }
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
      text: wordPreview || extractChatCompletionsText(response) || "我拿到了数据，但这次没有成功整理成回答。请再试一次。",
      toolCalls: [...new Set(toolNames)],
      quickActions: quickActionsForTools(toolNames),
      coachMeta: builtInstructions.coachMeta,
      debugMeta: buildDebugMeta(runtime),
    };
  }

  let response = await createOpenAIResponse(buildInitialRequest(requestBody), runtime);
  const toolNames = [];
  let wordPreview = null;

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
      if (call.name === "word_generator") {
        wordPreview = getWordGeneratorPreview(result) || wordPreview;
      }
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
    text: wordPreview || extractResponseText(response) || "我拿到了数据，但这次没有成功整理成回答。请再试一次。",
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
  res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`);
}

// 流式 Agent：每一步都实时推送思考过程
async function runAgentStream(body, runtime, res) {
  const builtInstructions = await buildInstructions(body);
  if (shouldForceWordGeneration(body.message)) {
    sendEvent(res, "thinking", { text: "正在生成 Word 文档..." });
    const result = buildForcedWordResult(body, runtime, builtInstructions);
    sendEvent(res, "tool", { name: "word_generator", result });
    sendEvent(res, "done", { text: result.text });
    res.end();
    return;
  }

  if (runtime.provider === "anthropic") {
    let messages = [{ role: "user", content: body.message }];
    let wordPreview = null;

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
        if (call.name === "word_generator") {
          wordPreview = getWordGeneratorPreview(result) || wordPreview;
        }
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

    const finalText = wordPreview || extractAnthropicText(response) || "处理完成";
    sendEvent(res, "done", { text: finalText });
    res.end();
    return;
  }

  if (runtime.apiMode === "chat_completions") {
    const fastPrep = shouldUseFastVisitPrep(body)
      ? buildFastVisitPrepMessages(body, builtInstructions)
      : null;
    const fastPrepCacheKey = fastPrep ? buildVisitPrepCacheKey(body) : null;
    const cachedAnswer = fastPrepCacheKey ? findCachedAnswer(body, fastPrepCacheKey) : null;
    const baseMessages = fastPrep?.messages || [
      { role: "system", content: builtInstructions.text },
      { role: "user", content: body.message },
    ];
    let wordPreview = null;

    sendEvent(res, "thinking", { text: "正在分析您的问题..." });
    if (fastPrep) {
      if (cachedAnswer) {
        sendEvent(res, "thinking", { text: "命中同客户同商机缓存，直接读取上次作战单..." });
        sendEvent(res, "done", {
          text: cachedAnswer.content,
          cacheMeta: { cacheKey: fastPrepCacheKey, hit: true },
        });
        res.end();
        return;
      }
      sendEvent(res, "thinking", { text: "读取当前客户画像和拜访任务..." });
      for (const name of fastPrep.toolNames) {
        sendEvent(res, "tool", { name, result: { source: "local_prefetch" } });
      }
      sendEvent(res, "thinking", { text: "匹配行业知识库、ROI/竞品/工艺话术..." });
      sendEvent(res, "thinking", { text: "套用 POCC，组织 BAC/MAC 和必问三问..." });
      sendEvent(res, "interim", {
        label: "快速作战摘要",
        text: buildQuickVisitPrepSummary(body, fastPrep),
      });
      sendEvent(res, "thinking", { text: "正在整合成可直接使用的拜访作战单..." });
    }
    let response = await createOpenAIChatCompletionsStream({
      model: runtime.model,
      messages: baseMessages,
      tools: fastPrep ? undefined : TOOL_DEFINITIONS.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: fastPrep ? undefined : "auto",
      temperature: 0.3,
    }, runtime, (delta) => sendEvent(res, "delta", { text: delta }));

    if (fastPrep) {
      const finalText = extractChatCompletionsText(response) || "处理完成";
      sendEvent(res, "done", {
        text: finalText,
        cacheMeta: { cacheKey: fastPrepCacheKey, hit: false },
      });
      res.end();
      return;
    }

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
        if (call.name === "word_generator") {
          wordPreview = getWordGeneratorPreview(result) || wordPreview;
        }
        sendEvent(res, "tool", { name: call.name, result });
        baseMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      sendEvent(res, "thinking", { text: "处理工具结果中..." });
      response = await createOpenAIChatCompletionsStream({
        model: runtime.model,
        messages: baseMessages,
        tools: TOOL_DEFINITIONS.map(tool => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice: "auto",
        temperature: 0.3,
      }, runtime, (delta) => sendEvent(res, "delta", { text: delta }));
    }

    const finalText = wordPreview || extractChatCompletionsText(response) || "处理完成";
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
  let wordPreview = null;

  for (let round = 0; round < 6; round++) {
    const functionCalls = extractFunctionCalls(response);
    if (!functionCalls.length) break;

    const outputs = [];
    for (const call of functionCalls) {
      sendEvent(res, "thinking", { text: `调用工具 ${call.name}...` });
      let args = {};
      try { args = JSON.parse(call.arguments); } catch {}
      const result = await executeTool(call.name, args, body.context || {});
      if (call.name === "word_generator") {
        wordPreview = getWordGeneratorPreview(result) || wordPreview;
      }
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

  const finalText = wordPreview || extractResponseText(response) || "处理完成";
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

  if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/artifacts/")) {
    const filename = basename(decodeURIComponent(req.url.slice("/artifacts/".length)));
    const filePath = join(ARTIFACT_DIR, filename);
    if (!existsSync(filePath)) {
      sendJson(res, 404, { error: "Artifact not found" });
      return;
    }

    setCors(res);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/msword; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    if (req.method === "HEAD") {
      res.end();
      return;
    }

    res.end(readFileSync(filePath));
    return;
  }

  // 知识库 API
  if (req.method === "GET" && req.url === "/api/knowledge") {
    sendJson(res, 200, {
      files: KNOWLEDGE_FILES,
      totalChunks: KNOWLEDGE_CHUNKS.length,
    });
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/api/knowledge/search")) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const query = requestUrl.searchParams.get("q") || "";
    const results = searchKnowledgeChunks(query, 20).map((item) => ({
      source: item.title,
      heading: item.heading,
      excerpt: item.excerpt,
    }));

    sendJson(res, 200, {
      query,
      total: results.length,
      results,
    });
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/api/knowledge/")) {
    const filename = req.url.slice("/api/knowledge/".length);
    try {
      const content = readFileSync(`${KNOWLEDGE_DIR}/${decodeURIComponent(filename)}.md`, "utf8");
      sendJson(res, 200, {
        name: filename,
        content,
      });
    } catch {
      sendJson(res, 404, { error: "Knowledge file not found" });
    }
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

const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`[topstar-agent] listening on http://${HOST}:${PORT}`);
});
