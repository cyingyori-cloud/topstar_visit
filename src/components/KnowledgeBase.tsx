import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../stores/appStore';
import type { KnowledgeItem } from '../data/mockData';
import { knowledgeCategories } from '../data/mockData';
import { knowledgeDocumentCategories } from '../data/knowledgeBase';
import ChatArea from './ChatArea';
import { Search, BookOpen, Pin, Flame, Filter, ArrowLeft, Target, MessageSquareText, Lightbulb, ClipboardCheck, HelpCircle, Sparkles } from 'lucide-react';
import { normalizeCompanyNames } from '../utils/companyNames';

const allCategories = [
  '全部',
  ...new Set([...knowledgeDocumentCategories, ...knowledgeCategories].map(c => c.name)),
];

const scenarioShortcuts = [
  { label: '初次拜访', query: '初次拜访 洞察 客户 行业 开场 PBC BPIDC 需求挖掘 产线痛点' },
  { label: '方案推进', query: '方案推进 方案 价值 商机 推进 评审 BAC MAC 技术交流 方案汇报' },
  { label: 'ROI算账', query: 'ROI 投资回报 财务 回本 TCO 成本 人工 良率 节拍 价格' },
  { label: '竞品防守', query: '竞品防守 竞品 对比 差异化 稳定性 交付 售后 总拥有成本' },
  { label: '异议处理', query: '异议处理 异议 价格 LSCPA 拒绝 供应商 审批 太贵' },
];

function plainTextPreview(content: string, maxLength = 260) {
  const text = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function cleanMarkdownText(value: string) {
  const cleaned = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(td|th|tr|p|div|li|h[1-6])>/gi, ' ')
    .replace(/^<\/?\w+\s*$/gm, '')
    .replace(/^\s*(style|class|colspan|rowspan|width)="[^"]*">\s*/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^>\s*/gm, '')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\*/g, '*')
    .replace(/\\_/g, '_')
    .replace(/\\-/g, '-')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\[[0-9]+\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return /^[-|]+$/.test(cleaned) ? '' : cleaned;
}

function isMarkdownTableDivider(line: string) {
  if (!line.includes('|')) return false;
  const cells = line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean);
  return cells.length > 0 && cells.every(cell => /^:?-{2,}:?$/.test(cell));
}

function isHtmlTableScaffold(line: string) {
  return /^<\/?(table|thead|tbody|tr|colgroup|col)\b/i.test(line)
    || /^<\/?(td|th)\b[^>]*>?\s*$/i.test(line)
    || /^<\/?(\/td|\/th|\/tr|\/tbody|\/thead|\/table)>\s*$/i.test(line);
}

function parseMarkdownTableCells(line: string) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cleanMarkdownText(cell));
}

function renderMarkdownLite(content: string) {
  return content.split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;
    if (isMarkdownTableDivider(trimmed) || isHtmlTableScaffold(trimmed)) return null;
    if (trimmed.includes('|')) {
      const cells = parseMarkdownTableCells(trimmed);
      if (cells.every(cell => !cell)) return null;
      if (cells.length >= 2) {
        return (
          <div key={index} className="grid gap-2 rounded-md px-3 py-2 text-xs" style={{ gridTemplateColumns: `repeat(${Math.min(cells.length, 4)}, minmax(0, 1fr))`, backgroundColor: '#F8FAFC', color: '#334155' }}>
            {cells.slice(0, 4).map((cell, cellIndex) => <div key={cellIndex}>{cell}</div>)}
          </div>
        );
      }
    }
    if (/^#{4,6}\s+/.test(trimmed)) {
      return <div key={index} className="text-sm font-semibold mt-3 mb-1" style={{ color: '#334155' }}>{cleanMarkdownText(trimmed.replace(/^#{4,6}\s+/, ''))}</div>;
    }
    if (trimmed.startsWith('### ')) {
      return <div key={index} className="text-sm font-semibold mt-3 mb-1" style={{ color: '#1F2329' }}>{cleanMarkdownText(trimmed.replace(/^###\s+/, ''))}</div>;
    }
    if (trimmed.startsWith('## ')) {
      return <div key={index} className="text-base font-semibold mt-4 mb-1" style={{ color: '#1F2329' }}>{cleanMarkdownText(trimmed.replace(/^##\s+/, ''))}</div>;
    }
    if (trimmed.startsWith('# ')) {
      return <div key={index} className="text-lg font-semibold mt-2 mb-2" style={{ color: '#1F2329' }}>{cleanMarkdownText(trimmed.replace(/^#\s+/, ''))}</div>;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      return <div key={index} className="pl-4 text-sm leading-relaxed" style={{ color: '#334155' }}>· {cleanMarkdownText(trimmed.replace(/^[-*]\s+/, ''))}</div>;
    }
    if (/^\d+[.、]\s*/.test(trimmed)) {
      return <div key={index} className="pl-4 text-sm leading-relaxed" style={{ color: '#334155' }}>{cleanMarkdownText(trimmed)}</div>;
    }
    return <div key={index} className="text-sm leading-relaxed" style={{ color: '#334155' }}>{cleanMarkdownText(trimmed)}</div>;
  });
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[·.,，。！？!?:：;；()[\]【】《》“”"'、/\\|_-]+/g, ' ');
}

function getKnowledgeSearchText(item: KnowledgeItem) {
  return normalizeSearchText([
    item.title,
    item.category,
    item.content,
    ...(item.tags || []),
    ...(item.applicableIndustries || []),
  ].join(' '));
}

function getSearchTokens(search: string) {
  return normalizeSearchText(search)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 0);
}

function matchesSearch(item: KnowledgeItem, search: string) {
  const tokens = getSearchTokens(search);
  if (tokens.length === 0) return true;
  const haystack = getKnowledgeSearchText(item);
  return tokens.some(token => haystack.includes(token));
}

export default function KnowledgeBase() {
  const { filteredKnowledge, currentRep } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const audienceLabel = currentRep.level === 1 ? '战略层内容' : currentRep.level === 2 ? '管理层内容' : '执行层内容';

  const filtered = filteredKnowledge.filter(k => {
    const matchSearch = matchesSearch(k, search);
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
              onChange={e => { setSearch(e.target.value); setActiveScenario(null); }}
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
                onClick={() => { setActiveCategory(cat); setActiveScenario(null); }}
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
                  onClick={() => { setSearch(item.query); setActiveCategory('全部'); setSelectedItem(null); setActiveScenario(item.label); }}
                  className="text-xs rounded-lg px-2 py-2 text-left hover:shadow-sm transition-all"
                  style={{
                    backgroundColor: activeScenario === item.label ? 'rgba(27,110,243,0.10)' : '#F8FAFC',
                    color: activeScenario === item.label ? '#1B6EF3' : '#334155',
                    border: activeScenario === item.label ? '1px solid rgba(27,110,243,0.35)' : '1px solid #E2E8F0',
                    fontWeight: activeScenario === item.label ? 600 : 400,
                  }}
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
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>
              {activeScenario ? `${activeScenario}资料` : '全部内容'} ({filtered.length})
            </span>
            {activeScenario && (
              <span className="ml-2 text-xs" style={{ color: '#8F959E' }}>
                已按销售场景匹配标题、标签、分类和正文关键词
              </span>
            )}
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
  const headingLike = /^(第?[一二三四五六七八九十\d]+[、.．]\s*)|^(核心|客户|拓斯达|场景|话术|案例|步骤|阶段|公式|逻辑|建议|方法|一、|二、|三、|四、|五、)/;

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^#{1,6}\s+/.test(line))
    .filter(line => !/^\|?\s*-{2,}/.test(line))
    .filter(line => !/^>?\s*注[:：]/.test(line))
    .join('。')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[[0-9]+\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[|#*_\\]/g, '')
    .split(/[。！？\n]/)
    .map(item => cleanMarkdownText(item).replace(/^[-*\d.、\s]+/, '').trim())
    .filter(item => item.length >= 18)
    .filter(item => item.length <= 120)
    .filter(item => !headingLike.test(item))
    .filter(item => /客户|销售|设备|方案|工艺|产线|成本|价值|痛点|效率|良率|节拍|回本|风险|竞品|拓斯达|自动化|机器人/.test(item));
}

function firstMeaningfulParagraphs(content: string, limit = 3) {
  return content
    .split(/\n\s*\n/)
    .map(block => cleanMarkdownText(block.replace(/^#{1,6}\s+/gm, '').replace(/^[-*]\s+/gm, '').replace(/^>\s*/gm, '')))
    .filter(block => block.length >= 24)
    .filter(block => block.length <= 180)
    .filter(block => !/^第?[一二三四五六七八九十\d]+[、.．]/.test(block))
    .slice(0, limit);
}

function extractMajorHeadings(content: string) {
  const normalizeHeading = (line: string) => cleanMarkdownText(line.replace(/^#{2,3}\s+/, ''))
    .replace(/[（(].*?[）)]/g, '')
    .trim();
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^#{2,3}\s+/.test(line));
  const level2 = lines
    .filter(line => /^##\s+/.test(line))
    .map(normalizeHeading)
    .filter(line => line.length >= 2 && line.length <= 48);
  if (level2.length >= 2) return level2.slice(0, 7);

  return lines
    .filter(line => /^###\s+/.test(line))
    .map(normalizeHeading)
    .filter(line => line.length >= 2 && line.length <= 48)
    .filter(line => /^(模块[一二三四五六七八九十]|第[一二三四五六七八九十]阵营|[一二三四五六七八九十\d]+[、.．]|工业机器人|注塑装备|数控机床|产品协同|延伸|终极|核心|申请|作为销售人员|别忘了|客户|拓斯达|市场|政策|公司战略|生态合作|实战)/.test(line))
    .slice(0, 7);
}

function joinTopics(headings: string[], fallback: string) {
  const cleaned = headings
    .map(item => item.replace(/[（(].*?[）)]/g, '').replace(/^第?[一二三四五六七八九十\d]+[、.．]\s*/, '').trim())
    .filter(item => !/延伸学习|参考资料|资料来源/.test(item))
    .filter(Boolean)
    .slice(0, 5);
  return cleaned.length ? cleaned.join('、') : fallback;
}

function joinBusinessTopics(headings: string[], fallback: string) {
  const cleaned = headings
    .map(item => item.replace(/[（(].*?[）)]/g, '').replace(/^第?[一二三四五六七八九十\d]+[、.．]\s*/, '').trim())
    .filter(item => !/终极|实战建议|延伸学习|参考资料|资料来源/.test(item))
    .filter(Boolean)
    .slice(0, 5);
  return cleaned.length ? cleaned.join('、') : fallback;
}

function buildTopicSummary(item: KnowledgeItem) {
  const title = item.title;
  const intro = firstMeaningfulParagraphs(item.content, 3);
  const headings = extractMajorHeadings(item.content);

  if (title.includes('软技能')) {
    return [
      intro[0] || '文章核心是把销售沟通从产品介绍转成顾问式诊断和价值共创。',
      `内容分为 ${joinTopics(headings, '沟通与信任建立、大客户开发与关系管理、价值量化、商务谈判、个人效能')}，覆盖从建立信任、管理复杂决策链到价值算账和谈判收官的完整销售能力。`,
      '销售使用时重点不是背话术，而是先建立客户信任，再用决策链地图、TCO/ROI 和下一步承诺把商机推进到可成交状态。',
    ];
  }

  if (title.includes('设备更新补贴')) {
    return [
      intro[0] || '文章核心是说明设备更新补贴主要通过超长期特别国债申请，并可叠加金融支持。',
      `内容围绕 ${joinTopics(headings, '超长期特别国债申请条件、三步申报流程、材料清单、销售如何善用政策、再贷款与贴息支持')}，把政策工具转化为成交助推器。`,
      '销售使用时要先判断客户项目是否属于在建技改、投资额和进度是否符合申报条件，再协助客户准备设备清单、项目文件和补贴收益测算。',
    ];
  }

  if (title.includes('财务') || title.includes('投资回报')) {
    return [
      intro[0] || '文章核心是把设备采购从价格比较转成投资回报和总拥有成本评估。',
      '重点拆解真实用工成本、良率损失、节拍/OEE、CAPEX/OPEX、政策补贴和 ROI 提案报告，让客户看到“不买设备也有成本”。',
      '销售现场要用客户听得懂的财务语言，帮助老板判断多久回本、能省多少钱、现金流压力是否可控。',
    ];
  }

  if (title.includes('市场与公司战略')) {
    return [
      intro[0] || '文章核心是把宏观市场、政策红利和公司战略转化为客户沟通中的专业视野。',
      `内容框架覆盖 ${joinTopics(headings, '市场环境、政策红利、公司战略、生态合作与客户价值转化')}，帮助销售从设备供应商升级为战略伙伴。`,
      '销售使用时要把国产替代、设备更新、AI+制造、拓斯达战略转型和生态合作，翻译成客户能听懂的长期价值。',
    ];
  }

  if (title.includes('公司产品知识')) {
    return [
      intro[0] || '文章系统拆解拓斯达三大核心产品，帮助销售掌握面向客户时最能体现专业度的信息。',
      `重点围绕 ${joinTopics(headings, '工业机器人、注塑装备、数控机床、产品协同')}，说明产品矩阵、典型行业、客户痛点、销售主张和组合价值。`,
      '销售使用时不要孤立讲单品，而要把机器人、注塑装备、数控机床组合成从单机到整厂的解决方案。',
    ];
  }

  if (title.includes('核心产品与底层技术')) {
    return [
      intro[0] || '文章核心是让销售理解客户购买设备本质上是在购买稳定性、生产效率和投资回报。',
      `内容围绕 ${joinTopics(headings, '控制、伺服、视觉三大底层技术，工业机器人、五轴CNC、注塑装备三大智能装备')}，建立拓斯达“全栈自研”的技术底气。`,
      '销售使用时要先诊断客户产线问题，再把 X5 控制、伺服抑振、视觉、五轴 CNC 等能力对应到节拍、良率和成本改善。',
    ];
  }

  if (title.includes('客户生产工艺') || title.includes('应用场景')) {
    return [
      intro[0] || '文章强调：销售必须理解客户生产工艺，才能从卖设备升级为产线诊断和需求引导。',
      headings.length
        ? `核心内容围绕 ${joinBusinessTopics(headings, '注塑及高分子材料、3C电子、新能源、汽车零部件与精密机加')} 等场景展开，拆解工艺链路、车间痛点和对客户表达。`
        : '核心内容围绕注塑、3C电子、新能源、汽车零部件与精密机加等场景展开。',
      '最终落点是下车间看痛点：看人扎堆、废料/不良、等待时间、车间环境和设备品牌，把现场问题转成拓斯达方案切入点。',
    ];
  }

  if (title.includes('洞察客户与行业')) {
    return [
      intro[0] || '文章核心是把产品知识转化为客户价值传递和深度共情。',
      `内容框架覆盖 ${joinTopics(headings, '行业深度洞察、客户决策链、客户分类管理、销售心法与实战落地')}，帮助销售理解客户为什么买、怎么买、谁参与决策。`,
      '销售使用时要先判断客户行业压力、决策链角色和采购心理，再把拓斯达方案包装成客户业务目标的解决路径。',
    ];
  }

  if (title.includes('项目管理') || title.includes('风险控制')) {
    return [
      intro[0] || '文章核心是提醒销售：签单只是开始，交付和回款才是真正闭环。',
      `重点覆盖 ${joinTopics(headings, '售前边界管理、里程碑管理、现场交付风险、内部资源调动、回款管理')}，帮助销售具备项目经理思维。`,
      '销售使用时要把技术协议、来料边界、节拍良率、责任范围、验收节点和回款条件提前讲清，减少烂尾和尾款风险。',
    ];
  }

  if (title.includes('竞品') || title.includes('行业格局')) {
    return [
      intro[0] || '文章核心是建立竞品防守视角，不靠贬低竞品，而是重塑客户评估标准。',
      `内容按 ${joinTopics(headings, '外资巨头、国产一线、系统集成商、高端五轴CNC、拓斯达护城河')} 拆解不同竞争阵营，明确各自优势、软肋和破局打法。`,
      '销售现场要先承认竞品客观优势，再把客户判断标准切到服务响应、总拥有成本、本土化、场景理解和整线交付。',
    ];
  }

  if (item.category === '拜访话术') {
    return [
      intro[0] || '文章核心是把销售沟通从产品介绍转成顾问式诊断和价值共创。',
      `内容分为 ${joinTopics(headings, '沟通与信任、大客户开发、价值量化、商务谈判、个人效能')}，覆盖从建立信任到成交谈判的完整销售能力。`,
      '销售现场要围绕客户目标和生产问题组织对话，最后拿到可执行的下一步承诺。',
    ];
  }

  if (headings.length >= 2 && intro.length >= 1) {
    return [
      intro[0],
      `文章结构主要包括 ${joinTopics(headings, '核心模块、实战方法和销售话术')}，建议按这些章节快速定位所需内容。`,
      intro[1] || '销售使用时要把文档内容转化为客户现场能听懂的价值表达和下一步动作。',
    ];
  }

  if (intro.length >= 2) return intro.slice(0, 3);
  return [];
}

function getHighlights(item: KnowledgeItem) {
  const topicSummary = buildTopicSummary(item);
  if (topicSummary.length > 0) return topicSummary;

  const sentences = splitSentences(item.content);
  const highlighted = sentences
    .filter(text => /核心|重点|价值|痛点|提升|降低|节省|风险|优势|客户|方案|回本|ROI|节拍|良率/.test(text))
    .slice(0, 5)
    .concat(sentences.slice(0, 5))
    .filter((text, index, arr) => arr.indexOf(text) === index)
    .slice(0, 4);

  if (highlighted.length > 0) return highlighted;
  return [
    '先从客户行业、当前工艺和产线痛点判断切入点，不要直接讲产品参数',
    '把方案价值落到效率、良率、人工、节拍、交付风险和投资回报上',
    '拜访现场要拿到关键数据、决策链和下一步评审承诺',
  ];
}

function getActions(item: KnowledgeItem) {
  if (item.title.includes('软技能') || item.category === '拜访话术') {
    return ['开场先说客户业务目标，不先讲产品', '用 BPIDC 问出真实痛点和影响', '收官必须拿到 BAC/MAC 下一步承诺'];
  }
  if (item.title.includes('设备更新补贴')) {
    return ['先判断客户是否是在建技改项目', '准备政策口径、材料清单和设备证明', '把补贴收益并入客户投资回报测算'];
  }
  if (item.title.includes('财务') || item.title.includes('投资回报')) {
    return ['先问客户当前人工、良率、节拍和停机损失', '把 CAPEX 转成 OPEX/TCO 账，避免只谈报价', '输出一张回本周期测算表，作为下次拜访材料'];
  }
  if (item.title.includes('竞品') || item.title.includes('行业格局') || item.category === '竞品对比') {
    return ['先确认客户正在比较的品牌和决策标准', '用稳定性、服务响应、总拥有成本做差异化', '准备一组可验证的案例或参数，不直接贬低竞品'];
  }
  return ['先匹配客户行业和当前商机阶段', '提炼 2-3 个客户最关心的业务价值', '准备案例、数据和下一步承诺话术'];
}

function getUseTiming(item: KnowledgeItem) {
  if (item.title.includes('软技能') || item.category === '拜访话术') return ['开场前准备话术时', '需求挖掘卡住时', '收官要拿承诺时'];
  if (item.title.includes('设备更新补贴')) return ['客户有技改计划时', '客户担心预算压力时', '需要政策推动老板决策时'];
  if (item.title.includes('财务') || item.title.includes('投资回报')) return ['客户质疑价格时', '需要推动老板拍板时', '要从设备参数切到经营收益时'];
  if (item.title.includes('竞品') || item.title.includes('行业格局') || item.category === '竞品对比') return ['客户正在比价时', '竞品已进入客户视野时', '需要建立差异化标准时'];
  if (item.title.includes('洞察') || item.title.includes('客户生产工艺')) return ['拜访前做客户研究时', '现场参观产线时', '不知道从哪里切入痛点时'];
  return ['拜访前准备资料时', '客户问方案价值时', '需要补充专业依据时'];
}

function getQuestions(item: KnowledgeItem) {
  if (item.title.includes('软技能') || item.category === '拜访话术') return ['这次拜访的最佳下一步是什么？', '客户内部谁支持、谁反对、谁拍板？', '我能为客户提供什么额外价值？'];
  if (item.title.includes('设备更新补贴')) return ['项目是技改还是新建？', '项目总投资和当前进度是多少？', '客户是否已有备案、环评、设备清单？'];
  if (item.title.includes('财务') || item.title.includes('投资回报')) return ['现在一个班需要几个人？', '良率和停机损失大概多少？', '老板能接受多久回本？'];
  if (item.title.includes('竞品') || item.title.includes('行业格局') || item.category === '竞品对比') return ['客户现在还在看哪些品牌？', '客户最看重价格、稳定性还是交期？', '竞品承诺了什么指标？'];
  if (item.title.includes('客户生产工艺')) return ['当前瓶颈工位在哪里？', '人工最密集的是哪道工序？', '不良主要发生在哪个环节？'];
  return ['客户当前最头疼的生产问题是什么？', '这个问题影响成本、交期还是良率？', '如果认可方向，下一步谁参与评审？'];
}

function getOutputs(item: KnowledgeItem) {
  if (item.title.includes('软技能') || item.category === '拜访话术') return ['开场话术', 'BPIDC提问链', 'BAC/MAC收官承诺'];
  if (item.title.includes('设备更新补贴')) return ['政策适配判断', '申报材料清单', '补贴后投资回报口径'];
  if (item.title.includes('财务') || item.title.includes('投资回报')) return ['ROI测算表', '隐性成本清单', '老板版价值话术'];
  if (item.title.includes('竞品') || item.title.includes('行业格局') || item.category === '竞品对比') return ['竞品对比表', '差异化证据清单', '防守话术'];
  if (item.title.includes('客户生产工艺') || item.title.includes('洞察')) return ['产线痛点清单', '瓶颈工位记录', '下一步调研问题'];
  return ['客户关注点', '方案价值点', '下一步承诺'];
}

function getScriptCards(item: KnowledgeItem) {
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

  if (item.title.includes('设备更新补贴')) {
    return [
      {
        title: '政策开场',
        text: 'X总，您这个技改项目如果符合设备更新政策，采购决策就不只是设备投入，而是能不能抓住补贴窗口期。我想先帮您判断项目属性、投资额和进度是否匹配。',
      },
      {
        title: '材料引导',
        text: '申报通常要看项目备案、设备清单、合同、淘汰设备证明和资金拼盘。我们可以先把拓斯达设备参数、国产化率和节能资料准备好，减少您内部整理成本。',
      },
      {
        title: '推进收官',
        text: '如果您认可，我建议下一步把技改项目资料和设备清单对齐一次，我们同步给出补贴口径下的投资回报测算，方便您向老板汇报。',
      },
    ];
  }

  if (item.title.includes('财务') || item.title.includes('投资回报')) {
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

  if (item.title.includes('竞品') || item.title.includes('行业格局') || item.category === '竞品对比') {
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
  const [viewMode, setViewMode] = useState<'source' | 'analysis'>('source');
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('source')}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              backgroundColor: viewMode === 'source' ? '#1B6EF3' : '#F1F5F9',
              color: viewMode === 'source' ? '#FFFFFF' : '#64748B',
            }}
          >
            原文预览
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              backgroundColor: viewMode === 'analysis' ? '#1B6EF3' : '#F1F5F9',
              color: viewMode === 'analysis' ? '#FFFFFF' : '#64748B',
            }}
          >
            <Sparkles className="w-3 h-3" /> AI分析
          </button>
        </div>
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

        {viewMode === 'source' ? (
          <div className="rounded-lg border border-gray-200 p-4 max-h-[calc(100vh-310px)] overflow-y-auto" style={{ backgroundColor: '#FFFFFF', scrollbarWidth: 'thin' }}>
            <div className="text-xs mb-3" style={{ color: '#8F959E' }}>
              以下为知识库原文预览，保留完整文档内容，便于用户自行查阅。
            </div>
            <div className="space-y-1">
              {renderMarkdownLite(item.content)}
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
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

function KnowledgeCard({ item, catColors, onClick }: { item: KnowledgeItem; catColors: Record<string, string>; onClick: () => void }) {
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
