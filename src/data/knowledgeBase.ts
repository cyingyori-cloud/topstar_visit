import type { KnowledgeItem } from './mockData';

const modules = import.meta.glob('../../knowledge/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const CATEGORY_RULES: Array<{ category: KnowledgeItem['category']; keywords: string[] }> = [
  { category: '拜访话术', keywords: ['销售软技能', '话术', '拜访', '沟通'] },
  { category: '竞品对比', keywords: ['竞品', '行业格局'] },
  { category: '成功案例', keywords: ['应用场景', '案例', '客户生产工艺'] },
  { category: '行业方案', keywords: ['产品', '底层技术', '战略', '市场', '洞察', '项目管理', '补贴', '财务', '投资回报'] },
];

const INDUSTRY_KEYWORDS = [
  '3C代工',
  '消费电子',
  '面板制造',
  '家电制造',
  '锂电池',
  '新能源',
  '汽车',
  '医疗器械',
  '食品',
  '包装',
  '塑料加工',
  '通用制造',
  '半导体',
  'LED封装',
];

function getTitleFromPath(path: string) {
  const filename = decodeURIComponent(path.split('/').pop() || path);
  return filename.replace(/\.md$/i, '');
}

function inferCategory(title: string): KnowledgeItem['category'] {
  const matched = CATEGORY_RULES.find(rule => rule.keywords.some(keyword => title.includes(keyword)));
  return matched?.category || '行业方案';
}

function extractTags(title: string, content: string) {
  const seed = [
    ...title.split(/[\s_-]+/),
    ...INDUSTRY_KEYWORDS.filter(keyword => content.includes(keyword)),
  ];
  return [...new Set(seed.map(item => item.trim()).filter(Boolean))].slice(0, 8);
}

function normalizeDocumentContent(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .trim();
}

export const knowledgeDocumentItems: KnowledgeItem[] = Object.entries(modules)
  .map(([path, content], index) => {
    const title = getTitleFromPath(path);
    const category = inferCategory(title);
    const applicableIndustries = INDUSTRY_KEYWORDS.filter(keyword => content.includes(keyword));

    return {
      id: `doc-${index + 1}`,
      title,
      category,
      content: normalizeDocumentContent(content),
      applicableIndustries,
      applicableLevels: ['S', 'A', 'B', 'C'],
      tags: extractTags(title, content),
      hot: ['销售软技能', '产品知识', '核心产品', '客户生产工艺', '财务与投资回报'].some(keyword => title.includes(keyword)),
      audience: 'all',
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

export const knowledgeDocumentCategories = Object.entries(
  knowledgeDocumentItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {}),
).map(([name, count]) => ({ name, count }));
