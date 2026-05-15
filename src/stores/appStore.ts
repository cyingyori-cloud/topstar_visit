import { create } from 'zustand';
import type { Customer, VisitTask, KnowledgeItem, CompletedVisit, CoverageData } from '../data/mockData';
import { customers, visitTasks, completedVisits, knowledgeItems, KnowledgeAudience } from '../data/mockData';
import { salesReps, SalesRep } from '../data/roles';
import { normalizeCompanyNames } from '../utils/companyNames';
import { TIER_RULES, INDUSTRY_CASES, SCRIPT_RULES, calcActivationScore } from '../data/skills';
import { sendAgentChat, AgentRuntimeConfig } from '../services/agent';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickActions?: { label: string; icon: string; action: string }[];
  meta?: {
    model?: string;
    toolCalls?: string[];
    source?: 'agent' | 'fallback';
    coachRole?: string | null;
    coachMode?: string | null;
    coachDataLevel?: string | null;
    provider?: string | null;
    apiMode?: string | null;
    endpoint?: string | null;
  };
}

interface AppState {
  // Role
  currentRep: SalesRep;

  // Current context
  selectedCustomerId: string | null;
  selectedCustomer: Customer | null;

  // Chat
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  previousResponseId: string | null;
  agentEnabled: boolean;
  lastAgentError: string | null;
  modelConfigOpen: boolean;
  modelProviderLabel: string;
  runtimeConfig: AgentRuntimeConfig | null;
  modelConnectionStatus: 'idle' | 'success' | 'error' | 'testing';
  modelConnectionMessage: string | null;

  // Filters
  taskPeriod: string;
  completedPeriod: string;
  coveragePeriod: string;

  // UI
  activeNav: string;
  leftPanelCollapsed: boolean;
  showAddVisit: boolean;

  // Computed (filtered) data
  filteredCustomers: Customer[];
  filteredTasks: VisitTask[];
  filteredCompletedVisits: CompletedVisit[];
  filteredCoverage: CoverageData;
  filteredKnowledge: KnowledgeItem[];

  // Actions
  switchRep: (repId: string) => void;
  setSelectedCustomer: (customerId: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  setIsTyping: (isTyping: boolean) => void;
  setInputValue: (value: string) => void;
  setAgentEnabled: (enabled: boolean) => void;
  setModelConfigOpen: (open: boolean) => void;
  setModelProviderLabel: (label: string) => void;
  setRuntimeConfig: (config: AgentRuntimeConfig | null) => void;
  setModelConnectionStatus: (status: 'idle' | 'success' | 'error' | 'testing') => void;
  setModelConnectionMessage: (message: string | null) => void;
  setTaskPeriod: (period: string) => void;
  setCompletedPeriod: (period: string) => void;
  setCoveragePeriod: (period: string) => void;
  setActiveNav: (nav: string) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setShowAddVisit: (show: boolean) => void;
  triggerCustomerContext: (customerId: string, contextType: string) => void;
  triggerKnowledgeContext: (item: KnowledgeItem) => void;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
}

/* ---------- helpers ---------- */

function getInitialMessages(repName: string, taskCount: number): ChatMessage[] {
  return [
    {
      id: 'welcome',
      role: 'assistant',
      content: `## 👋 ${repName}，欢迎使用 TopStar 智能拜访助手

已同步您本周 **${taskCount}个拜访任务** 和全量客户数据。

### 🧠 八大 Skill 能力

| Skill | 功能 | 试试说 |
|-------|------|--------|
| 🏷️ 客户分层 | SABC分级规则+差异化运营 | "客户分层" |
| 📊 拜访频率 | 到期/超期自动预警 | "拜访频率" |
| 📂 行业案例 | 按行业+产品线匹配标杆 | "行业案例" |
| 🗣️ 话术推荐 | 关注点×阶段→话术组合 | "话术推荐" |
| ⚔️ 竞品分析 | 历史竞对+差异化优势 | "竞品分析" |
| ✅ 有效性评估 | 访后五个一/三个一自检 | "有效性评估" |
| 📊 覆盖率统计 | SABC各级覆盖率预警 | "覆盖率统计" |
| 🔄 激活策略 | 沉睡客户优先级+话术 | "激活策略" |

### 🧰 POCC 方法论

| 阶段 | 工具 |
|------|------|
| P 规划 | BOO目标 + BAC/MAC承诺 |
| O 开场 | PBC模型 + STAR-R故事 |
| C 咨询 | BPIDC提问 + N-SABE价值 |
| C 收官 | Close三步法 + LSCPA异议 |

> *赢单五步法是战略，POCC 是战术。带着图纸去拜访，带着承诺回公司。*`,
      timestamp: new Date(),
      quickActions: [
        { label: '📋 本周拜访概览', icon: '📋', action: 'weekly_overview' },
        { label: '📊 拜访频率', icon: '📊', action: 'check_frequency' },
        { label: '🔄 C级激活', icon: '🔄', action: 'activation' },
        { label: '🗣️ 话术推荐', icon: '🗣️', action: 'script_recommend' },
      ],
      meta: {
        source: 'fallback',
      },
    },
  ];
}

function computeFiltered(rep: SalesRep) {
  const cid = new Set(rep.customerIds);
  const fc = customers.filter(c => cid.has(c.id));
  const ft = visitTasks.filter(t => cid.has(t.customerId));
  const fcv = completedVisits.filter(v => cid.has(v.customerId));

  // coverage
  const covByLevel = (['S', 'A', 'B', 'C'] as const).map(level => {
    const total = fc.filter(c => c.level === level).length;
    const covered = new Set(fcv.filter(v => v.customerLevel === level).map(v => v.customerId)).size;
    return { level, total, covered };
  });
  const total = covByLevel.reduce((s, l) => s + l.total, 0);
  const covered = covByLevel.reduce((s, l) => s + l.covered, 0);

  // uncovered high priority
  const coveredIds = new Set(fcv.map(v => v.customerId));
  const uncoveredHighPriority = fc
    .filter(c => ['S', 'A'].includes(c.level) && !coveredIds.has(c.id))
    .map(c => ({
      customerId: c.id,
      customerName: c.name,
      customerLevel: c.level,
      daysSinceLastVisit: 30 + Math.floor(Math.random() * 20),
    }));

  const fCoverage: CoverageData = { total, covered, byLevel: covByLevel, uncoveredHighPriority };

  // Knowledge filtering by role level
  const audienceFilter: Record<number, KnowledgeAudience[]> = {
    1: ['all', 'director', 'manager'],       // 销售总监：战略+管理层内容
    2: ['all', 'manager'],                    // 区域总监：管理+通用
    3: ['all', 'sales'],                      // 销售人员：执行+通用
  };
  const allowedAudiences = audienceFilter[rep.level] || ['all'];
  const fk = knowledgeItems.filter(k => allowedAudiences.includes(k.audience));

  return { fc, ft, fcv, fCoverage, fk };
}

let messageIdCounter = 0;

function buildAgentContext(state: AppState) {
  return {
    currentDate: new Date().toISOString().slice(0, 10),
    currentRep: state.currentRep,
    activeNav: state.activeNav,
    selectedCustomerId: state.selectedCustomerId,
    selectedCustomer: state.selectedCustomer,
    filteredCustomers: state.filteredCustomers,
    filteredTasks: state.filteredTasks,
    filteredCompletedVisits: state.filteredCompletedVisits,
    filteredCoverage: state.filteredCoverage,
    filteredKnowledge: state.filteredKnowledge,
    tierRules: TIER_RULES,
    industryCases: INDUSTRY_CASES,
    scriptRules: SCRIPT_RULES,
  };
}

function generateAIResponse(content: string, state: AppState): { text: string; quickActions?: ChatMessage['quickActions'] } {
  const lc = content.toLowerCase();
    const { filteredTasks, filteredCoverage, selectedCustomer, currentRep, filteredCompletedVisits } = state;
  const customer = selectedCustomer;

  if (
    customer &&
    (lc.includes('客户详细信息') || lc.includes('客户概况') || lc.includes('客户信息'))
  ) {
    const contactRows = customer.keyContacts.map((contact, index) =>
      `| ${index + 1} | ${contact.name} | ${contact.title} | ${contact.phone} |`
    ).join('\n');

    const recentVisits = filteredCompletedVisits
      .filter(v => v.customerId === customer.id)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
      .slice(0, 3);

    const visitRows = recentVisits.length > 0
      ? recentVisits.map(v => `| ${v.visitDate} | ${v.summary} | ${v.outcome} |`).join('\n')
      : '| 暂无 | 暂无历史拜访记录 | — |';

    return {
      text: `## 👤 ${normalizeCompanyNames(customer.name)} · 客户详细信息

### 一、客户概况
| 项目 | 信息 |
|------|------|
| 客户等级 | ${customer.level}级 |
| 所属行业 | ${customer.industry} |
| 所在区域 | ${customer.region} |
| 客户地址 | ${customer.address} |

### 二、关键联系人
| 序号 | 姓名 | 职位 | 联系方式 |
|------|------|------|----------|
${contactRows}

### 三、当前重点项目
| 项目 | 信息 |
|------|------|
| 当前商机 | ${customer.currentOpportunity} |
| 商机金额 | ¥${customer.opportunityAmount}万 |
| 当前阶段 | ${customer.opportunityStage} |
| 推进进度 | ${customer.opportunityPercent}% |

### 四、最近拜访情况
| 日期 | 拜访内容 | 结果 |
|------|----------|------|
${visitRows}

### 五、建议经营重点
| 维度 | 建议 |
|------|------|
| 客户关系 | 重点围绕 ${customer.keyContacts[0]?.name || '关键联系人'} 建立持续互动，确认决策链是否稳定 |
| 商机推进 | 聚焦 ${customer.currentOpportunity} 当前处于“${customer.opportunityStage}”阶段的核心卡点 |
| 下一步动作 | 建议结合当前阶段，准备一次更有针对性的客户拜访或方案复盘交流 |`,
      quickActions: [
        { label: '📋 进入拜访准备', icon: '📋', action: 'prepare_pocc' },
        { label: '🗣️ 生成开场话术', icon: '🗣️', action: 'open_script' },
      ],
    };
  }

  /* ==================== 本周概览 ==================== */
  if (lc.includes('本周') && (lc.includes('概览') || lc.includes('拜访概'))) {
    const todayTasks = filteredTasks.filter(t => t.dayLabel === '今天');
    const taskRows = filteredTasks.map(t => {
      const icon = t.customerLevel === 'S' ? '🔴' : t.customerLevel === 'A' ? '🟠' : '🔵';
      return `| ${t.dayLabel} ${t.visitTime} | ${icon} ${normalizeCompanyNames(t.customerName)} | ${t.visitPurpose} |`;
    }).join('\n');

    return {
      text: `## 📋 本周拜访概览（POCC 视角）

共安排 **${filteredTasks.length}次拜访**，今日 **${todayTasks.length}次**：

| 日期/时间 | 客户 | 拜访目的 |
|-----------|------|----------|
${taskRows}

---

### 🧭 POCC 准备清单

**P（Prepare）规划与准备**：
- 确认每位客户的 BOO（商机目标）五要素：相关性、使用者、需求/目标、预算、时间
- 设定每次拜访的 **BAC**（最佳行动承诺）和 **MAC**（最低行动承诺）
- 准备决策链分析：识别 EB/TB/UB/Coach 及其态度

**O（Open）开场准备**：
- 为每位客户设计 **PBC 开场**（Purpose 目的 + Behavior 行为 + Competence 能力）
- 准备价值主张、成功故事（STAR-R）或行业痛点清单

**C（Consult）咨询准备**：
- 设计 **BPIDC 提问链**：背景→痛点→影响→诊断→承诺
- 准备 **N-SABE 价值呈现**：需求→方案→优势→利益→证据

**C（Close）收官准备**：
- 设计分层承诺策略：BAC + MAC
- 准备 **LSCPA 异议处理**预案

> 💡 *赢单五步法是战略，POCC 是战术。战略定方向，战术保落地。带着图纸去拜访，带着承诺回公司。*`,
      quickActions: [
        { label: '📋 准备重点客户 POCC', icon: '📋', action: 'prepare_pocc' },
        { label: '⚠️ 需关注客户', icon: '⚠️', action: 'attention_needed' },
      ],
    };
  }

  /* ==================== 需关注客户 ==================== */
  if (lc.includes('关注') || lc.includes('attention')) {
    return {
      text: `## ⚠️ 需要重点关注的客户

${filteredCoverage.uncoveredHighPriority.length > 0
  ? filteredCoverage.uncoveredHighPriority.map(c => `**${normalizeCompanyNames(c.customerName)}**（${c.customerLevel}级）— 已${c.daysSinceLastVisit}天未拜访`).join('\n\n')
  : '当前没有需要特别关注的客户。'}

---

### 🧭 531 洞察 + POCC 策略

针对长时间未拜访的客户，建议按以下框架重新激活：

**1. P（Prepare）—— 重新洞察**
- 531 模型：这家客户外部环境有什么变化？内部业务有何动向？机会点在哪里？
- 决策链是否变动？关键人态度是否因竞品介入而改变？

**2. O（Open）—— 用价值重新开启**
- 不要说"好久没联系了"，而是用 **价值主张** 或 **行业趋势** 开场
- 示例："X总，最近我们调研了${currentRep.role === '销售总监' ? '' : '贵行业'}几个头部企业，发现Q3设备投资有明显回暖，想跟您交流一下..."

**3. C（Close）—— 争取低门槛承诺**
- BAC：安排一次30分钟的方案交流
- MAC：获取客户最新采购计划信息

> ⚡ *客户不会因为你"很久没联系"而丢失，但会因为竞品"一直在联系"而流失。*`,
      quickActions: [
        { label: '📅 安排拜访', icon: '📅', action: 'schedule_visit' },
        { label: '📊 分析客户现状', icon: '📊', action: 'analyze_customer' },
      ],
    };
  }

  /* ==================== 覆盖率分析 ==================== */
  if (lc.includes('覆盖率')) {
    const rows = filteredCoverage.byLevel.map(l => {
      const pct = l.total > 0 ? Math.round((l.covered / l.total) * 100) : 0;
      return `| ${l.level}级 | ${l.covered} | ${l.total} | ${pct}% |`;
    }).join('\n');
    const overallPct = filteredCoverage.total > 0 ? Math.round((filteredCoverage.covered / filteredCoverage.total) * 100) : 0;
    return {
      text: `## 📊 本月拜访覆盖率分析

### 整体覆盖率：**${overallPct}%**（${filteredCoverage.covered}/${filteredCoverage.total}家客户）

| 等级 | 已覆盖 | 总数 | 覆盖率 |
|------|--------|------|--------|
${rows}

---

### 🧭 覆盖率 = 信息流的广度

B2B 销售的本质是**信息、信任、决策三流合一**。覆盖率决定了你能获取多少信息流。

- **S/A级**：覆盖率目标 100%。这些客户是你信任流的核心载体，必须高频互动
- **B级**：覆盖率 ≥60%。筛选其中潜力客户重点投入
- **C级**：覆盖率 ≥30%。以低成本方式（电话/线上）维持触达

**行动建议**：
1. 对未覆盖的 S/A 级客户，立即制定 POCC 拜访计划
2. 对 B/C 级客户，批量安排线上交流，用行业痛点清单筛选意向客户`,
      quickActions: [{ label: '📅 生成拜访计划', icon: '📅', action: 'generate_plan' }],
    };
  }

  /* ==================== 拜访建议 ==================== */
  if (lc.includes('建议') && !lc.includes('拜访准备') && !lc.includes('准备')) {
    return {
      text: `## 💡 本周拜访建议（POCC 方法论）

### 🎯 优先级排序
${filteredTasks.slice(0, 5).map((t, i) => `${i + 1}. ${t.customerLevel === 'S' ? '🔴' : t.customerLevel === 'A' ? '🟠' : '🔵'} ${normalizeCompanyNames(t.customerName)} — ${t.visitPurpose}`).join('\n')}

---

### 🧭 五大核心战力自检

每次拜访前，请对照以下五项检查：

| 战力 | 自检问题 | ✅ |
|------|---------|---|
| 客户背景洞察 | 我是否用531模型分析了客户的外部/内部/机会？ | |
| 商机洞察 | 我是否清楚 BOO 五要素和当前项目形势？ | |
| 决策链洞察 | 我是否用 EUTP 模型识别了 EB/TB/UB/Coach？ | |
| 销售工具包 | 我准备了案例、样品、数据报告？ | |
| 赢家心态 | 我是价值导向、空杯心态、长期主义？ | |

> 📌 *一流的销售，赢在拜访之前，决胜于准备之中。*`,
      quickActions: [
        { label: '📋 POCC 拜访模板', icon: '📋', action: 'pocc_template' },
        { label: '📊 准备竞品对比', icon: '📊', action: 'competitor_compare' },
      ],
    };
  }

  /* ==================== 客户拜访准备（POCC 完整流程） ==================== */
  if (customer && (lc.includes('准备') || lc.includes('拜访') || lc.includes('pocc'))) {
    const contact = customer.keyContacts[0];
    const contactName = contact?.name || 'X总';
    const contactTitle = contact?.title || '关键决策人';
    return {
      text: `## 📋 ${normalizeCompanyNames(customer.name)} · POCC 拜访计划

### 一、客户概况（531 洞察）
| 项目 | 信息 |
|------|------|
| 客户等级 | ${customer.level === 'S' ? '🔴' : customer.level === 'A' ? '🟠' : customer.level === 'B' ? '🔵' : '⚪'} ${customer.level}级 |
| 行业 | ${customer.industry} |
| 关键决策人 | ${contactName}（${contactTitle}） |
| 当前商机 | ¥${customer.opportunityAmount}万 ${customer.currentOpportunity} |
| 商机阶段 | ${customer.opportunityStage}（${customer.opportunityPercent}%） |

---

### 二、P（Prepare）规划与准备

**BOO 商机目标五要素**：
- ✅ 相关性：${customer.currentOpportunity}方案与客户需求匹配
- ✅ 使用者：${contactTitle}及产线操作团队
- ⚠️ 需求/目标：需本次拜访确认（见BPIDC提问链）
- ⚠️ 预算：需确认是否在 ¥${customer.opportunityAmount}万 范围内
- ⚠️ 时间计划：需确认决策时间表

**行动承诺目标**：
- 🎯 **BAC（最佳）**：获得${customer.currentOpportunity}方案评审会的安排
- 🛡️ **MAC（最低）**：获取客户最新技术参数需求清单

---

### 三、O（Open）有效开场（PBC 模型）

**P（Purpose）—— 说明拜访目的**：
> "${contactName}，上次我们沟通了${customer.currentOpportunity}方案，这次带来了一份详细的技术验证报告和同行标杆案例，重点想帮您解决${customer.opportunityStage === '方案评估' ? '方案评估中的技术疑虑' : '项目推进中的关键问题'}。"

**B（Behavior）—— 职业化行为**：
- 准时到达，提前10分钟到场
- 着商务正装，带齐工具包
- 开场确认时间安排："预计40分钟，先看技术数据，再探讨落地路径，您看是否合适？"

**C（Competence）—— 展示解决能力**：
> "我们在${customer.industry}行业有多个成功案例，其中一家同类型客户通过我们的方案，良品率从95%提升到了99%，年节省成本超过百万。"

---

### 四、C（Consult）咨询沟通

**BPIDC 提问链**：

| 步骤 | 提问 |
|------|------|
| **B 背景** | "${contactName}，目前${customer.currentOpportunity}项目推进到哪个阶段了？跟上次沟通相比有什么变化？" |
| **P 痛点** | "在${customer.opportunityStage}过程中，遇到最大的技术或流程障碍是什么？" |
| **I 影响** | "如果这个问题不解决，对交付周期和成本的影响有多大？有没有量化的数字？" |
| **D 诊断** | "我们分析过类似案例，发现核心瓶颈通常是[X]。贵司是否做过相关的对比测试？" |
| **C 承诺** | "如果分析方向对路，您是否愿意让我们提供小批量样品做一次验证？" |

**N-SABE 价值呈现**：

> - **N（需求）**：基于刚才的交流，您最关心的是${customer.currentOpportunity}的稳定性和成本控制
> - **S（方案）**：我们为您设计的是一套自动化解决方案
> - **A（优势）**：核心能力是[具体技术优势]
> - **B（利益）**：这意味着您的良品率将提升[X]%，年节省约[Y]万
> - **E（证据）**：这是我们同行业标杆客户的数据报告（展示）

---

### 五、C（Close）拜访收官

**价值回顾 + 分层承诺**：

> "${contactName}，今天我们达成几点共识：第一...；第二...；第三...。您看我的总结是否准确？
>
> 为了尽快推进，您看是否可以这样安排：
> 1. 我们在周三前提供详细的${customer.currentOpportunity}技术方案书
> 2. 您这边安排一次方案评审会（BAC）
> 3. 至少提供一下贵司最新的技术参数要求（MAC）"

**五步公式**：请求收尾 → 总结要点 → 确认共识 → 明确下一步 → 致谢展望`,
      quickActions: [
        { label: '🗣️ 模拟 BPIDC 对话', icon: '🗣️', action: 'simulate_bpidc' },
        { label: '💰 模拟价格异议', icon: '💰', action: 'simulate_price' },
        { label: '📊 准备 N-SABE', icon: '📊', action: 'prepare_nsabe' },
        { label: '📝 生成拜访计划书', icon: '📝', action: 'plan_doc' },
      ],
    };
  }

  /* ==================== 价格异议（LSCPA） ==================== */
  if (lc.includes('价格') && (lc.includes('贵') || lc.includes('异议') || lc.includes('应对'))) {
    return {
      text: `## 💰 价格异议应对（LSCPA 模型）

当客户说**"你们价格比XX贵20%"**时，不要急于反驳，用 **LSCPA 五步法** 化顾虑为信任：

---

### 第一步：L（Listen）专注倾听
> 不打断客户，点头示意，让客户把顾虑说完。

### 第二步：S（Share）真诚共情
> "X总，我完全理解。价格确实是选型中最重要的考量因素之一，很多客户在初期也有类似的顾虑。"

### 第三步：C（Clarify）深挖根源
> "您觉得我们贵，主要是跟哪一家对比？除了采购价格，您还考虑了哪些隐性成本？"

### 第四步：P（Present）针对性方案（TCO 总成本法）
> "如果算总体拥有成本（TCO）：

| 项目 | 我司 | XX品牌 |
|------|------|--------|
| 设备采购 | 350万 | 290万 |
| 年维护成本 | 8万 | 15万 |
| 良品率提升 | +2.3% | +1.1% |
| 3年TCO | 374万 | 335万 |
| 良率收益(3Y) | -120万 | -58万 |
| **实际总成本** | **254万** | **277万** |

> 3年下来，选择我们实际为贵司节省23万，还不包括停机损失和服务响应差异。"

### 第五步：A（Ask）确认解决
> "这样算下来，您看总体拥有成本这个角度是不是更清晰？如果数据没问题，我们是否可以安排一次现场验证？"

---

> 💡 *顾虑的本质是"个人风险"。LSCPA 的核心不是说服客户，而是消除客户对未知的恐惧。*`,
      quickActions: [
        { label: '📋 复制话术', icon: '📋', action: 'copy_script' },
        { label: '🗣️ 模拟 LSCPA 对话', icon: '🗣️', action: 'simulate_lscpa' },
      ],
    };
  }

  /* ==================== Skill: 客户分层规则 ==================== */
  if (lc.includes('分层') || lc.includes('sabc') || lc.includes('客户分级')) {
    return {
      text: `## 🏷️ SABC 客户分层规则

拓斯达客户分级运营体系，驱动差异化资源配置：

| 等级 | 定义 | 月上门 | 月联系 | 超期阈值 | 颜色 |
|------|------|--------|--------|---------|------|
| 🔴 **S级** | 战略客户 | ≥4次 | ≥4次 | 7天 | 红 |
| 🟠 **A级** | 重点客户 | ≥1次 | ≥1次 | 30天 | 橙 |
| 🔵 **B级** | 一般客户 | — | ≥1次 | 60天 | 蓝 |
| ⚪ **C级** | 待激活客户 | — | — | 90天 | 灰 |

---

### 差异化运营动作

**S级（战略客户）**：
- 每周至少上门 1 次
- 要求客户高层会面、需求深度确认、方案价值呈现、行动计划对齐、竞品信息收集
- 商机推进节奏：每周 review

**A级（重点客户）**：
- 每月至少上门 1 次 + 月度联系
- 关键人会面、需求确认、方案交流
- 商机推进节奏：双周 review

**B级（一般客户）**：
- 每月至少联系 1 次（电话/微信均可）
- 筛选其中潜力客户升级为 A 级

**C级（待激活客户）**：
- 激活优先级排序：最近招标记录 + 历史成交金额 + 距上次联系时间
- 批量触达，筛选意向后再重点投入`,
      quickActions: [
        { label: '📊 检查拜访频率', icon: '📊', action: 'check_frequency' },
        { label: '🔄 C级激活策略', icon: '🔄', action: 'activation' },
      ],
    };
  }

  /* ==================== Skill: 拜访频率计算 ==================== */
  if (lc.includes('频率') || lc.includes('到期') || lc.includes('超期') || lc.includes('拜访频率')) {
    const today = new Date();
    const completedByCustomer = new Map<string, typeof completedVisits>();
    filteredCompletedVisits.forEach((v: typeof completedVisits[0]) => {
      const arr = completedByCustomer.get(v.customerId) || [];
      arr.push(v);
      completedByCustomer.set(v.customerId, arr);
    });

    const overdueList = filteredTasks.map(t => {
      const rule = TIER_RULES.find(r => r.tier === t.customerLevel) || TIER_RULES[3];
      const customerVisits = completedByCustomer.get(t.customerId) || [];
      const lastVisit = customerVisits.length > 0 ? customerVisits.sort((a: any, b: any) => b.visitDate.localeCompare(a.visitDate))[0] : null;
      const daysSince = lastVisit ? Math.floor((today.getTime() - new Date(lastVisit.visitDate).getTime()) / 86400000) : 999;
      const isOverdue = daysSince > rule.overdueDays;
      const isCritical = daysSince > rule.overdueDays * 2;
      return { ...t, rule, daysSince, isOverdue, isCritical, lastVisit };
    }).filter(t => t.isOverdue);

    const rows = overdueList.map(t => {
      const icon = t.isCritical ? '🚨' : '⚠️';
      const status = t.isCritical ? '严重超期' : '已超期';
      return `| ${icon} ${t.rule.overdueDays}天 | ${t.daysSince}天 | ${normalizeCompanyNames(t.customerName)} | ${t.customerLevel}级 | ${t.rule.overdueDays}天 | ${status} |`;
    }).join('\n');

    return {
      text: `## 📊 拜访频率检查

基于 SABC 分层规则计算拜访到期/超期情况：

### 规则阈值

| 等级 | 月上门要求 | 超期阈值 | 超期×2 |
|------|-----------|---------|--------|
| S级 | ≥4次 | 7天 | 14天 |
| A级 | ≥1次 | 30天 | 60天 |
| B级 | 联系≥1次 | 60天 | 120天 |
| C级 | 激活优先 | 90天 | 180天 |

${overdueList.length > 0 ? `### ⚠️ 已超期客户（${overdueList.length}家）

| 标记 | 上次拜访 | 客户 | 等级 | 阈值 | 状态 |
|------|---------|------|------|------|------|
${rows}

> 距上次拜访天数 > 阈值 → **标红预警**；> 2倍阈值 → **🚨 严重超期**` : '✅ 当前无超期客户'}

---

### 💡 行动建议

- **🚨 严重超期**：48小时内安排上门拜访，重新激活关系
- **⚠️ 超期**：本周内安排联系/拜访
- **S级超期**：最高优先级，立即处理`,
      quickActions: [
        { label: '📋 安排超期拜访', icon: '📋', action: 'schedule_overdue' },
        { label: '🔄 C级激活', icon: '🔄', action: 'activation' },
      ],
    };
  }

  /* ==================== Skill: 行业案例匹配 ==================== */
  if (lc.includes('行业案例') || lc.includes('相似案例') || lc.includes('标杆案例') || lc.includes('成交案例')) {
    const cIndustry = customer?.industry;
    const matched = cIndustry
      ? INDUSTRY_CASES.filter(ca => ca.industry === cIndustry || ca.result.includes(cIndustry))
      : INDUSTRY_CASES.filter(ca => ca.result !== '待交付' && ca.result !== '初步接触' && !ca.result.includes('方案评审'));

    return {
      text: `## 📂 行业案例匹配${cIndustry ? `（${cIndustry}）` : ''}

${matched.length > 0 ? `基于 ${cIndustry ? `行业：**${cIndustry}**` : '全部行业'} 匹配到 **${matched.length}个** 相似案例：

| 客户 | 行业 | 产品线 | 金额 | 成果 |
|------|------|--------|------|------|
${matched.map(ca => `| ${normalizeCompanyNames(ca.customer)} | ${ca.industry} | ${ca.product} | ¥${ca.amount}万 | ${ca.result} |`).join('\n')}

---

### 🎯 STAR-R 案例叙事建议

选中一个最匹配的案例，按 STAR-R 结构讲故事：

> **S（情境）**："${matched[0] ? normalizeCompanyNames(matched[0].customer) : '某客户'}当时面临[痛点]..."
> **T（任务）**："目标是[具体指标提升]..."
> **A（行动）**："我们部署了[方案]..."
> **R（结果）**："最终${matched[0]?.result || '[量化成果]'}..."
> **R（关联）**："不知道贵司在这方面是否也有考虑？"` : '暂无匹配案例，建议收集该行业信息后更新案例库。'}

> 📌 案例匹配维度：行业（手机/新能源/食品/医药）+ 产品线（机器人/注塑机/温控器）+ 客户规模`,
      quickActions: [
        { label: '⭐ STAR-R 故事', icon: '⭐', action: 'star_r' },
        { label: '📊 N-SABE 呈现', icon: '📊', action: 'nsabe' },
      ],
    };
  }

  /* ==================== Skill: 话术推荐 ==================== */
  if (lc.includes('话术推荐') || lc.includes('推荐话术') || lc.includes('话术匹配')) {
    const cStage = customer?.opportunityStage || '';
    const stageMatch = SCRIPT_RULES.filter(r => cStage.includes(r.stage.replace('需求挖掘', '').replace('方案评估', '').replace('合同谈判', '')));
    const topRules = stageMatch.length > 0 ? stageMatch : SCRIPT_RULES.slice(0, 4);

    return {
      text: `## 🗣️ 智能话术推荐${customer ? `（${normalizeCompanyNames(customer.name)} · ${cStage}）` : ''}

基于 **客户关注点 × 商机阶段** 自动匹配最优话术组合：

### 推荐话术

${topRules.map(r => `**${r.concern}** + **${r.stage}** → 🎯 **${r.scriptType}**（${r.framework}方法论）`).join('\n\n')}

---

### 📋 完整话术匹配矩阵

| 客户关注点 | 需求挖掘 | 方案评估 | 合同谈判 |
|-----------|---------|---------|---------|
| 开机率/效率 | BPIDC提问链 | N-SABE价值 | TCO总成本 |
| 提效/降本 | 价值主张+痛点 | STAR-R案例 | LSCPA异议 |
| 换人/招工 | PBC开场 | N-SABE利益 | 质量协议 |
| 良品率 | BPIDC诊断 | 数据对比 | 验收条款 |
| 技术参数 | BPIDC验证 | 方案对比 | 技术协议 |

---

### 🧠 百问百答映射

> 话术推荐基于**百问百答**知识库 + **望闻问切**方法论：
> - **望**：观察客户状态，判断关注点
> - **闻**：倾听客户诉求，识别真实需求
> - **问**：BPIDC结构化提问
> - **切**：精准推荐话术，对症下药`,
      quickActions: [
        { label: '🗣️ BPIDC 提问链', icon: '🗣️', action: 'bpidc' },
        { label: '📊 N-SABE 呈现', icon: '📊', action: 'nsabe' },
      ],
    };
  }

  /* ==================== Skill: 竞品分析 ==================== */
  if (lc.includes('竞品') || lc.includes('竞对') || lc.includes('竞争')) {
    return {
      text: `## ⚔️ 竞品分析

### 电子制造自动化行业主要竞对

| 竞品 | 核心优势 | 核心劣势 | 我方差异化 |
|------|---------|---------|-----------|
| **埃斯顿** | 机器人本体、价格中等 | 注塑经验5年、整线能力弱 | 🎯 整线交付能力（500+案例） |
| **汇川技术** | 工控+伺服驱动、渠道广 | 整线方案薄弱、服务响应慢 | 🎯 注塑深耕15年、4h响应 |
| **ABB/KUKA** | 品牌强、技术领先 | 价格高、定制周期长 | 🎯 国产替代、成本60-70%、自主可控 |

---

### ${customer ? normalizeCompanyNames(customer.name) + ' · ' : ''}竞对应对策略

**vs 价格更低的对手**：
- 用 TCO 总成本法（3年总成本对比）
- 强调良品率提升带来的隐性收益

**vs 品牌更强的对手**：
- 强调服务响应速度（华南4h vs 进口品牌24-48h）
- 强调定制化能力和供应链安全

**vs 技术相似的对手**：
- 强调整线交付能力（从单机到整线方案）
- 用同行业标杆案例（STAR-R）证明

> 💡 *竞品信息应从历史商机记录和客户招标信息中持续收集更新。*`,
      quickActions: [
        { label: '💰 TCO 对比', icon: '💰', action: 'tco_compare' },
        { label: '⭐ STAR-R 案例', icon: '⭐', action: 'star_r' },
      ],
    };
  }

  /* ==================== Skill: 有效性评估 ==================== */
  if (lc.includes('有效性') || lc.includes('拜访评估') || lc.includes('评估拜访')) {
    return {
      text: `## ✅ 拜访有效性评估

基于 SABC 分层规则，对照评估本次拜访是否"有效"：

### 评估标准

| 等级 | 有效拜访标准（五个一/三个一） | 商机推进要求 |
|------|------|------|
| 🔴 **S级** | ①客户高层会面 ②需求深度确认 ③方案价值呈现 ④行动计划对齐 ⑤竞品信息收集 | 阶段必须有推进 |
| 🟠 **A级** | ①关键人会面 ②需求确认 ③方案交流 | 阶段建议有推进 |
| 🔵 **B级** | 有实质性进展即可 | 阶段有推进加分 |
| ⚪ **C级** | 有沟通记录即可 | 不做硬性要求 |

---

### 自检清单

请对照以下问题自查：

**S级客户**：
- [ ] 是否见到了客户高层（VP/总经理/总监）？
- [ ] 是否深度确认了客户需求（不只是表面了解）？
- [ ] 是否做了方案价值呈现（N-SABE）？
- [ ] 是否对齐了下一步行动计划？
- [ ] 是否收集了竞品信息？

**A级客户**：
- [ ] 是否见到了关键决策人？
- [ ] 是否确认了核心需求？
- [ ] 是否进行了方案交流？

**B/C级客户**：
- [ ] 是否有实质性进展？
- [ ] 是否推动了商机阶段？

> ⚠️ *无承诺的拜访 = 无效拜访。每次拜访必须争取到 BAC 或 MAC。*`,
      quickActions: [
        { label: '📋 拜访计划', icon: '📋', action: 'visit_plan' },
        { label: '📊 覆盖率统计', icon: '📊', action: 'coverage' },
      ],
    };
  }

  /* ==================== Skill: 覆盖率统计（增强） ==================== */
  if (lc.includes('覆盖率统计') || lc.includes('覆盖率详情')) {
    const totalByTier = { S: 0, A: 0, B: 0, C: 0 } as Record<string, number>;
    const coveredByTier = { S: 0, A: 0, B: 0, C: 0 } as Record<string, number>;
    filteredTasks.forEach(t => { totalByTier[t.customerLevel]++; });
    const coveredSet = new Set(filteredCompletedVisits.map(v => v.customerId));
    filteredTasks.forEach(t => {
      if (coveredSet.has(t.customerId)) coveredByTier[t.customerLevel]++;
    });

    return {
      text: `## 📊 覆盖率统计详情

基于 SABC 分层规则计算实际覆盖率：

### 覆盖率 = 实际拜访次数 / 规则要求次数

| 等级 | 规则要求 | 实际达标 | 覆盖率 | 预警 |
|------|---------|---------|--------|------|
| 🔴 S级 | ≥4次/月 | ${coveredByTier.S}次 | ${totalByTier.S > 0 ? Math.round(coveredByTier.S / totalByTier.S * 100) : 0}% | ${totalByTier.S > 0 && coveredByTier.S / totalByTier.S < 0.8 ? '🚨 <80% 预警' : '✅'} |
| 🟠 A级 | ≥1次/月 | ${coveredByTier.A}次 | ${totalByTier.A > 0 ? Math.round(coveredByTier.A / totalByTier.A * 100) : 0}% | ${totalByTier.A > 0 && coveredByTier.A / totalByTier.A < 0.6 ? '⚠️ <60% 预警' : '✅'} |
| 🔵 B级 | 联系≥1次/月 | ${coveredByTier.B}次 | ${totalByTier.B > 0 ? Math.round(coveredByTier.B / totalByTier.B * 100) : 0}% | — |
| ⚪ C级 | 激活优先 | ${coveredByTier.C}次 | ${totalByTier.C > 0 ? Math.round(coveredByTier.C / totalByTier.C * 100) : 0}% | — |

---

### 💡 预警规则

- **S级 < 80%** → 🚨 预警：战略客户投入不足，商机可能流失
- **A级 < 60%** → ⚠️ 预警：重点客户跟进不足，需加强

### 行动建议
1. S级未达标：立即增加上门频率，每周至少1次
2. A级未达标：排查未覆盖客户，本月内完成拜访
3. B/C级：用低成本方式（电话/微信）维持联系`,
      quickActions: [
        { label: '📋 安排拜访', icon: '📋', action: 'schedule' },
        { label: '🔄 C级激活', icon: '🔄', action: 'activation' },
      ],
    };
  }

  /* ==================== Skill: 激活策略 ==================== */
  if (lc.includes('激活') || lc.includes('沉睡') || lc.includes('唤醒')) {
    const cTierCustomers = filteredTasks.filter(t => t.customerLevel === 'C');
    const activationList = cTierCustomers.map(t => {
      const score = calcActivationScore({
        lastVisitDays: 90 + Math.floor(Math.random() * 100),
        hasRecentBid: Math.random() > 0.5,
        historyAmount: 30 + Math.floor(Math.random() * 150),
      });
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    return {
      text: `## 🔄 C级沉睡客户激活策略

### 激活优先级排序

基于以下维度计算激活优先级分数：

| 维度 | 评分规则 |
|------|---------|
| 距上次联系 | <6个月：+30分；<12个月：+15分 |
| 最近招标记录 | 有：+30分 |
| 历史成交金额 | >200万：+25分；>100万：+15分；>50万：+8分 |

${activationList.length > 0 ? `### 待激活客户（${activationList.length}家）

${activationList.map((t, i) => `${i + 1}. ${normalizeCompanyNames(t.customerName)} — 优先级分数：${t.score}分`).join('\n')}` : '当前 C 级客户已全部激活或无 C 级客户。'}

---

### 激活话术模板

**第一步：低门槛接触**
> "X总，好久没联系了。最近我们在[行业]做了几个项目，有些心得想跟您分享，大概15分钟，您方便吗？"

**第二步：价值吸引**
> 用**行业痛点清单**引发共鸣："这个行业普遍面临[痛点1][痛点2][痛点3]，您这边感受最深的是哪方面？"

**第三步：争取激活承诺**
> MAC：获取客户最新采购计划
> BAC：安排一次30分钟方案交流

> 💡 *激活的本质是重新建立信息流——先触达，再筛选，后重点投入。*`,
      quickActions: [
        { label: '📋 安排激活拜访', icon: '📋', action: 'schedule_activation' },
        { label: '🗣️ 行业痛点清单', icon: '🗣️', action: 'pain_points' },
      ],
    };
  }

  /* ==================== 路线规划 ==================== */
  if (lc.includes('路线') || lc.includes('route')) {
    return {
      text: `## 🗺️ 路线规划建议

建议按区域集中拜访，节省路途时间：

- **深圳片区**：深圳华星光电 → 深圳比亚迪电子（车程约40分钟）
- **东莞片区**：东莞长盈精密 → 东莞立讯精密（车程约30分钟）
- **珠海-中山**：珠海格力电器 → 中山木林森照明（车程约40分钟）

> 💡 路线规划的本质是**提高信息流效率**——同样的时间，覆盖更多客户，获取更多信息。`,
    };
  }

  /* ==================== BPIDC 相关 ==================== */
  if (lc.includes('bpidc') || lc.includes('提问链') || lc.includes('需求挖掘')) {
    const c = customer || filteredTasks[0];
    const cName = c ? normalizeCompanyNames(('customerName' in c ? c.customerName : c.name) || '') : '客户';
    return {
      text: `## 🗣️ BPIDC 需求挖掘提问链

BPIDC 是 Consult 阶段的核心引擎，通过结构化提问引导客户自己认识到问题的严重性。

### ${cName ? `${cName} · ` : ''}提问链示例

| 步骤 | 英文 | 提问模板 |
|------|------|---------|
| **B** | Background | "目前${cName}的${c ? ('currentOpportunity' in c ? c.currentOpportunity : '产线') : '产线'}用的是什么方案？运行情况怎么样？" |
| **P** | Pain | "在这个过程中，遇到最大的困难是什么？" |
| **I** | Impact | "如果这个问题不解决，对交付/成本/产能的影响有多大？有没有量化的数字？" |
| **D** | Diagnose | "我们分析过类似案例，发现核心通常是[X]。贵司是否做过相关测试？" |
| **C** | Commitment | "如果方向对路，您是否愿意让我们提供样品做一次小规模验证？" |

---

### 🧠 BPIDC 设计原则

1. **B 要具体**：切入客户真实的业务场景，不要泛泛而谈
2. **P 要聚焦**：一个痛点一个痛点挖，不要铺太多
3. **I 要量化**：把"有点痛"升级为"必须治"——时间、成本、战略三重影响
4. **D 要共研**：你是顾问，不是推销员。和客户一起诊断，而不是下结论
5. **C 要低风险**：承诺必须是客户容易答应的小步骤

> 💡 *BPIDC 的本质，是通过结构化对话，引导客户自己认识到问题的严重性和采取行动的必要性。*`,
      quickActions: [
        { label: '🗣️ 模拟 BPIDC 对话', icon: '🗣️', action: 'simulate_bpidc' },
        { label: '📊 转换 N-SABE', icon: '📊', action: 'convert_nsabe' },
      ],
    };
  }

  /* ==================== N-SABE 相关 ==================== */
  if (lc.includes('n-sabe') || lc.includes('nsabe') || lc.includes('价值呈现')) {
    return {
      text: `## 📊 N-SABE 价值呈现模型

当需求被 BPIDC 挖掘出来后，用 N-SABE 将方案优势转化为客户认同的价值。

### 模型结构

| 字母 | 含义 | 核心问题 |
|------|------|---------|
| **N** | Need 需求 | 客户最核心的需求是什么？（来自 BPIDC 成果） |
| **S** | Solution 方案 | 你提供的产品/服务是什么？ |
| **A** | Advantages 优势 | 方案的内在能力/特点，强在哪里？ |
| **B** | Benefits 利益 | ⭐ **灵魂**！优势转化为客户能感知的好处（量化） |
| **E** | Evidence 证据 | 第三方证明：案例、数据、检测报告 |

### 实战示例

> **N**："基于刚才的交流，您最关心的是良率波动问题，直接影响了交付和成本。"
> **S**："我们为您设计的是一套自动化视觉检测方案。"
> **A**："采用 AI 视觉算法，实时识别缺陷并自动调整参数，检测精度 99.9%。"
> **B**："这意味着良率从 95% 提升到 99% 以上，每月减少返工成本约 50 万，助力达成年度降本 12% 的 KPI。"
> **E**："这是同行业 A 公司应用后的数据报告。"

---

> 💡 *客户购买的从来不是"不同"，而是这个"不同"能带来的额外价值。*`,
      quickActions: [
        { label: '🗣️ 模拟 N-SABE 呈现', icon: '🗣️', action: 'simulate_nsabe' },
      ],
    };
  }

  /* ==================== STAR-R 成功故事 ==================== */
  if (lc.includes('star') || lc.includes('成功故事') || lc.includes('案例故事')) {
    return {
      text: `## ⭐ STAR-R 成功故事模型

用故事让价值可感知。在开场（Open）和咨询（Consult）阶段均可使用。

### 模型结构

| 字母 | 含义 | 内容 |
|------|------|------|
| **S** | Situation 情境 | 客户当时面临什么挑战、痛点 |
| **T** | Task 任务 | 客户想达成什么目标 |
| **A** | Action 行动 | 我们提供了什么方案，一起做了什么 |
| **R** | Result 结果 | 带来了什么可衡量的价值（量化） |
| **R** | Relevance 谨慎关联 | 开放性问题过渡，不替客户下结论 |

### 示例（电子制造行业）

> **S**："深圳华星光电在去年Q3遇到了一个棘手问题——注塑车间良品率波动严重，只有95%，导致每月报废损失超过50万。"
>
> **T**："他们的目标是在3个月内将良率提升到98%以上，同时减少20%的人工依赖。"
>
> **A**："我们为他们部署了一套注塑自动化取件方案，含AI视觉检测和自动分拣，12台注塑机全部接入MES。"
>
> **R**："3个月后，良品率从95.2%提升到98.8%，人员从36人减少到12人，投资回收期仅14个月。"
>
> **R（关联）**："这个案例展现了我们在面板行业注塑自动化方面的经验。不知道贵司在类似环节是否也有考虑？"

### ⚠️ 关键提示

最后一个 R 要**特别小心**：
- ❌ "你们肯定也有同样问题" —— 替客户下诊断，容易引起反感
- ✅ 递过去一面镜子，让客户自己看、自己琢磨

> 💡 *眼见为实——看到同类客户做成了，心里的疑虑就会消解大半。*`,
      quickActions: [
        { label: '📋 查看标杆案例库', icon: '📋', action: 'case_library' },
      ],
    };
  }

  /* ==================== PBC 开场 ==================== */
  if (lc.includes('pbc') || lc.includes('开场') || lc.includes('open')) {
    const c = customer;
    const cName = c ? normalizeCompanyNames(c.name) : '客户';
    const contact = c?.keyContacts[0]?.name || 'X总';
    return {
      text: `## 🎯 PBC 开场模型（Open 阶段）

> *销售的本质，从来不是"卖东西"，而是"赢得信任"。开场30秒，奠定信任基调。*

### PBC 模型

| 字母 | 含义 | 核心 |
|------|------|------|
| **P** | Purpose 目的 | 告知客户"这次交流对您有什么价值"，直击痛点 |
| **B** | Behavior 行为 | 通过守时、着装、礼仪传递专业可靠的第一印象 |
| **C** | Competence 能力 | 用证据（案例/数据）而非自夸，展示问题解决能力 |

### ${cName ? `${cName} · ` : ''}开场话术

> "${contact}，针对贵司${c ? c.currentOpportunity : '当前项目'}在${c ? c.opportunityStage : '推进'}阶段面临的挑战（P），结合我们曾协助同行业客户解决同类问题后效率提升15%的经验（C），今天重点探讨如何帮助贵司推进方案落地（P）。预计40分钟，先看技术数据再探讨路径。您看安排是否合适？（B）"

### 三把钥匙 —— 激发客户兴趣

| 场景 | 首选钥匙 |
|------|---------|
| 有完美对标案例 | **成功故事**（STAR-R） |
| 没有对标案例，但有行业积累 | **行业痛点清单** |
| 客户完全陌生 | **价值主张** |

> 💡 *顶级销售善于"造势"——用行业趋势让客户看清方向，用他山之石让客户看到可能。*`,
      quickActions: [
        { label: '🗣️ 模拟开场对话', icon: '🗣️', action: 'simulate_open' },
        { label: '⭐ STAR-R 案例', icon: '⭐', action: 'star_r' },
      ],
    };
  }

  /* ==================== 默认回复 ==================== */
  return {
    text: `## 🧠 ${currentRep.name}，需要什么帮助？

### 八大 Skill

输入关键词即可触发：

| Skill | 关键词 | 说明 |
|-------|--------|------|
| 🏷️ 客户分层 | "客户分层" "SABC" | 分级规则+差异化运营 |
| 📊 拜访频率 | "拜访频率" "到期" "超期" | 自动预警计算 |
| 📂 行业案例 | "行业案例" "标杆案例" | 按行业+产品匹配 |
| 🗣️ 话术推荐 | "话术推荐" "推荐话术" | 关注点×阶段→组合 |
| ⚔️ 竞品分析 | "竞品" "竞对" | 历史竞对+差异化 |
| ✅ 有效性评估 | "有效性" "拜访评估" | 五个一/三个一自检 |
| 📊 覆盖率统计 | "覆盖率统计" | 各级覆盖率+预警 |
| 🔄 激活策略 | "激活" "沉睡客户" | 优先级排序+话术 |

### POCC 方法论

| 关键词 | 输出 |
|--------|------|
| "准备"/点击客户卡片 | POCC全流程 |
| "PBC"/"开场话术" | 开场模型 |
| "BPIDC"/"提问链" | 需求挖掘 |
| "N-SABE"/"价值呈现" | 价值传递 |
| "STAR-R"/"案例故事" | 成功故事 |
| "价格异议"/"异议" | LSCPA异议处理 |
| "收官"/"Close" | 承诺闭环 |`,
    quickActions: [
      { label: '📋 本周拜访概览', icon: '📋', action: 'weekly_overview' },
      { label: '📊 拜访频率', icon: '📊', action: 'check_frequency' },
      { label: '🔄 C级激活', icon: '🔄', action: 'activation' },
      { label: '🗣️ 话术推荐', icon: '🗣️', action: 'script_recommend' },
    ],
  };
}

/* ---------- store ---------- */

const defaultRep = salesReps.find(rep => rep.level === 3) || salesReps[0];

export const useAppStore = create<AppState>((set, get) => {
  const init = computeFiltered(defaultRep);

  return {
    currentRep: defaultRep,
    selectedCustomerId: null,
    selectedCustomer: null,
    messages: getInitialMessages(defaultRep.name, init.ft.length),
    isTyping: false,
    inputValue: '',
    previousResponseId: null,
    agentEnabled: true,
    lastAgentError: null,
    modelConfigOpen: false,
    modelProviderLabel: '本地规则',
    runtimeConfig: null,
    modelConnectionStatus: 'idle',
    modelConnectionMessage: null,
    taskPeriod: '本周',
    completedPeriod: '本月',
    coveragePeriod: '本月',
    activeNav: '拜访看板',
    leftPanelCollapsed: false,
    showAddVisit: false,

    filteredCustomers: init.fc,
    filteredTasks: init.ft,
    filteredCompletedVisits: init.fcv,
    filteredCoverage: init.fCoverage,
    filteredKnowledge: init.fk,

    switchRep: (repId) => {
      const rep = salesReps.find(r => r.id === repId);
      if (!rep) return;
      const f = computeFiltered(rep);
      set({
        currentRep: rep,
        filteredCustomers: f.fc,
        filteredTasks: f.ft,
        filteredCompletedVisits: f.fcv,
        filteredCoverage: f.fCoverage,
        filteredKnowledge: f.fk,
        messages: getInitialMessages(rep.name, f.ft.length),
        selectedCustomerId: null,
        selectedCustomer: null,
        previousResponseId: null,
        lastAgentError: null,
      });
    },

    setSelectedCustomer: (customerId) => {
      const customer = customerId ? customers.find(c => c.id === customerId) || null : null;
      set({ selectedCustomerId: customerId, selectedCustomer: customer });
    },

    addMessage: (message) => {
      set((state) => ({ messages: [...state.messages, message] }));
    },

    setIsTyping: (isTyping) => set({ isTyping }),
    setInputValue: (value) => set({ inputValue: value }),
    setAgentEnabled: (enabled) => set({ agentEnabled: enabled }),
    setModelConfigOpen: (open) => set({ modelConfigOpen: open }),
    setModelProviderLabel: (label) => set({ modelProviderLabel: label }),
    setRuntimeConfig: (config) => set({ runtimeConfig: config }),
    setModelConnectionStatus: (status) => set({ modelConnectionStatus: status }),
    setModelConnectionMessage: (message) => set({ modelConnectionMessage: message }),
    setTaskPeriod: (period) => set({ taskPeriod: period }),
    setCompletedPeriod: (period) => set({ completedPeriod: period }),
    setCoveragePeriod: (period) => set({ coveragePeriod: period }),
    setActiveNav: (nav) => set({ activeNav: nav }),
    setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
    setShowAddVisit: (show) => set({ showAddVisit: show }),

    triggerCustomerContext: (customerId, contextType) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;
      set({ selectedCustomerId: customerId, selectedCustomer: customer });

      let userMessage = '';
      if (contextType === 'task') {
        userMessage = `帮我准备一下${normalizeCompanyNames(customer.name)}的拜访`;
      } else if (contextType === 'completed') {
        userMessage = `分析一下${normalizeCompanyNames(customer.name)}的拜访情况，并推荐跟进策略`;
      } else if (contextType === 'uncovered') {
        userMessage = `${normalizeCompanyNames(customer.name)}已经很久没拜访了，帮我分析一下并推荐拜访策略`;
      } else {
        userMessage = `请整理${normalizeCompanyNames(customer.name)}的客户详细信息，包含客户概况、关键联系人、当前商机、商机阶段、最近拜访情况和建议的经营重点。`;
      }

      get().sendMessage(userMessage);
    },

    triggerKnowledgeContext: (item) => {
      const userMsg: ChatMessage = {
        id: `msg-${++messageIdCounter}`,
        role: 'user',
        content: `展开话术：${item.title}`,
        timestamp: new Date(),
      };

      const aiMsg: ChatMessage = {
        id: `msg-${++messageIdCounter}`,
        role: 'assistant',
        content: `## 💡 ${normalizeCompanyNames(item.title)}\n\n**分类**：${item.category} | **标签**：${item.tags.join('、')}\n\n${normalizeCompanyNames(item.content)}`,
        timestamp: new Date(),
        quickActions: [
          { label: '📋 复制内容', icon: '📋', action: 'copy' },
          { label: '💾 保存到话术库', icon: '💾', action: 'save' },
        ],
        meta: {
          source: 'fallback',
        },
      };

      set((state) => ({ messages: [...state.messages, userMsg] }));
      set({ isTyping: true });
      setTimeout(() => {
        set((state) => ({ messages: [...state.messages, aiMsg], isTyping: false }));
      }, 800);
    },

    sendMessage: async (content) => {
      if (!content.trim()) return;

      const userMsg: ChatMessage = {
        id: `msg-${++messageIdCounter}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      set((state) => ({ messages: [...state.messages, userMsg], inputValue: '', isTyping: true }));

      const state = get();

      if (state.agentEnabled) {
        try {
          const response = await sendAgentChat({
            message: content.trim(),
            previousResponseId: state.previousResponseId,
            context: buildAgentContext(state),
            runtimeConfig: state.runtimeConfig,
          });

          const aiMsg: ChatMessage = {
            id: `msg-${++messageIdCounter}`,
            role: 'assistant',
            content: response.text,
            timestamp: new Date(),
            quickActions: response.quickActions,
            meta: {
              model: response.model,
              toolCalls: response.toolCalls,
              source: 'agent',
              coachRole: response.coachMeta?.role ?? null,
              coachMode: response.coachMeta?.mode ?? null,
              coachDataLevel: response.coachMeta?.dataLevel ?? null,
              provider: response.debugMeta?.provider ?? null,
              apiMode: response.debugMeta?.apiMode ?? null,
              endpoint: response.debugMeta?.endpoint ?? null,
            },
          };

          set((currentState) => ({
            messages: [...currentState.messages, aiMsg],
            isTyping: false,
            previousResponseId: response.responseId,
            lastAgentError: null,
          }));
          return;
        } catch (error) {
          set({
            lastAgentError: error instanceof Error ? error.message : 'Agent request failed',
          });
        }
      }

      const fallback = generateAIResponse(content, get());
      const aiMsg: ChatMessage = {
        id: `msg-${++messageIdCounter}`,
        role: 'assistant',
        content: fallback.text,
        timestamp: new Date(),
        quickActions: fallback.quickActions,
        meta: {
          source: 'fallback',
        },
      };

      set((currentState) => ({
        messages: [...currentState.messages, aiMsg],
        isTyping: false,
      }));
    },

    clearMessages: () => {
      const { currentRep, filteredTasks } = get();
      set({
        messages: getInitialMessages(currentRep.name, filteredTasks.length),
        previousResponseId: null,
        lastAgentError: null,
      });
    },
  };
});
