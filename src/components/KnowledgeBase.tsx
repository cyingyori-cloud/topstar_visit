import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../stores/appStore';
import type { KnowledgeItem } from '../data/mockData';
import { knowledgeCategories } from '../data/mockData';
import { knowledgeDocumentCategories } from '../data/knowledgeBase';
import ChatArea from './ChatArea';
import { Search, BookOpen, Pin, Flame, Filter, ArrowLeft, Target, MessageSquareText, Lightbulb, ClipboardCheck, HelpCircle } from 'lucide-react';
import { normalizeCompanyNames } from '../utils/companyNames';

const allCategories = [
  '全部',
  ...new Set([...knowledgeDocumentCategories, ...knowledgeCategories].map(c => c.name)),
];

const scenarioShortcuts = [
  { label: '初次拜访', query: '洞察 客户 行业 开场' },
  { label: '方案推进', query: '方案 价值 商机 推进' },
  { label: 'ROI算账', query: 'ROI 投资回报 财务 回本' },
  { label: '竞品防守', query: '竞品 对比 异议' },
  { label: '异议处理', query: '异议 价格 LSCPA' },
];

export default function KnowledgeBase() {
  const { filteredKnowledge, currentRep } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  const audienceLabel = currentRep.level === 1 ? '战略层内容' : currentRep.level === 2 ? '管理层内容' : '执行层内容';

  const filtered = filteredKnowledge.filter(k => {
    const keyword = search.trim().toLowerCase();
    const matchSearch = !keyword ||
      k.title.toLowerCase().includes(keyword) ||
      k.content.toLowerCase().includes(keyword) ||
      k.tags.some(t => t.toLowerCase().includes(keyword)) ||
      k.category.toLowerCase().includes(keyword);
    const matchCat = activeCategory === '全部' || k.category === activeCategory;
    return matchSearch && matchCat;
  });

  const hotItems = filtered.filter(k => k.hot);
  const normalItems = filtered.filter(k => !k.hot);

  const catColors: Record<string, string> = {
    '行业方案': '#1B6EF3',
    '拜访话术': '#52C41A',
    '异议处理': '#F5A623',
    '竞品对比': '#DC2626',
    '成功案例': '#7C3AED',
  };

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4">
      <div className="overflow-y-auto space-y-3 pr-1" style={{ width: '66.6%', scrollbarWidth: 'thin' }}>

        {/* Header */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium" style={{ color: '#1F2329' }}>
              <BookOpen className="w-4 h-4 inline mr-1.5" style={{ color: '#1B6EF3' }} />
              知识库
            </div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#1B6EF3', color: '#fff' }}>
              {currentRep.role} · {audienceLabel} · 共{filteredKnowledge.length}条
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8F959E' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索产品、工艺、竞品、话术、ROI、案例..."
              className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              style={{ backgroundColor: '#F5F7FA' }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8F959E' }} />
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="text-xs px-2.5 py-1 rounded-full transition-all"
                style={{
                  backgroundColor: activeCategory === cat ? '#1B6EF3' : 'rgba(27,110,243,0.06)',
                  color: activeCategory === cat ? '#fff' : '#1B6EF3',
                  fontWeight: activeCategory === cat ? 600 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs mb-2" style={{ color: '#8F959E' }}>按销售场景快速找资料</div>
            <div className="grid grid-cols-5 gap-2">
              {scenarioShortcuts.map(item => (
                <button
                  key={item.label}
                  onClick={() => { setSearch(item.query); setActiveCategory('全部'); setSelectedItem(null); }}
                  className="text-xs rounded-lg px-2 py-2 text-left hover:shadow-sm transition-all"
                  style={{ backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedItem ? (
          <KnowledgeDetail item={selectedItem} catColors={catColors} onBack={() => setSelectedItem(null)} />
        ) : (
          <>
        {/* Hot */}
        {hotItems.length > 0 && (
          <div className="bg-white rounded-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Flame className="w-4 h-4" style={{ color: '#EF4444' }} />
              <span className="font-medium text-sm" style={{ color: '#1F2329' }}>热门推荐</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {hotItems.map(item => (
                <KnowledgeCard key={item.id} item={item} catColors={catColors} onClick={() => setSelectedItem(item)} />
              ))}
            </div>
          </div>
        )}

        {/* All */}
        <div className="bg-white rounded-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>全部内容 ({filtered.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {normalItems.map(item => (
              <KnowledgeCard key={item.id} item={item} catColors={catColors} onClick={() => setSelectedItem(item)} />
            ))}
            {normalItems.length === 0 && hotItems.length === 0 && (
              <div className="col-span-3 text-xs text-center py-8" style={{ color: '#8F959E' }}>未找到相关内容</div>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      <div style={{ width: '33.4%' }} className="min-w-0">
        <ChatArea />
      </div>
    </div>
  );
}

function splitSentences(content: string) {
  return content
    .replace(/\*\*/g, '')
    .split(/[。！？\n]/)
    .map(item => item.trim().replace(/^[-*\d.、\s]+/, ''))
    .filter(item => item.length >= 10);
}

function getHighlights(item: KnowledgeItem) {
  const sentences = splitSentences(item.content);
  return sentences
    .filter(text => /核心|重点|价值|痛点|提升|降低|节省|风险|优势|客户|方案|回本|ROI|节拍|良率/.test(text))
    .slice(0, 4)
    .concat(sentences.slice(0, 4))
    .filter((text, index, arr) => arr.indexOf(text) === index)
    .slice(0, 4);
}

function getActions(item: KnowledgeItem) {
  if (item.title.includes('财务') || item.content.includes('ROI') || item.content.includes('投资回报')) {
    return ['先问客户当前人工、良率、节拍和停机损失', '把 CAPEX 转成 OPEX/TCO 账，避免只谈报价', '输出一张回本周期测算表，作为下次拜访材料'];
  }
  if (item.title.includes('竞品') || item.category === '竞品对比') {
    return ['先确认客户正在比较的品牌和决策标准', '用稳定性、服务响应、总拥有成本做差异化', '准备一组可验证的案例或参数，不直接贬低竞品'];
  }
  if (item.title.includes('软技能') || item.category === '拜访话术') {
    return ['开场先说客户业务目标，不先讲产品', '用 BPIDC 问出真实痛点和影响', '收官必须拿到 BAC/MAC 下一步承诺'];
  }
  return ['先匹配客户行业和当前商机阶段', '提炼 2-3 个客户最关心的业务价值', '准备案例、数据和下一步承诺话术'];
}

function getUseTiming(item: KnowledgeItem) {
  if (item.title.includes('财务') || item.content.includes('ROI')) return ['客户质疑价格时', '需要推动老板拍板时', '要从设备参数切到经营收益时'];
  if (item.title.includes('竞品') || item.category === '竞品对比') return ['客户正在比价时', '竞品已进入客户视野时', '需要建立差异化标准时'];
  if (item.title.includes('洞察') || item.title.includes('客户生产工艺')) return ['拜访前做客户研究时', '现场参观产线时', '不知道从哪里切入痛点时'];
  if (item.title.includes('软技能') || item.category === '拜访话术') return ['开场前准备话术时', '需求挖掘卡住时', '收官要拿承诺时'];
  return ['拜访前准备资料时', '客户问方案价值时', '需要补充专业依据时'];
}

function getQuestions(item: KnowledgeItem) {
  if (item.title.includes('财务') || item.content.includes('ROI')) return ['现在一个班需要几个人？', '良率和停机损失大概多少？', '老板能接受多久回本？'];
  if (item.title.includes('竞品') || item.category === '竞品对比') return ['客户现在还在看哪些品牌？', '客户最看重价格、稳定性还是交期？', '竞品承诺了什么指标？'];
  if (item.title.includes('客户生产工艺')) return ['当前瓶颈工位在哪里？', '人工最密集的是哪道工序？', '不良主要发生在哪个环节？'];
  return ['客户当前最头疼的生产问题是什么？', '这个问题影响成本、交期还是良率？', '如果认可方向，下一步谁参与评审？'];
}

function getOutputs(item: KnowledgeItem) {
  if (item.title.includes('财务') || item.content.includes('ROI')) return ['ROI测算表', '隐性成本清单', '老板版价值话术'];
  if (item.title.includes('竞品') || item.category === '竞品对比') return ['竞品对比表', '差异化证据清单', '防守话术'];
  if (item.title.includes('客户生产工艺') || item.title.includes('洞察')) return ['产线痛点清单', '瓶颈工位记录', '下一步调研问题'];
  if (item.title.includes('软技能') || item.category === '拜访话术') return ['开场话术', 'BPIDC提问链', 'BAC/MAC收官承诺'];
  return ['客户关注点', '方案价值点', '下一步承诺'];
}

function getScriptCards(item: KnowledgeItem) {
  if (item.title.includes('财务') || item.content.includes('ROI') || item.content.includes('投资回报')) {
    return [
      {
        title: '价格异议回应',
        text: 'X总，设备价格只是 CAPEX，真正影响经营的是三年总成本。我们可以一起把人工、停机、良率和维保成本摊开算，看看这套方案到底是增加成本，还是缩短回本周期。',
      },
      {
        title: '回本周期引导',
        text: '如果这套方案每班少 2 个人，同时把良率和节拍稳定住，您关心的不是设备多少钱，而是几个月能回本。我们这次重点把回本账算清楚，再判断是否值得推进。',
      },
      {
        title: '老板视角表达',
        text: '老板最关心的是现金流和确定性。我们不只讲设备参数，会把节省人工、减少不良、降低停线风险拆成一张收益表，让您内部评审时有财务依据。',
      },
    ];
  }

  if (item.title.includes('竞品') || item.category === '竞品对比') {
    return [
      {
        title: '不贬低竞品',
        text: 'X总，每个品牌都有适合的场景。我们不单纯比较报价，更建议您把稳定性、交期、售后响应、备件成本和后续改造能力一起纳入评估。',
      },
      {
        title: 'TCO 切换',
        text: '如果只看采购价，短期可能差异不大；但设备用三到五年，真正拉开差距的是停机损失、维护成本和工艺变更响应速度。我们可以按总拥有成本来对比。',
      },
      {
        title: '防守收官',
        text: '如果您认可这个评估维度，我建议下一步我们把双方方案按同一张指标表对齐：节拍、良率、交付、维保、升级能力。这样内部决策会更客观。',
      },
    ];
  }

  if (item.title.includes('客户生产工艺') || item.title.includes('洞察')) {
    return [
      {
        title: '现场开场',
        text: 'X总，我今天不急着讲设备，想先看一下产线。重点看三个地方：人最密集的工位、不良品集中的环节、以及设备等待时间最长的位置。',
      },
      {
        title: '痛点追问',
        text: '这个工位现在最影响效率的是人工节拍不稳定、品质波动，还是换型时间？如果这个问题不解决，对交付和成本影响最大的是哪一块？',
      },
      {
        title: '价值承接',
        text: '如果瓶颈确实在这里，我们的方案就不是替换一台设备，而是把这个环节的节拍、良率和人员依赖一起优化。',
      },
    ];
  }

  if (item.title.includes('软技能') || item.category === '拜访话术') {
    return [
      {
        title: 'PBC 开场',
        text: 'X总，今天我想围绕贵司当前产线效率和后续自动化规划做一次交流。预计 30 分钟，我先了解现状，再结合同行场景给您几个可落地的方向。',
      },
      {
        title: 'BPIDC 提问',
        text: '目前这个环节每天大概需要多少人？最常见的不良或等待发生在哪里？如果继续维持现状，对产能、交期或成本影响会有多大？',
      },
      {
        title: 'BAC/MAC 收官',
        text: '如果今天方向对，最佳下一步是约一次技术评审；最低也希望拿到产线参数和关键参与人名单，这样我回去能准备更准确的方案。',
      },
    ];
  }

  return [
    {
      title: '业务开场',
      text: 'X总，今天我想先围绕贵司当前生产目标和产线瓶颈交流，不急着推产品。只有把问题看准，后面的方案才有价值。',
    },
    {
      title: '价值呈现',
      text: '如果这个问题能解决，价值不只是节省几个人，而是节拍更稳定、良率更可控、交付风险更低。',
    },
    {
      title: '推进收官',
      text: '如果您认可这个方向，我们下一步可以把参数、现场边界和评审人确认下来，我再给您一版更贴近现场的方案。',
    },
  ];
}

function KnowledgeDetail({ item, catColors, onBack }: { item: KnowledgeItem; catColors: Record<string, string>; onBack: () => void }) {
  const highlights = getHighlights(item);
  const actions = getActions(item);
  const scripts = getScriptCards(item);
  const timings = getUseTiming(item);
  const questions = getQuestions(item);
  const outputs = getOutputs(item);

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: '#1B6EF3' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> 返回知识列表
        </button>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${catColors[item.category] || '#8F959E'}18`, color: catColors[item.category] || '#8F959E' }}>
          {item.category}
        </span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="text-base font-semibold mb-2" style={{ color: '#1F2329' }}>{normalizeCompanyNames(item.title)}</div>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 6).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>{tag}</span>
            ))}
          </div>
        </div>

        <DetailSection icon={Target} title="一眼看重点">
          {highlights.map((text, index) => (
            <div key={index} className="rounded-lg px-3 py-2 text-sm leading-relaxed" style={{ backgroundColor: '#F8FAFC', color: '#1F2329' }}>
              {text}
            </div>
          ))}
        </DetailSection>

        <DetailSection icon={ClipboardCheck} title="什么时候用">
          <div className="grid grid-cols-3 gap-2">
            {timings.map((text, index) => (
              <div key={index} className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: '#F0FDF4', color: '#14532D', border: '1px solid #BBF7D0' }}>
                {text}
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={HelpCircle} title="现场必问">
          <div className="grid grid-cols-3 gap-2">
            {questions.map((text, index) => (
              <div key={index} className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: '#FFF7ED', color: '#7C2D12', border: '1px solid #FED7AA' }}>
                {text}
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={Lightbulb} title="销售该怎么用">
          <div className="grid grid-cols-3 gap-2">
            {actions.map((text, index) => (
              <div key={index} className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: 'rgba(27,110,243,0.06)', color: '#1E3A8A' }}>
                <div className="font-semibold mb-1">动作 {index + 1}</div>
                {text}
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={Target} title="拜访要带走什么">
          <div className="grid grid-cols-3 gap-2">
            {outputs.map((text, index) => (
              <div key={index} className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
                {text}
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={MessageSquareText} title="可复制话术">
          <div className="grid grid-cols-1 gap-2">
            {scripts.map((script, index) => (
              <div key={index} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FFFBEB', color: '#78350F', border: '1px solid #FDE68A' }}>
                <div className="text-xs font-semibold mb-1">{script.title}</div>
                <div className="text-sm leading-relaxed">“{script.text}”</div>
              </div>
            ))}
          </div>
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({ icon: Icon, title, children }: { icon: any; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm font-medium mb-2" style={{ color: '#334155' }}>
        <Icon className="w-4 h-4" style={{ color: '#1B6EF3' }} />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KnowledgeCard({ item, catColors, onClick }: { item: any; catColors: Record<string, string>; onClick: () => void }) {
  return (
    <div
      className="group px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md border border-transparent hover:border-blue-200"
      style={{ backgroundColor: '#F8F9FA' }}
      onClick={onClick}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        <Pin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#1B6EF3' }} />
        <span className="text-xs font-medium" style={{ color: '#1F2329' }}>{normalizeCompanyNames(item.title)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${catColors[item.category] || '#8F959E'}18`, color: catColors[item.category] || '#8F959E' }}>
          {item.category}
        </span>
        <span className="text-xs" style={{ color: '#B0B5BE' }}>
          {item.applicableIndustries.length > 0 ? item.applicableIndustries.join('、') : '通用'}
        </span>
      </div>
    </div>
  );
}
