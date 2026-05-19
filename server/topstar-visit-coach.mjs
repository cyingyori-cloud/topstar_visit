import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_SKILL_PATH = resolve(__dirname, "../skills/topstar-visit-coach/SKILL.md");
const LEGACY_LOCAL_SKILL_PATH = "/Users/cying/Documents/kiro/topstar-visit-coach/SKILL.md";
const SKILL_PATH = process.env.TOPSTAR_VISIT_COACH_SKILL_PATH
  || (existsSync(PROJECT_SKILL_PATH) ? PROJECT_SKILL_PATH : LEGACY_LOCAL_SKILL_PATH);

const DIRECT_TRIGGER_KEYWORDS = [
  "拜访",
  "客户拜访",
  "拜访准备",
  "拜访计划",
  "准备拜访",
  "话术",
  "开场白",
  "怎么跟客户聊",
  "怎么说",
  "怎么开口",
  "沟通技巧",
  "拜访演练",
  "模拟演练",
  "红蓝对抗",
  "角色扮演",
  "情景演练",
];

const CONTEXT_TRIGGER_KEYWORDS = [
  "见客户",
  "去客户那里",
  "下周要去",
  "明天要见",
  "约了客户",
  "拜访复盘",
  "拜访总结",
  "今天见了",
  "刚见完客户",
  "拜访反馈",
];

const KNOWN_CUSTOMER_KEYWORDS = [
  "欣旺达",
  "德赛",
  "宁德时代",
  "立讯精密",
  "比亚迪",
  "美的",
  "富士康",
  "蓝思科技",
  "伯恩光学",
  "领益智造",
  "歌尔股份",
  "瑞声科技",
  "舜宇光学",
  "长盈精密",
  "信维通信",
  "东山精密",
  "鹏鼎控股",
  "国轩高科",
  "亿纬锂能",
  "中创新航",
  "蜂巢能源",
  "孚能科技",
];

const ROLE_HINTS = {
  rookie: ["我是新人", "刚入职", "第一次拜访", "详细一点", "解释一下", "什么是"],
  veteran: ["按资深销售", "简洁点", "直接给结论", "跳过基础", "BAC", "MAC", "BPIDC", "N-SABE"],
  manager: ["我是销售经理", "团队视角", "帮我团队", "批量准备", "下属", "辅导", "绩效"],
};

const MODE_HINTS = {
  full_preparation: ["完整准备", "详细", "全面", "仔细准备", "全面准备", "完整版"],
  quick_brief: ["快速", "简单", "5分钟", "10分钟", "简要", "要点", "简洁点", "快速版"],
  instant_lookup: ["现在就要", "马上见", "速查", "立刻", "紧急", "马上要用"],
  post_review: ["刚见完", "复盘", "总结", "回顾", "拜访完了", "回顾拜访"],
  team_drill: ["演练", "模拟", "红蓝", "角色扮演", "练习", "模拟客户"],
};

let cachedSkillText = null;

const RUNTIME_METHOD_GUIDE = [
  "你现在扮演拓斯达销售拜访智能教练，基于 POCC（Prepare-Open-Consult-Close）和赢单五步法工作。",
  "POCC 四阶段必须体现在输出里：P 用于规划和准备，O 用于建立信任，C 用于咨询式沟通，C 用于收官和承诺闭环。",
  "咨询环节优先使用 BPIDC 提问链；价值呈现优先使用 N-SABE；顾虑处理优先使用 LSCPA；案例表达优先使用 STAR-R。",
  "所有输出都要从客户痛点和业务价值出发，尽量量化 ROI、效率、良率、人工替代和回报周期。",
  "不要替客户下诊断，要用开放问题引导客户自己暴露痛点。",
];

const RUNTIME_COLLECTION_GUIDE = [
  "当用户触发拜访相关需求时，优先补齐客户名称、客户行业、拜访对象角色、拜访目的。",
  "最多进行 2 轮信息采集，不要连续追问太多问题；如果缺字段太多，一次性列出 1-3 个最关键问题。",
  "默认值策略：拜访对象默认 TB（技术决策者）；拜访目的默认初次拜访；商机背景默认行业通用场景，并显式标注默认假设。",
  "当客户行业未知时，先引导在七大行业中选择：3C电子/消费电子、新能源/锂电池、汽车/新能源汽车、家电、医疗器械、食品/包装、通用制造/塑料加工。",
];

const MODE_OUTPUT_GUIDE = {
  Full_Preparation: [
    "输出为销售拜访作战单，标题为“[客户名称]拜访打法”。",
    "开头必须先给 3 条重点判断：这次拜访打什么、客户最可能卡在哪里、要拿什么承诺。",
    "主体固定包含：BAC/MAC、30秒开场话术、必问三问、价值/ROI/竞品切入、收官话术。",
    "必须写明用到哪类知识库，例如工艺痛点、产品优势、财务ROI、竞品防守或销售软技能。",
  ],
  Quick_Brief: [
    "控制在 800 字内。",
    "只输出：目标、30 秒开场、必问 3 问、核心价值点、预判顾虑、收官。",
  ],
  Instant_Lookup: [
    "控制在 300 字内。",
    "只回答单一主题，给直接答案、3 个关键点和一段可复制话术。",
  ],
  Post_Review: [
    "使用结构化复盘格式：目标达成、过程回顾、意外情况、改进建议、跟进计划。",
    "必须收集或评估 BAC/MAC 达成状态、意外顾虑和话术有效性。",
  ],
  Team_Drill: [
    "进入蓝军模式，扮演客户角色，不要主动配合销售。",
    "先输出角色设定、场景设定和演练控制命令，再等待用户开始对话。",
    "当用户说结束/点评时，再给逐轮点评、整体评分、关键改进建议和优化后的完整话术。",
  ],
};

const ROLE_STYLE_GUIDE = {
  Rookie: [
    "解释专业术语，如 BAC/MAC/BPIDC/N-SABE 首次出现时要简要说明。",
    "多给步骤说明、模板和为什么这样说的原理。",
    "主动提醒常见错误。",
  ],
  Veteran: [
    "直接给结论，少讲基础解释。",
    "允许直接使用专业缩写和成熟销售术语。",
    "强调差异化打法、关键判断和推进动作。",
  ],
  Manager: [
    "从团队赋能和培训视角组织内容。",
    "尽量输出可分发、可复用、可批量执行的结构。",
    "增加绩效分析、常见失误点和训练建议。",
  ],
};

const DATA_SOURCE_GUIDE = [
  "如使用行业通用数据、默认假设或行业基准，明确标注数据来源。",
  "建议使用图标：📊 平台数据，💬 用户输入，🔄 默认假设，📈 行业基准。",
  "当数据不足时，优雅降级，不要中断帮助流程。",
];

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export async function loadVisitCoachSkill() {
  if (cachedSkillText) {
    return cachedSkillText;
  }

  const raw = await readFile(SKILL_PATH, "utf8");
  cachedSkillText = raw;
  return cachedSkillText;
}

export async function hasVisitCoachSkillFile() {
  try {
    await loadVisitCoachSkill();
    return true;
  } catch {
    return false;
  }
}

export function shouldUseVisitCoach(message, context) {
  const text = normalizeText(message);
  const selectedCustomerName = normalizeText(context?.selectedCustomer?.name || "");

  if (includesAny(text, DIRECT_TRIGGER_KEYWORDS)) {
    return true;
  }

  if (includesAny(text, CONTEXT_TRIGGER_KEYWORDS)) {
    return true;
  }

  if (KNOWN_CUSTOMER_KEYWORDS.some((name) => text.includes(name.toLowerCase()))) {
    if (text.includes("准备") || text.includes("拜访") || text.includes("怎么聊") || text.includes("怎么说")) {
      return true;
    }
  }

  if (selectedCustomerName && (text.includes("准备") || text.includes("拜访") || text.includes("复盘"))) {
    return true;
  }

  return false;
}

export function detectVisitCoachRole(message) {
  const text = normalizeText(message);

  if (includesAny(text, ROLE_HINTS.manager)) return "Manager";
  if (includesAny(text, ROLE_HINTS.rookie)) return "Rookie";
  if (includesAny(text, ROLE_HINTS.veteran)) return "Veteran";
  return "Veteran";
}

export function detectVisitCoachMode(message) {
  const text = normalizeText(message);

  if (includesAny(text, MODE_HINTS.team_drill)) return "Team_Drill";
  if (includesAny(text, MODE_HINTS.post_review)) return "Post_Review";
  if (includesAny(text, MODE_HINTS.instant_lookup)) return "Instant_Lookup";
  if (includesAny(text, MODE_HINTS.quick_brief)) return "Quick_Brief";
  if (includesAny(text, MODE_HINTS.full_preparation)) return "Full_Preparation";
  return "Full_Preparation";
}

function detectDataLevel(context) {
  const customer = context?.selectedCustomer;
  if (!customer) return "Level 3";
  if (!customer.industry) return "Level 2";
  if (!Array.isArray(context?.filteredCompletedVisits) || !context.filteredCompletedVisits.some((item) => item.customerId === customer.id)) {
    return "Level 1";
  }
  return "Level 0";
}

export function buildVisitCoachAddon(message, context) {
  const role = detectVisitCoachRole(message);
  const mode = detectVisitCoachMode(message);
  const dataLevel = detectDataLevel(context);
  const customer = context?.selectedCustomer;
  const currentRep = context?.currentRep;

  const roleDirectives = {
    Rookie: "当前用户按 Rookie 处理：解释术语、说明原理、给完整模板、主动提醒常见错误。",
    Veteran: "当前用户按 Veteran 处理：直接给结论、使用专业术语、减少基础解释、强调差异化打法。",
    Manager: "当前用户按 Manager 处理：从团队赋能和培训视角输出，支持批量和可复用模板。",
  };

  const modeDirectives = {
    Full_Preparation: "当前输出模式为 Full_Preparation：使用完整 Markdown 结构，覆盖完整 POCC 四阶段。",
    Quick_Brief: "当前输出模式为 Quick_Brief：控制在 800 字内，给 BAC/MAC、TOP3 提问、开场话术、核心价值点和收官。",
    Instant_Lookup: "当前输出模式为 Instant_Lookup：控制在 300 字内，直接回答一个主题，给关键点和可复制话术。",
    Post_Review: "当前输出模式为 Post_Review：使用结构化复盘模板，覆盖目标达成、过程回顾、意外情况、改进建议和跟进计划。",
    Team_Drill: "当前输出模式为 Team_Drill：你要进入蓝军演练模式，扮演客户角色，制造真实商业障碍，并在用户结束时给逐轮点评。",
  };

  const degradeDirectives = {
    "Level 0": "当前数据完整度 Level 0：可以正常输出，不必强调降级。",
    "Level 1": "当前数据完整度 Level 1：客户画像不完整，需标注基于行业通用数据和行业基准生成。",
    "Level 2": "当前数据完整度 Level 2：行业信息不足，优先引导用户确认行业，再输出最小准备版本。",
    "Level 3": "当前数据完整度 Level 3：只有最少上下文，必须先引导收集客户名称、行业、拜访对象角色等必要信息。",
  };

  const contextLines = [
    "以下为拓斯达销售拜访教练模式补充指令。",
    roleDirectives[role],
    modeDirectives[mode],
    degradeDirectives[dataLevel],
    currentRep ? `当前业务视角：${currentRep.name}（${currentRep.role}）。` : null,
    customer ? `当前客户：${customer.name}，行业 ${customer.industry || "未知"}，当前商机 ${customer.currentOpportunity || "未知"}。` : "当前未锁定客户，必要时先询问客户名称。",
    "优先结合已有业务 tools 返回的数据，再套用 POCC、BPIDC、N-SABE、LSCPA 框架。",
    "如果是 Team_Drill 模式，不要一次性把整套方案讲完，要先给角色设定和场景，然后等待用户开始对话。",
    "如果是 Post_Review 模式，输出必须带结构化复盘模板和下一步跟进计划。",
    "如果是 Quick_Brief 或 Instant_Lookup，不要铺陈过长背景。",
    "如使用行业基准、默认假设或通用模板，请显式标注数据来源：平台数据 / 用户输入 / 默认假设 / 行业基准。",
  ].filter(Boolean);

  return {
    role,
    mode,
    dataLevel,
    addonInstruction: contextLines.join("\n"),
  };
}

export function buildVisitCoachRuntimeGuide(message, context) {
  const addon = buildVisitCoachAddon(message, context);

  const degradeInstructions = {
    "Level 0": "数据完整度高，可直接按标准模板输出。",
    "Level 1": "客户画像不完整，需用行业通用数据补足，并提示用户可补充更精准背景。",
    "Level 2": "行业信息缺失，优先引导用户确认行业后再深度展开。",
    "Level 3": "信息过少，先收集客户名称、行业、拜访对象角色和拜访目的，再输出最小版本。",
  };

  return {
    role: addon.role,
    mode: addon.mode,
    dataLevel: addon.dataLevel,
    prompt: [
      ...RUNTIME_METHOD_GUIDE,
      ...RUNTIME_COLLECTION_GUIDE,
      ...ROLE_STYLE_GUIDE[addon.role],
      ...MODE_OUTPUT_GUIDE[addon.mode],
      degradeInstructions[addon.dataLevel],
      ...DATA_SOURCE_GUIDE,
      addon.addonInstruction,
    ].join("\n"),
  };
}

export async function buildVisitCoachRuntimeGuideWithSkill(message, context) {
  const guide = buildVisitCoachRuntimeGuide(message, context);
  let skillText = "";
  try {
    skillText = await loadVisitCoachSkill();
  } catch {
    skillText = "";
  }

  return {
    ...guide,
    prompt: [
      guide.prompt,
      skillText
        ? [
            "",
            "以下为项目内置 topstar-visit-coach/SKILL.md 原文，请严格按其中的 SABC 分层、POCC、赢单五步法、BPIDC、N-SABE、LSCPA、BAC/MAC 输出。",
            skillText.slice(0, 30000),
          ].join("\n")
        : "",
    ].filter(Boolean).join("\n"),
  };
}
