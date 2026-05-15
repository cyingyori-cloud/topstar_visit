export interface Contact {
  name: string;
  title: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  level: 'S' | 'A' | 'B' | 'C';
  industry: string;
  address: string;
  region: string;
  keyContacts: Contact[];
  currentOpportunity: string;
  opportunityAmount: number;
  opportunityStage: string;
  opportunityPercent: number;
}

export interface VisitTask {
  id: string;
  customerId: string;
  customerName: string;
  customerLevel: 'S' | 'A' | 'B' | 'C';
  confirmationStatus?: 'pending_confirmation' | 'confirmed';
  visitType: '高层拜访' | '客情回访' | '商务谈判' | '方案汇报' | '技术交流' | '初次拜访';
  visitPurpose: string;
  visitTime: string; // ISO string or '待定'
  location: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  contacts: Contact[];
  lastVisitDate: string;
  lastVisitSummary: string;
  dayLabel: string; // '今天', '明天', etc.
  visitGoal: string;
  expectedCommitment: string;
}

export interface CompletedVisit {
  id: string;
  customerId: string;
  customerName: string;
  customerLevel: 'S' | 'A' | 'B' | 'C';
  visitDate: string;
  summary: string;
  outcome: string;
  nextSteps: string;
  archived: boolean;
}

export interface CoverageData {
  total: number;
  covered: number;
  byLevel: {
    level: 'S' | 'A' | 'B' | 'C';
    total: number;
    covered: number;
  }[];
  uncoveredHighPriority: {
    customerId: string;
    customerName: string;
    customerLevel: 'S' | 'A' | 'B' | 'C';
    daysSinceLastVisit: number;
  }[];
}

export type KnowledgeAudience = 'all' | 'director' | 'manager' | 'sales';

export interface KnowledgeItem {
  id: string;
  title: string;
  category: '行业方案' | '拜访话术' | '异议处理' | '竞品对比' | '成功案例';
  content: string;
  applicableIndustries: string[];
  applicableLevels: ('S' | 'A' | 'B' | 'C')[];
  tags: string[];
  hot?: boolean;
  audience: KnowledgeAudience;
}

export interface CompletionGoal {
  level: 'S' | 'A' | 'B' | 'C';
  completed: number;
  target: number;
}

// ========== 30 家客户（真实贴合 SABC 分层规则） ==========
// S级(4家): ≥4次/月上门, 超期7天, 商机大(50~120万)
// A级(6家): ≥1次/月上门, 超期7天, 商机中(20~60万)
// B级(10家): 月度联系≥1次, 超期30天, 商机小(8~25万)
// C级(10家): 激活优先, 超期30天, 商机极小(3~10万)

export const customers: Customer[] = [
  // === S级 · 战略客户（4家）===
  {
    id: 'c1',
    name: '深圳华星光电',
    level: 'S',
    industry: '面板制造',
    address: '深圳市光明区华星光电产业园',
    region: '深圳光明',
    keyContacts: [
      { name: '王总', title: '制造部VP', phone: '138****1001' },
      { name: '李工', title: '设备部经理', phone: '139****1002' },
    ],
    currentOpportunity: '注塑自动化产线',
    opportunityAmount: 120,
    opportunityStage: '方案评估',
    opportunityPercent: 40,
  },
  {
    id: 'c2',
    name: '富士康科技',
    level: 'S',
    industry: '3C代工',
    address: '深圳市龙华区富士康科技园',
    region: '深圳龙华',
    keyContacts: [
      { name: '陈总', title: '自动化部总监', phone: '136****2001' },
    ],
    currentOpportunity: '整线自动化',
    opportunityAmount: 95,
    opportunityStage: '技术评审',
    opportunityPercent: 60,
  },
  {
    id: 'c3',
    name: '立讯精密',
    level: 'S',
    industry: '连接器/精密件',
    address: '东莞市清溪镇立讯精密工业园',
    region: '东莞清溪',
    keyContacts: [
      { name: '赵总', title: '采购总监', phone: '137****3001' },
    ],
    currentOpportunity: 'CNC上下料',
    opportunityAmount: 80,
    opportunityStage: '需求确认',
    opportunityPercent: 20,
  },
  {
    id: 'c9',
    name: '格力电器',
    level: 'S',
    industry: '家电制造',
    address: '珠海市前山格力工业城',
    region: '珠海前山',
    keyContacts: [
      { name: '吴总', title: '智能制造部总监', phone: '138****9001' },
      { name: '孙工', title: '注塑车间主任', phone: '139****9002' },
    ],
    currentOpportunity: '注塑岛',
    opportunityAmount: 110,
    opportunityStage: '方案评估',
    opportunityPercent: 45,
  },

  // === A级 · 重点客户（6家）===
  {
    id: 'c4',
    name: '比亚迪电子',
    level: 'A',
    industry: '消费电子',
    address: '深圳市坪山区比亚迪工业园',
    region: '深圳坪山',
    keyContacts: [
      { name: '刘经理', title: '设备采购经理', phone: '135****4001' },
    ],
    currentOpportunity: '注塑取件',
    opportunityAmount: 55,
    opportunityStage: '方案沟通',
    opportunityPercent: 30,
  },
  {
    id: 'c5',
    name: '长盈精密',
    level: 'A',
    industry: '金属结构件',
    address: '东莞市松山湖科技园',
    region: '东莞松山湖',
    keyContacts: [
      { name: '张工', title: '技术部主管', phone: '133****5001' },
    ],
    currentOpportunity: 'CNC自动化',
    opportunityAmount: 45,
    opportunityStage: '初步接触',
    opportunityPercent: 15,
  },
  {
    id: 'c7',
    name: '欣旺达',
    level: 'A',
    industry: '锂电池',
    address: '深圳市宝安区欣旺达工业园',
    region: '深圳宝安',
    keyContacts: [
      { name: '周总', title: '制造部经理', phone: '132****7001' },
    ],
    currentOpportunity: '注塑+组装',
    opportunityAmount: 60,
    opportunityStage: '方案评估',
    opportunityPercent: 35,
  },
  {
    id: 'c11',
    name: 'TCL华星',
    level: 'A',
    industry: '面板制造',
    address: '深圳市南山区TCL大厦',
    region: '深圳南山',
    keyContacts: [
      { name: '马总', title: '设备总监', phone: '138****1101' },
    ],
    currentOpportunity: '模组段自动化',
    opportunityAmount: 50,
    opportunityStage: '需求确认',
    opportunityPercent: 25,
  },
  {
    id: 'c12',
    name: '大族激光',
    level: 'A',
    industry: '激光设备',
    address: '深圳市南山区大族科技中心',
    region: '深圳南山',
    keyContacts: [
      { name: '杨工', title: '自动化经理', phone: '136****1201' },
    ],
    currentOpportunity: '焊接机器人',
    opportunityAmount: 38,
    opportunityStage: '方案沟通',
    opportunityPercent: 20,
  },
  {
    id: 'c13',
    name: '深天马',
    level: 'A',
    industry: '面板制造',
    address: '深圳市龙岗区天马微电子',
    region: '深圳龙岗',
    keyContacts: [
      { name: '林总', title: '制造总监', phone: '137****1301' },
    ],
    currentOpportunity: '偏光片贴附',
    opportunityAmount: 42,
    opportunityStage: '初步接触',
    opportunityPercent: 10,
  },

  // === B级 · 活跃客户（10家）===
  {
    id: 'c6',
    name: '德赛电池',
    level: 'B',
    industry: '电池模组',
    address: '惠州市仲恺高新区德赛工业园',
    region: '惠州仲恺',
    keyContacts: [
      { name: '黄经理', title: '产线经理', phone: '131****6001' },
    ],
    currentOpportunity: 'PACK线',
    opportunityAmount: 22,
    opportunityStage: '初次接触',
    opportunityPercent: 10,
  },
  {
    id: 'c8',
    name: '木林森照明',
    level: 'B',
    industry: 'LED封装',
    address: '中山市小榄镇木林森产业园',
    region: '中山小榄',
    keyContacts: [
      { name: '何工', title: '设备工程师', phone: '130****8001' },
    ],
    currentOpportunity: '点胶机器人',
    opportunityAmount: 18,
    opportunityStage: '初步了解',
    opportunityPercent: 10,
  },
  {
    id: 'c10',
    name: '瑞声科技',
    level: 'B',
    industry: '声学器件',
    address: '深圳市南山区瑞声科技大厦',
    region: '深圳南山',
    keyContacts: [
      { name: '郑经理', title: '产线主管', phone: '137****0001' },
    ],
    currentOpportunity: '微组装',
    opportunityAmount: 25,
    opportunityStage: '初步接触',
    opportunityPercent: 15,
  },
  {
    id: 'c14',
    name: '亿纬锂能',
    level: 'B',
    industry: '锂电池',
    address: '惠州市惠城区亿纬工业园',
    region: '惠州惠城',
    keyContacts: [
      { name: '谢工', title: '设备主管', phone: '135****1401' },
    ],
    currentOpportunity: '电芯分选',
    opportunityAmount: 20,
    opportunityStage: '初步了解',
    opportunityPercent: 8,
  },
  {
    id: 'c15',
    name: '信利光电',
    level: 'B',
    industry: '面板制造',
    address: '汕尾市城区信利工业园',
    region: '汕尾城区',
    keyContacts: [
      { name: '冯经理', title: '工程经理', phone: '134****1501' },
    ],
    currentOpportunity: '模组检测',
    opportunityAmount: 15,
    opportunityStage: '初次接触',
    opportunityPercent: 5,
  },
  {
    id: 'c16',
    name: '蓝思科技',
    level: 'B',
    industry: '玻璃面板',
    address: '长沙市浏阳市蓝思科技园',
    region: '长沙浏阳',
    keyContacts: [
      { name: '唐总', title: '设备总监', phone: '133****1601' },
    ],
    currentOpportunity: '玻璃上下料',
    opportunityAmount: 28,
    opportunityStage: '方案沟通',
    opportunityPercent: 18,
  },
  {
    id: 'c17',
    name: '伯恩光学',
    level: 'B',
    industry: '玻璃面板',
    address: '惠州市惠阳区伯恩工业园',
    region: '惠州惠阳',
    keyContacts: [
      { name: '许工', title: '自动化主管', phone: '132****1701' },
    ],
    currentOpportunity: 'CNC自动化',
    opportunityAmount: 16,
    opportunityStage: '初步了解',
    opportunityPercent: 8,
  },
  {
    id: 'c18',
    name: '领益智造',
    level: 'B',
    industry: '精密结构件',
    address: '东莞市黄江镇领益工业园',
    region: '东莞黄江',
    keyContacts: [
      { name: '曹经理', title: '设备经理', phone: '131****1801' },
    ],
    currentOpportunity: '冲压自动化',
    opportunityAmount: 12,
    opportunityStage: '初次接触',
    opportunityPercent: 5,
  },
  {
    id: 'c19',
    name: '欧菲光',
    level: 'B',
    industry: '光学模组',
    address: '深圳市光明区欧菲光产业园',
    region: '深圳光明',
    keyContacts: [
      { name: '彭工', title: '工艺经理', phone: '130****1901' },
    ],
    currentOpportunity: '镜头组装',
    opportunityAmount: 14,
    opportunityStage: '初步了解',
    opportunityPercent: 6,
  },
  {
    id: 'c20',
    name: '合力泰',
    level: 'B',
    industry: '电子元器件',
    address: '吉安市吉州区合力泰工业园',
    region: '吉安吉州',
    keyContacts: [
      { name: '蒋经理', title: '采购主管', phone: '139****2001' },
    ],
    currentOpportunity: '贴片自动化',
    opportunityAmount: 10,
    opportunityStage: '初次接触',
    opportunityPercent: 4,
  },

  // === C级 · 沉睡客户（10家）===
  {
    id: 'c21',
    name: '京东方',
    level: 'C',
    industry: '面板制造',
    address: '北京市经济技术开发区',
    region: '北京亦庄',
    keyContacts: [
      { name: '韩总', title: '设备部长', phone: '138****2101' },
    ],
    currentOpportunity: '模组搬运',
    opportunityAmount: 8,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c22',
    name: '天马微电子',
    level: 'C',
    industry: '面板制造',
    address: '上海市浦东新区天马大厦',
    region: '上海浦东',
    keyContacts: [
      { name: '邓工', title: '技术主管', phone: '137****2201' },
    ],
    currentOpportunity: '检测设备',
    opportunityAmount: 6,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c23',
    name: '维信诺',
    level: 'C',
    industry: 'OLED面板',
    address: '合肥市新站区维信诺产业园',
    region: '合肥新站',
    keyContacts: [
      { name: '曾经理', title: '设备经理', phone: '136****2301' },
    ],
    currentOpportunity: '蒸镀设备',
    opportunityAmount: 10,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c24',
    name: '柔宇科技',
    level: 'C',
    industry: '柔性屏',
    address: '深圳市龙岗区柔宇国际',
    region: '深圳龙岗',
    keyContacts: [
      { name: '董工', title: '工艺主管', phone: '135****2401' },
    ],
    currentOpportunity: '贴合设备',
    opportunityAmount: 5,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c25',
    name: '汇顶科技',
    level: 'C',
    industry: '芯片设计',
    address: '深圳市福田区汇顶大厦',
    region: '深圳福田',
    keyContacts: [
      { name: '袁总', title: '运营总监', phone: '134****2501' },
    ],
    currentOpportunity: '封装测试',
    opportunityAmount: 4,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c26',
    name: '兆易创新',
    level: 'C',
    industry: '芯片设计',
    address: '北京市海淀区兆易大厦',
    region: '北京海淀',
    keyContacts: [
      { name: '田工', title: '设备工程师', phone: '133****2601' },
    ],
    currentOpportunity: '晶圆搬运',
    opportunityAmount: 7,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c27',
    name: '韦尔股份',
    level: 'C',
    industry: '半导体',
    address: '上海市浦东新区韦尔大厦',
    region: '上海浦东',
    keyContacts: [
      { name: '卢经理', title: '采购经理', phone: '132****2701' },
    ],
    currentOpportunity: '测试分选',
    opportunityAmount: 6,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c28',
    name: '闻泰科技',
    level: 'C',
    industry: 'ODM代工',
    address: '嘉兴市南湖区闻泰科技园',
    region: '嘉兴南湖',
    keyContacts: [
      { name: '钱工', title: '自动化主管', phone: '131****2801' },
    ],
    currentOpportunity: '整线改造',
    opportunityAmount: 9,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c29',
    name: '龙旗科技',
    level: 'C',
    industry: 'ODM代工',
    address: '上海市徐汇区龙旗大厦',
    region: '上海徐汇',
    keyContacts: [
      { name: '汪经理', title: '设备主管', phone: '130****2901' },
    ],
    currentOpportunity: '组装线',
    opportunityAmount: 5,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
  {
    id: 'c30',
    name: '华勤技术',
    level: 'C',
    industry: 'ODM代工',
    address: '上海市浦东新区华勤大厦',
    region: '上海浦东',
    keyContacts: [
      { name: '秦工', title: '工程经理', phone: '139****3001' },
    ],
    currentOpportunity: 'SMT产线',
    opportunityAmount: 3,
    opportunityStage: '休眠',
    opportunityPercent: 0,
  },
];

// ========== Visit Tasks ==========
export const visitTasks: VisitTask[] = [
  {
    id: 't1',
    customerId: 'c1',
    customerName: '深圳华星光电',
    customerLevel: 'S',
    confirmationStatus: 'pending_confirmation',
    visitType: '高层拜访',
    visitPurpose: 'Q3设备采购跟进',
    visitTime: '14:00',
    location: '深圳市光明区华星光电产业园',
    status: 'pending',
    contacts: [{ name: '王总', title: '制造部VP', phone: '138****1001' }],
    lastVisitDate: '2026-05-12',
    lastVisitSummary: '讨论了Q3设备采购计划，王总对注塑取件节拍数据表示认可',
    dayLabel: '今天',
    visitGoal: '推动客户高层确认 Q3 采购节奏，并拿到下一轮方案评审会时间。',
    expectedCommitment: '约定设备采购评审会，并明确预算确认节点。',
  },
  {
    id: 't2',
    customerId: 'c5',
    customerName: '长盈精密',
    customerLevel: 'A',
    confirmationStatus: 'pending_confirmation',
    visitType: '技术交流',
    visitPurpose: '自动化产线方案沟通',
    visitTime: '16:00',
    location: '东莞市松山湖科技园',
    status: 'pending',
    contacts: [{ name: '张工', title: '技术部主管', phone: '133****5001' }],
    lastVisitDate: '2026-04-20',
    lastVisitSummary: 'CNC自动化需求详细了解，确认5台上下料需求',
    dayLabel: '今天',
    visitGoal: '确认技术边界和客户当前对节拍、精度、换型效率的核心要求。',
    expectedCommitment: '拿到产线参数和下一次技术评审的参与人名单。',
  },
  {
    id: 't3',
    customerId: 'c6',
    customerName: '德赛电池',
    customerLevel: 'B',
    confirmationStatus: 'pending_confirmation',
    visitType: '初次拜访',
    visitPurpose: '初次接触',
    visitTime: '待定',
    location: '惠州市仲恺高新区德赛工业园',
    status: 'pending',
    contacts: [{ name: '黄经理', title: '产线经理', phone: '131****6001' }],
    lastVisitDate: '',
    lastVisitSummary: '',
    dayLabel: '今天',
    visitGoal: '建立首次信任，快速摸清 PACK 线自动化现状和主要痛点。',
    expectedCommitment: '获取关键联系人、产线现状和后续技术交流机会。',
  },
  {
    id: 't4',
    customerId: 'c9',
    customerName: '格力电器',
    customerLevel: 'S',
    confirmationStatus: 'confirmed',
    visitType: '方案汇报',
    visitPurpose: '注塑岛方案汇报',
    visitTime: '10:00',
    location: '珠海市前山格力工业城',
    status: 'pending',
    contacts: [
      { name: '吴总', title: '智能制造部总监', phone: '138****9001' },
    ],
    lastVisitDate: '2026-05-06',
    lastVisitSummary: '方案初步获认可，需细化注塑岛布局',
    dayLabel: '明天',
    visitGoal: '让客户认可注塑岛总体方案和实施节奏，推动进入商务评估。',
    expectedCommitment: '获得客户对方案方向的确认，并约定商务评审时间。',
  },
  {
    id: 't5',
    customerId: 'c8',
    customerName: '木林森照明',
    customerLevel: 'B',
    confirmationStatus: 'confirmed',
    visitType: '技术交流',
    visitPurpose: '点胶方案介绍',
    visitTime: '14:30',
    location: '中山市小榄镇木林森产业园',
    status: 'pending',
    contacts: [{ name: '何工', title: '设备工程师', phone: '130****8001' }],
    lastVisitDate: '',
    lastVisitSummary: '首次现场拜访',
    dayLabel: '明天',
    visitGoal: '围绕点胶工艺一致性和节拍问题建立技术认知。',
    expectedCommitment: '获取工艺参数与当前点胶痛点的具体数据。',
  },
  {
    id: 't6',
    customerId: 'c7',
    customerName: '欣旺达',
    customerLevel: 'A',
    confirmationStatus: 'confirmed',
    visitType: '客情回访',
    visitPurpose: '注塑+组装方案评审跟进',
    visitTime: '10:00',
    location: '深圳市宝安区欣旺达工业园',
    status: 'pending',
    contacts: [{ name: '周总', title: '制造部经理', phone: '132****7001' }],
    lastVisitDate: '2026-05-01',
    lastVisitSummary: '方案已提交，等待内部评审',
    dayLabel: '周四',
    visitGoal: '确认内部评审进展，找出卡点并判断是否需要补充 ROI 或案例证明。',
    expectedCommitment: '推动客户安排方案复盘会，并确认下一步推进负责人。',
  },
  {
    id: 't7',
    customerId: 'c2',
    customerName: '富士康科技',
    customerLevel: 'S',
    confirmationStatus: 'confirmed',
    visitType: '商务谈判',
    visitPurpose: '整线自动化技术评审',
    visitTime: '09:30',
    location: '深圳市龙华区富士康科技园',
    status: 'pending',
    contacts: [{ name: '陈总', title: '自动化部总监', phone: '136****2001' }],
    lastVisitDate: '2026-05-10',
    lastVisitSummary: '技术方案获初步认可，安排详细评审',
    dayLabel: '周五',
    visitGoal: '基于技术认可结果，进一步缩小商务条件差距并确认采购节奏。',
    expectedCommitment: '明确价格区间和正式采购流程启动时间。',
  },
  {
    id: 't8',
    customerId: 'c4',
    customerName: '比亚迪电子',
    customerLevel: 'A',
    confirmationStatus: 'confirmed',
    visitType: '方案汇报',
    visitPurpose: '注塑取件方案沟通',
    visitTime: '14:00',
    location: '深圳市坪山区比亚迪工业园',
    status: 'pending',
    contacts: [{ name: '刘经理', title: '设备采购经理', phone: '135****4001' }],
    lastVisitDate: '2026-05-09',
    lastVisitSummary: '需补充技术参数',
    dayLabel: '周五',
    visitGoal: '补齐技术参数后完成方案闭环，避免客户内部推进停滞。',
    expectedCommitment: '拿到完整参数清单并约定下次正式方案评审。',
  },
];

// ========== Completed Visits ==========
export const completedVisits: CompletedVisit[] = [
  // === S级 ===
  { id: 'cv1', customerId: 'c1', customerName: '深圳华星光电', customerLevel: 'S', visitDate: '2026-05-12', summary: '注塑自动化方案技术评审推进', outcome: '王总认可节拍数据，进入商务谈判', nextSteps: '准备商务报价', archived: false },
  { id: 'cv2', customerId: 'c1', customerName: '深圳华星光电', customerLevel: 'S', visitDate: '2026-05-08', summary: '拜访设备部李工了解技术要求', outcome: '获取了详细的技术参数要求', nextSteps: '根据参数要求出具方案', archived: true },
  { id: 'cv3', customerId: 'c2', customerName: '深圳富士康科技', customerLevel: 'S', visitDate: '2026-05-10', summary: '与陈总讨论整线自动化方案细节', outcome: '方案已通过技术评审', nextSteps: '等待采购流程启动', archived: false },
  { id: 'cv4', customerId: 'c9', customerName: '珠海格力电器', customerLevel: 'S', visitDate: '2026-05-06', summary: '注塑岛方案初步汇报', outcome: '方案获得初步认可', nextSteps: '细化注塑岛布局，安排第二次方案汇报', archived: false },
  { id: 'cv5', customerId: 'c9', customerName: '珠海格力电器', customerLevel: 'S', visitDate: '2026-04-28', summary: '初次拜访智能制造部', outcome: '了解注塑岛改造需求', nextSteps: '准备注塑岛方案', archived: true },
  // c3 立讯精密（S级）无拜访 → 严重超期

  // === A级 ===
  { id: 'cv6', customerId: 'c4', customerName: '深圳比亚迪电子', customerLevel: 'A', visitDate: '2026-05-09', summary: '注塑取件方案初步沟通', outcome: '需补充技术参数', nextSteps: '准备详细技术规格书', archived: false },
  { id: 'cv7', customerId: 'c7', customerName: '深圳欣旺达', customerLevel: 'A', visitDate: '2026-05-01', summary: '注塑+组装方案讨论', outcome: '方案已提交客户内部评审', nextSteps: '跟进评审结果', archived: false },
  { id: 'cv8', customerId: 'c5', customerName: '东莞长盈精密', customerLevel: 'A', visitDate: '2026-04-20', summary: 'CNC自动化需求详细了解', outcome: '确认了5台CNC的上下料需求', nextSteps: '出具方案报价', archived: false },
  { id: 'cv9', customerId: 'c5', customerName: '东莞长盈精密', customerLevel: 'A', visitDate: '2026-03-15', summary: '初步沟通CNC自动化需求', outcome: '客户有意向，待深入对接', nextSteps: '安排第二次拜访', archived: true },
  { id: 'cv10', customerId: 'c11', customerName: 'TCL华星', customerLevel: 'A', visitDate: '2026-04-25', summary: '模组段自动化需求沟通', outcome: '客户有兴趣，需进一步调研', nextSteps: '安排技术交流', archived: false },
  { id: 'cv11', customerId: 'c12', customerName: '大族激光', customerLevel: 'A', visitDate: '2026-04-10', summary: '焊接机器人方案介绍', outcome: '技术认可，待商务评估', nextSteps: '准备报价', archived: false },

  // === B级 ===
  { id: 'cv12', customerId: 'c10', customerName: '深圳瑞声科技', customerLevel: 'B', visitDate: '2026-05-05', summary: '微组装方案介绍', outcome: '客户有兴趣，但预算有限', nextSteps: '提供分期方案', archived: false },
  { id: 'cv13', customerId: 'c6', customerName: '惠州德赛电池', customerLevel: 'B', visitDate: '2026-04-01', summary: '电话初步接触', outcome: '客户对PACK线自动化有兴趣', nextSteps: '安排现场拜访', archived: false },
  { id: 'cv14', customerId: 'c14', customerName: '亿纬锂能', customerLevel: 'B', visitDate: '2026-03-20', summary: '电芯分选需求了解', outcome: '有初步意向', nextSteps: '安排技术交流', archived: false },
  { id: 'cv15', customerId: 'c16', customerName: '蓝思科技', customerLevel: 'B', visitDate: '2026-04-15', summary: '玻璃上下料方案沟通', outcome: '技术参数已获取', nextSteps: '出具方案', archived: false },
  // c8 木林森照明, c15 信利光电, c17 伯恩光学, c18 领益智造, c19 欧菲光, c20 合力泰 — 部分有电话/现场触达
  { id: 'cv20', customerId: 'c8', customerName: '中山木林森照明', customerLevel: 'B', visitDate: '2026-04-08', summary: '电话沟通点胶机器人需求', outcome: '有初步兴趣，约现场拜访', nextSteps: '安排技术交流', archived: false },
  { id: 'cv21', customerId: 'c15', customerName: '汕尾信利光电', customerLevel: 'B', visitDate: '2026-03-22', summary: '电话联系工程经理冯经理', outcome: '模组检测需求暂缓', nextSteps: 'Q3再跟进', archived: true },
  { id: 'cv22', customerId: 'c17', customerName: '惠州伯恩光学', customerLevel: 'B', visitDate: '2026-04-25', summary: '现场拜访了解CNC自动化需求', outcome: '有5台设备需求，待评估', nextSteps: '出具初步方案', archived: false },
  { id: 'cv23', customerId: 'c18', customerName: '东莞领益智造', customerLevel: 'B', visitDate: '2026-03-10', summary: '电话沟通冲压自动化', outcome: '预算未批，暂缓', nextSteps: '半年后跟进', archived: true },
  { id: 'cv24', customerId: 'c19', customerName: '深圳欧菲光', customerLevel: 'B', visitDate: '2026-04-15', summary: '微信了解镜头组装需求', outcome: '项目排期延后', nextSteps: 'Q3再联系', archived: true },
  { id: 'cv25', customerId: 'c20', customerName: '吉安合力泰', customerLevel: 'B', visitDate: '2026-02-20', summary: '电话联系采购主管蒋经理', outcome: '贴片自动化需求待定', nextSteps: '季度回访', archived: true },

  // === C级 ===
  // C级沉睡客户：30天超期，部分有电话/微信触达记录
  { id: 'cv30', customerId: 'c21', customerName: '北京京东方', customerLevel: 'C', visitDate: '2026-03-10', summary: '电话联系设备部韩总，了解模组搬运需求现状', outcome: '对方表示暂无新项目，保持联系', nextSteps: 'Q3再跟进', archived: true },
  { id: 'cv31', customerId: 'c22', customerName: '上海天马微电子', customerLevel: 'C', visitDate: '2026-02-18', summary: '微信触达，了解检测设备需求', outcome: '有初步兴趣，但预算未批', nextSteps: '半年后再联系', archived: true },
  { id: 'cv32', customerId: 'c23', customerName: '合肥维信诺', customerLevel: 'C', visitDate: '2026-04-02', summary: '电话沟通蒸镀设备需求', outcome: '项目暂停中', nextSteps: '季度回访', archived: true },
  { id: 'cv33', customerId: 'c24', customerName: '深圳柔宇科技', customerLevel: 'C', visitDate: '2025-12-20', summary: '现场拜访了解贴合设备需求', outcome: '公司经营困难，项目冻结', nextSteps: '长期关注', archived: true },
  { id: 'cv34', customerId: 'c25', customerName: '深圳汇顶科技', customerLevel: 'C', visitDate: '2026-03-25', summary: '电话联系运营总监袁总', outcome: '对方表示封装需求暂缓', nextSteps: 'Q4再联系', archived: true },
  { id: 'cv35', customerId: 'c26', customerName: '北京兆易创新', customerLevel: 'C', visitDate: '2026-01-15', summary: '微信了解晶圆搬运需求', outcome: '暂无需求', nextSteps: '年度回访', archived: true },
  { id: 'cv36', customerId: 'c27', customerName: '上海韦尔股份', customerLevel: 'C', visitDate: '2026-04-10', summary: '电话联系采购经理卢经理', outcome: '测试分选需求待定', nextSteps: 'Q3跟进', archived: true },
  { id: 'cv37', customerId: 'c28', customerName: '嘉兴闻泰科技', customerLevel: 'C', visitDate: '2026-02-28', summary: '微信沟通整线改造需求', outcome: '暂无预算', nextSteps: '半年后回访', archived: true },
  { id: 'cv38', customerId: 'c29', customerName: '上海龙旗科技', customerLevel: 'C', visitDate: '2026-03-05', summary: '电话了解组装线需求', outcome: '暂不推进', nextSteps: '下半年再联系', archived: true },
  { id: 'cv39', customerId: 'c30', customerName: '上海华勤技术', customerLevel: 'C', visitDate: '2026-04-18', summary: '微信触达工程经理秦工', outcome: 'SMT产线暂时稳定', nextSteps: '季度保持联系', archived: true },
];

// ========== Completion Goals ==========
export const completionGoals: CompletionGoal[] = [
  { level: 'S', completed: 4, target: 5 },
  { level: 'A', completed: 5, target: 5 },
  { level: 'B', completed: 2, target: 6 },
  { level: 'C', completed: 1, target: 4 },
];

// ========== Coverage Data ==========
export const coverageData: CoverageData = {
  total: 30,
  covered: 22,
  byLevel: [
    { level: 'S', total: 4, covered: 3 },
    { level: 'A', total: 6, covered: 5 },
    { level: 'B', total: 10, covered: 6 },
    { level: 'C', total: 10, covered: 8 },
  ],
  uncoveredHighPriority: [
    { customerId: 'c3', customerName: '东莞立讯精密', customerLevel: 'S', daysSinceLastVisit: 45 },
    { customerId: 'c20', customerName: '吉安合力泰', customerLevel: 'B', daysSinceLastVisit: 84 },
    { customerId: 'c18', customerName: '东莞领益智造', customerLevel: 'B', daysSinceLastVisit: 66 },
    { customerId: 'c13', customerName: '深圳深天马', customerLevel: 'A', daysSinceLastVisit: 35 },
  ],
};

// ========== Knowledge Base ==========
export const knowledgeItems: KnowledgeItem[] = [
  /* ========= 销售人员 (sales) ========= */
  {
    id: 'k1',
    title: 'SMT产线自动化升级 - 开场话术',
    category: '拜访话术',
    content: `**开场话术模板：**

"X总，您好！了解到贵司SMT产线目前日产能约XX万片，我们在类似规模的产线上已经帮助多家客户实现了30%以上的效率提升。

今天想跟您分享一下，我们如何通过智能上下料+AOI在线检测的整合方案，帮助贵司在不增加人员的情况下，将产能提升到XX万片/天。"

**关键话术要点：**
1. 先了解客户当前产能数据
2. 用具体数字说明提升空间
3. 强调"不增加人员"的成本优势
4. 引出方案详细介绍`,
    applicableIndustries: ['3C代工', '消费电子', 'LED封装'],
    applicableLevels: ['S', 'A', 'B'],
    tags: ['SMT', '自动化', '开场白'],
    hot: true,
    audience: 'sales',
  },
  {
    id: 'k2',
    title: '注塑自动化方案 - 价值呈现',
    category: '拜访话术',
    content: `**价值呈现话术：**

"注塑车间的自动化改造，核心价值体现在三个方面：

1. **人力成本节省**：一套注塑自动化方案可替代3-5名操作工，按年人均成本8万计算，1.5-2年即可回收投资。

2. **良品率提升**：机器人取件的一致性远超人工，实测良品率可从96%提升到99.2%，每提升1个百分点，年节省废料成本约15-20万。

3. **产能提升**：7*24小时无间断生产，单机日产能提升20-30%。"

**数据支撑：**
- 深圳华星光电案例：投资回收期14个月
- 珠海格力电器案例：良品率从95.8%→99.1%`,
    applicableIndustries: ['面板制造', '家电制造', '消费电子'],
    applicableLevels: ['S', 'A'],
    tags: ['注塑', '价值量化', 'ROI'],
    hot: true,
    audience: 'sales',
  },
  {
    id: 'k3',
    title: '如何应对"价格太贵"异议',
    category: '异议处理',
    content: `**异议处理 - 价格太贵**

**应对策略：TCO总成本法**

当客户说"你们价格比XX品牌贵20%"时：

**话术模板：**
"X总，单纯看设备采购价格，我们确实比XX贵约15-20%。但如果算总体拥有成本（TCO）：

| 项目 | 我司 | XX品牌 |
|------|------|--------|
| 设备采购 | 350万 | 290万 |
| 年维护成本 | 8万 | 15万 |
| 良品率提升 | +2.3% | +1.1% |
| 3年TCO | 374万 | 335万 |
| 良率收益(3Y) | -120万 | -58万 |
| 实际总成本 | 254万 | 277万 |

3年下来，选择我们实际为贵司节省23万..."

**关键点：**
1. 不要直接否认价格高  2. 引导到总成本  3. 用数据说话`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A', 'B', 'C'],
    tags: ['价格异议', 'TCO', '谈判'],
    hot: true,
    audience: 'sales',
  },
  {
    id: 'k4',
    title: '3C行业注塑自动化解决方案',
    category: '行业方案',
    content: `**3C行业注塑自动化解决方案**

**适用场景：** 手机外壳、平板壳体、笔记本壳体等精密注塑件

**方案概述：**
1. 注塑机取件机器人（六轴/SCARA）
2. 视觉检测系统（外观缺陷检测）
3. 自动去水口/修边
4. 自动摆盘/装箱
5. MES系统集成

**技术参数：**
- 取件节拍：8-12秒/模次
- 视觉检测精度：±0.05mm
- 良品率提升：2-3个百分点`,
    applicableIndustries: ['3C代工', '消费电子'],
    applicableLevels: ['S', 'A'],
    tags: ['3C', '注塑', '解决方案'],
    audience: 'sales',
  },
  {
    id: 'k5',
    title: '锂电池PACK线自动化方案',
    category: '行业方案',
    content: `**锂电池PACK线自动化方案**

**方案概述：** 电芯分选→模组组装→PACK装配→电性能检测

**关键模块：**
1. 电芯自动分选系统
2. 模组堆叠机器人
3. 激光焊接工作站
4. 气密性检测
5. EOL终检系统

**技术参数：**
- 产能：300-500 PACK/天
- 焊接良率：99.5%+
- 整线人员需求：8人→3人`,
    applicableIndustries: ['锂电池', '电池模组'],
    applicableLevels: ['A', 'B'],
    tags: ['锂电池', 'PACK', '自动化'],
    audience: 'sales',
  },
  {
    id: 'k6',
    title: 'PCB行业AOI检测自动化方案',
    category: '行业方案',
    content: `**PCB行业AOI检测自动化方案**

1. PCB板自动上料 → 2. AOI自动光学检测 → 3. 不良品自动分拣 → 4. 数据统计

**技术参数：** 检测速度1200mm²/秒，精度最小0.01mm，误判率<0.5%

**适用客户：** PCB制造商、SMT贴片工厂`,
    applicableIndustries: ['PCB', '3C代工'],
    applicableLevels: ['A', 'B'],
    tags: ['PCB', 'AOI', '检测'],
    audience: 'sales',
  },
  {
    id: 'k7',
    title: '首次拜访开场白 - 通用模板',
    category: '拜访话术',
    content: `**首次拜访开场白**

"X总/X工，您好！我是拓斯达的[姓名]，感谢您百忙之中抽出时间。

在来之前，我做了一些功课，了解到贵司在[行业]领域是[地位/规模]。我们拓斯达专注智能制造解决方案15年，在[相关行业]有丰富的自动化改造经验。

今天来主要是想了解一下贵司在智能制造方面的规划，看看有没有合作的机会。方便的话，能否先带我参观一下产线？"

**注意事项：** 控制1分钟内，主动提参观，多问少推`,
    applicableIndustries: [],
    applicableLevels: ['A', 'B', 'C'],
    tags: ['首次拜访', '开场白', '通用'],
    audience: 'sales',
  },
  {
    id: 'k8',
    title: '"暂时不需要"应对话术',
    category: '异议处理',
    content: `**异议处理 - "暂时不需要"**

"X总，完全理解。不过我想请教两个问题：

1. 贵司产线上人工操作环节多不多？有没有招工难的困扰？
2. 行业里像[同行]已经在推进自动化了，贵司有没有考虑过未来1-2年的规划？

我们可以从最容易见效的环节开始，比如注塑取件一个工位，投资十几万，3个月就能回本。"

**策略：** 不反驳、引导思考、提及竞品、降低门槛`,
    applicableIndustries: [],
    applicableLevels: ['B', 'C'],
    tags: ['异议处理', '拒绝', '策略'],
    audience: 'sales',
  },
  {
    id: 'k9',
    title: '"已有供应商"应对话术',
    category: '异议处理',
    content: `**异议处理 - "已有供应商"**

"X总，有固定供应商说明贵司在自动化方面是有投入的，很好。目前供应商在哪些方面让您满意，哪些还有提升空间？

很多客户保持2-3家供应商，一方面是比较择优，另一方面是供应链安全。我们不一定要替代现有供应商，但可以在某些领域形成互补。"`,
    applicableIndustries: [],
    applicableLevels: ['A', 'B', 'C'],
    tags: ['异议处理', '供应商', '竞争'],
    audience: 'sales',
  },
  {
    id: 'k10',
    title: '价值量化话术模板',
    category: '拜访话术',
    content: `**价值量化话术模板**

"贵司目前[现状]，通过自动化改造后预计可以实现：

📊 **成本维度：** 人工节省¥[X]/年 · 良率提升¥[X]/年
📈 **效率维度：** 产能提升[X]% · OEE[X]→[X]%
💰 **投资回报：** 总投资¥[X] · 年收益¥[X] · 回收期[X]个月"

**注意：** 数据要基于实际调研，不要凭空编造`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A', 'B', 'C'],
    tags: ['价值量化', 'ROI', '话术'],
    audience: 'sales',
  },
  {
    id: 'k11',
    title: '"需要总部审批"推进话术',
    category: '异议处理',
    content: `**异议处理 - "需要总部审批"**

"X总，理解贵司的审批流程。我们可以提供以下支持：

1. **ROI分析报告** — 方便向总部汇报
2. **标杆参观** — 安排到标杆客户现场参观
3. **试用方案** — 1台设备试用3个月，用数据说话
4. **总部对接** — 安排公司高层直接与总部沟通

您看哪种方式最适合？"`,
    applicableIndustries: [],
    applicableLevels: ['A', 'B'],
    tags: ['审批', '推进', '总部'],
    audience: 'sales',
  },
  {
    id: 'k12',
    title: '华星光电注塑自动化项目案例',
    category: '成功案例',
    content: `**深圳华星光电注塑自动化项目案例**

**项目背景：** T6工厂注塑车间，12台注塑机自动化取件和后加工
**规模：** ¥280万 | **周期：** 3个月

**效果：**
- 人员减少：36人→12人，节省24人
- 良品率：95.2%→98.8%
- 产能提升：25%
- 投资回收期：14个月

**客户评价：**
"拓斯达的方案不仅解决了我们招工难的问题，更重要的是产品一致性得到了质的飞越。" —— 华星光电制造部王总`,
    applicableIndustries: ['面板制造'],
    applicableLevels: ['S'],
    tags: ['深圳华星光电', '案例', '注塑'],
    audience: 'sales',
  },
  {
    id: 'k13',
    title: '深圳比亚迪电子CNC上下料案例',
    category: '成功案例',
    content: `**深圳比亚迪电子CNC上下料案例**

**背景：** 坪山工厂20台CNC自动上下料 | **规模：** ¥180万 | **周期：** 2.5个月

**效果：**
- 人员：40人→8人
- 设备利用率：65%→92%
- 换型时间：2h→30min`,
    applicableIndustries: ['消费电子', '金属结构件'],
    applicableLevels: ['A', 'B'],
    tags: ['深圳比亚迪电子', 'CNC', '案例'],
    audience: 'sales',
  },

  /* ========= 区域总监 (manager) ========= */
  {
    id: 'k20',
    title: 'vs 埃斯顿 - 竞品对比分析',
    category: '竞品对比',
    content: `**拓斯达 vs 埃斯顿 竞品对比**

| 维度 | 拓斯达 | 埃斯顿 |
|------|--------|--------|
| 核心优势 | 系统集成+注塑自动化 | 机器人本体 |
| 注塑领域经验 | 15年+ | 5年 |
| 整线交付能力 | ★★★★★ | ★★★ |
| 服务响应(华南) | 4小时 | 8-12小时 |
| 价格水平 | 中高 | 中 |
| 软件平台 | 自研MES+视觉 | 第三方集成 |

**区域策略：** 在S/A级客户遇到埃斯顿时，重点强调整线交付和服务响应优势。B/C级客户可强调性价比。`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A', 'B'],
    tags: ['埃斯顿', '竞品', '对比'],
    audience: 'manager',
    hot: true,
  },
  {
    id: 'k21',
    title: 'vs 汇川技术 - 竞品对比',
    category: '竞品对比',
    content: `**拓斯达 vs 汇川技术**

| 维度 | 拓斯达 | 汇川技术 |
|------|--------|---------|
| 核心业务 | 注塑自动化+系统集成 | 工控+伺服驱动 |
| 机器人产品线 | SCARA+六轴+协作 | 主要SCARA |
| 注塑行业案例 | 500+ | 100+ |
| 整线交付 | ★★★★★ | ★★★ |
| 华南服务网络 | 12个服务点 | 8个服务点 |

**区域策略：** 汇川在华南华南有一定基础，可在LED和电池行业重点突破，发挥整线交付优势。`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A', 'B'],
    tags: ['汇川', '竞品', '对比'],
    audience: 'manager',
  },
  {
    id: 'k22',
    title: 'vs ABB/KUKA - 进口替代话术',
    category: '竞品对比',
    content: `**进口替代话术 - vs ABB/KUKA**

"X总，ABB和KUKA确实是全球顶尖品牌。但在注塑自动化这个细分领域：

1. **应用理解**：我们在中国电子制造深耕15年，对本土工艺理解远超外资
2. **服务响应**：华南4小时响应 vs 进口品牌24-48小时
3. **定制化能力**：快速定制 vs 全球审批流程
4. **成本优势**：同等性能下仅为进口品牌60-70%
5. **供应链安全**：自主可控"

**管理层建议：** 对头部客户进口替代是长期策略，建议安排高层互访推进。`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A'],
    tags: ['ABB', 'KUKA', '进口替代', '国产替代'],
    audience: 'manager',
  },
  {
    id: 'k23',
    title: '区域拜访覆盖率分析模板',
    category: '行业方案',
    content: `**区域拜访覆盖率分析模板**

**月度分析维度：**
1. 整体覆盖率 = 已拜访客户数 / 总客户数
2. 按等级覆盖率（S/A/B/C分别统计）
3. 超30天未拜访客户清单
4. 新增客户/流失客户

**管理要点：**
- S级客户覆盖率目标：100%
- A级客户覆盖率目标：≥80%
- 未覆盖S/A级客户需制定拜访计划
- 区域之间横向对比，找出差距

**季度回顾：**
- 覆盖率趋势变化
- 拜访→商机转化率
- 区域间资源调配`,
    applicableIndustries: [],
    applicableLevels: [],
    tags: ['覆盖率', '区域管理', '分析'],
    audience: 'manager',
    hot: true,
  },
  {
    id: 'k24',
    title: '团队绩效考核指标体系',
    category: '行业方案',
    content: `**区域销售团队绩效考核指标**

**一、过程指标（40%）**
- 拜访覆盖率：S级100% / A级80% / B级60%
- 每周有效拜访次数：≥10次
- 客户档案完整率：≥95%

**二、结果指标（60%）**
- 商机金额完成率
- 新签合同金额
- 回款率

**管理建议：**
- 月度review，季度调整
- 对超额完成的给予额外激励
- 连续两季度未达标需谈话辅导`,
    applicableIndustries: [],
    applicableLevels: [],
    tags: ['绩效', '考核', '团队管理'],
    audience: 'manager',
  },

  /* ========= 销售总监 (director) ========= */
  {
    id: 'k30',
    title: 'Q3电子制造行业趋势分析',
    category: '行业方案',
    content: `**2025 Q3 电子制造行业趋势**

**1. 自动化投资回暖**
Q3进入设备采购旺季，面板、消费电子行业尤为明显。

**2. AI+自动化融合加速**
AI视觉检测、智能排产等方案需求增长40%+。

**3. 国产替代持续深化**
头部客户加速导入国产设备，拓斯达的机会窗口。

**4. 新能源带动需求**
锂电池、光伏行业PACK线、模组线需求旺盛。

**战略建议：**
- 集中资源攻克S级大客户
- Q3是全年最佳窗口期，需提前储备
- 布局AI+自动化新品类`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A', 'B', 'C'],
    tags: ['行业趋势', 'Q3', '策略'],
    audience: 'director',
    hot: true,
  },
  {
    id: 'k31',
    title: '2025年销售战略规划',
    category: '行业方案',
    content: `**2025年销售战略规划**

**一、市场机会**
- 国产替代：进口设备替代率目标从30%提升到45%
- 新能源赛道：锂电池/光伏自动化投入增长50%
- AI+自动化：成为新增长极

**二、资源分配**
| 区域 | 重点行业 | 目标增长 |
|------|---------|---------|
| 华南 | 3C+面板+新能源 | +35% |
| 华东 | 家电+汽车 | +25% |

**三、组织能力**
- 扩充华南销售团队3人
- 强化售前技术支持
- 建立战略客户专属服务团队`,
    applicableIndustries: [],
    applicableLevels: [],
    tags: ['战略规划', '2025', '资源分配'],
    audience: 'director',
  },
  {
    id: 'k32',
    title: '高层拜访话术 - VP/总经理级别',
    category: '拜访话术',
    content: `**高层拜访话术**

**关键原则：** 高层关注战略价值，不是技术细节。

**话术框架：**
1. **行业趋势引入：** "X总，今年电子制造两个趋势：人工成本上升+品质一致性要求越来越高..."

2. **战略价值呈现：** "我们帮助[同行]实现了[效果]，不仅是成本层面，更是产能弹性和品质竞争力的提升..."

3. **合作框架建议：** "建议分三步走：第一步示范线3个月见效；第二步推广全车间；第三步建立智能制造标杆工厂..."

**禁忌：**
- 不讲太多技术参数
- 不一上来就报价
- 不贬低竞争对手`,
    applicableIndustries: [],
    applicableLevels: ['S', 'A'],
    tags: ['高层', '战略', 'VP'],
    audience: 'director',
  },
  {
    id: 'k33',
    title: 'ROI投资回报分析模板',
    category: '行业方案',
    content: `**ROI投资回报分析模板**

**分析维度：**

| 指标 | 计算方式 | 参考值 |
|------|---------|--------|
| 人力节省 | 替代人数×年薪 | 8-15万/人 |
| 良率提升 | 提升%×年废品成本 | 1-3个百分点=15-45万 |
| 产能提升 | 提升%×产能价值 | 20-30% |
| 投资回收期 | 总投资÷年收益 | 目标<18个月 |

**客户汇报格式：**
"投资XXX万，年节省/增收XXX万，XX个月回收投资，后续每年净收益XXX万。"

**注意：** 不同行业参数差异大，需根据实际调研调整`,
    applicableIndustries: [],
    applicableLevels: [],
    tags: ['ROI', '投资回报', '分析模板'],
    audience: 'director',
  },
  {
    id: 'k34',
    title: '深圳富士康科技整线交付案例',
    category: '成功案例',
    content: `**深圳富士康科技整线自动化交付案例**

**项目背景：** 龙华园区iPhone组装线自动化升级
**规模：** ¥480万 | **周期：** 5个月

**方案内容：**
1. 注塑车间自动化（8台注塑机）
2. CNC上下料系统（20台CNC）
3. 组装线协作机器人（6工位）
4. 整线MES系统集成

**效果：**
- 整线人员：85人→32人
- OEE：72%→89%
- 日产能：12000件→15000件

**战略意义：** 该案例为华南区域复制标杆，可推广至同类3C代工客户。`,
    applicableIndustries: ['3C代工'],
    applicableLevels: ['S'],
    tags: ['深圳富士康科技', '案例', '整线'],
    audience: 'director',
  },
  {
    id: 'k35',
    title: '面板行业模组段自动化方案',
    category: '行业方案',
    content: `**面板行业模组段自动化方案**

**适用场景：** LCD/OLED面板模组段后段工序

**方案：** 面板搬运机器人 → 偏光片贴附 → FOG/COG邦定 → 背光组装 → 整机检测

**指标：** 搬运15片/分钟，贴附精度±0.1mm，OEE提升15-20%

**战略定位：** 面板是S级客户集中行业，深圳华星光电、京东方为关键客户，需高层持续维护。`,
    applicableIndustries: ['面板制造'],
    applicableLevels: ['S', 'A'],
    tags: ['面板', '模组', '自动化'],
    audience: 'director',
  },

  /* ========= 全员 (all) ========= */
  {
    id: 'k40',
    title: '拓斯达公司介绍',
    category: '行业方案',
    content: `**拓斯达科技集团**

**公司概况：**
- 成立于2007年，2017年创业板上市
- 专注智能制造解决方案15年+
- 华南地区工业机器人龙头企业

**核心业务：**
- 工业机器人（SCARA/六轴/协作机器人）
- 注塑自动化整线方案
- MES/视觉系统集成

**核心优势：**
- 注塑行业500+案例
- 华南12个服务网点，4小时响应
- 自研MES+视觉系统

**愿景：** 让工业制造更美好`,
    applicableIndustries: [],
    applicableLevels: [],
    tags: ['公司介绍', '拓斯达'],
    audience: 'all',
  },
];

// Knowledge categories count
export const knowledgeCategories = [
  { name: '行业方案', count: 12 },
  { name: '竞品对比', count: 8 },
  { name: '异议处理', count: 15 },
  { name: '成功案例', count: 20 },
];
