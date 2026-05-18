/* ========= 拓斯达 SABC 分层规则 ========= */

export interface TierRule {
  tier: 'S' | 'A' | 'B' | 'C';
  label: string;
  definition: string;
  estimatedShare: string;
  managementMethod: string;
  visitFrequency: number;   // 每月最少上门次数
  contactFrequency: number; // 每月最少联系次数
  overdueDays: number;      // 超期天数阈值
  fiveChecks: string[];     // 有效拜访检查项
  color: string;
}

export const TIER_RULES: TierRule[] = [
  {
    tier: 'S',
    label: '战略客户',
    definition: '高层指定，高价值、高战略意义客户',
    estimatedShare: '约5%',
    managementMethod: '五个一工程：每月上门≥4次、活动邀约、高层互动、年度关怀、驻场服务',
    visitFrequency: 4,
    contactFrequency: 4,
    overdueDays: 7,
    fiveChecks: ['客户高层会面', '需求深度确认', '方案价值呈现', '行动计划对齐', '竞品信息收集'],
    color: '#DC2626',
  },
  {
    tier: 'A',
    label: '重点客户',
    definition: '重点运营活跃客户，近两年有成交',
    estimatedShare: '约20%',
    managementMethod: '三个一工程：每月联系、季度上门拜访、年度高层互动',
    visitFrequency: 0,
    contactFrequency: 1,
    overdueDays: 90,
    fiveChecks: ['关键人会面', '需求确认', '方案交流'],
    color: '#EA580C',
  },
  {
    tier: 'B',
    label: '活跃客户',
    definition: '近两年内有成交的活跃客户，需定期维护',
    estimatedShare: '约30%',
    managementMethod: '每月联系1次，无需强制上门拜访',
    visitFrequency: 0,
    contactFrequency: 1,
    overdueDays: 30,
    fiveChecks: ['有实质性进展', '商机阶段有推进'],
    color: '#16A34A',
  },
  {
    tier: 'C',
    label: '沉睡客户',
    definition: '近两年未成交的沉睡客户，需激活',
    estimatedShare: '约45%',
    managementMethod: '系统自动标记，依赖销售自主跟进，缺乏激活策略',
    visitFrequency: 0,
    contactFrequency: 0,
    overdueDays: 180,
    fiveChecks: ['有沟通记录'],
    color: '#7B8794',
  },
];

/* ========= 行业 + 产品线匹配 ========= */
export const INDUSTRY_CASES = [
  { industry: '面板制造', product: '注塑自动化', customer: '深圳华星光电', amount: 280, result: '良品率95.2%→98.8%，人员36→12人，回收期14个月' },
  { industry: '3C代工', product: '整线自动化', customer: '深圳富士康科技', amount: 480, result: '人员85→32人，OEE 72%→89%，日产能12000→15000件' },
  { industry: '消费电子', product: 'CNC上下料', customer: '深圳比亚迪电子', amount: 180, result: '人员40→8人，利用率65%→92%，换型2h→30min' },
  { industry: '家电制造', product: '注塑上下料工作站', customer: '珠海格力电器', amount: 400, result: '商务评估' },
  { industry: '锂电池', product: '注塑+组装', customer: '深圳欣旺达', amount: 120, result: '方案评审中' },
  { industry: 'LED封装', product: '点胶机器人', customer: '中山木林森照明', amount: 60, result: '初步接触' },
  { industry: '声学器件', product: '微组装', customer: '深圳瑞声科技', amount: 90, result: '分期方案沟通中' },
  { industry: '电池模组', product: 'PACK线', customer: '惠州德赛电池', amount: 80, result: '初次接触' },
  { industry: '金属结构件', product: 'CNC自动化', customer: '东莞长盈精密', amount: 150, result: 'CNC上下料需求确认' },
  { industry: '连接器/精密件', product: 'CNC上下料', customer: '东莞立讯精密', amount: 180, result: '待拜访激活' },
];

/* ========= 话术推荐规则 ========= */
export interface ScriptRule {
  concern: string;       // 客户关注点
  stage: string;         // 商机阶段
  scriptType: string;    // 推荐话术类型
  framework: string;     // 使用的方法论
}

export const SCRIPT_RULES: ScriptRule[] = [
  { concern: '开机率/效率', stage: '需求挖掘', scriptType: 'BPIDC提问链', framework: 'BPIDC' },
  { concern: '提效/降本', stage: '需求挖掘', scriptType: '价值主张 + 行业痛点', framework: 'PBC' },
  { concern: '换人/招工难', stage: '方案评估', scriptType: 'N-SABE价值呈现', framework: 'N-SABE' },
  { concern: '良品率', stage: '方案评估', scriptType: 'STAR-R成功案例', framework: 'STAR-R' },
  { concern: '价格/成本', stage: '合同谈判', scriptType: 'TCO总成本法', framework: 'LSCPA' },
  { concern: '保供/交付', stage: '合同谈判', scriptType: 'N-SABE + 质量协议', framework: 'N-SABE' },
  { concern: '技术参数', stage: '技术评审', scriptType: 'BPIDC诊断 + 数据对比', framework: 'BPIDC' },
];

/* ========= 激活优先级评分 ========= */
export function calcActivationScore(c: {
  lastVisitDays: number;
  hasRecentBid: boolean;
  historyAmount: number;
}): number {
  let score = 0;
  // 距上次联系<6个月（180天）加分
  if (c.lastVisitDays < 180) score += 30;
  else if (c.lastVisitDays < 365) score += 15;
  // 最近有招标记录
  if (c.hasRecentBid) score += 30;
  // 历史成交金额
  if (c.historyAmount > 200) score += 25;
  else if (c.historyAmount > 100) score += 15;
  else if (c.historyAmount > 50) score += 8;
  return score;
}
