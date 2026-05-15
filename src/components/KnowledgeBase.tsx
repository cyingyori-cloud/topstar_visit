import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { knowledgeCategories } from '../data/mockData';
import ChatArea from './ChatArea';
import { Search, BookOpen, Pin, Flame, Filter } from 'lucide-react';
import { normalizeCompanyNames } from '../utils/companyNames';

const allCategories = ['全部', ...knowledgeCategories.map(c => c.name)];

export default function KnowledgeBase() {
  const { triggerKnowledgeContext, filteredKnowledge, currentRep } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');

  const audienceLabel = currentRep.level === 1 ? '战略层内容' : currentRep.level === 2 ? '管理层内容' : '执行层内容';

  const filtered = filteredKnowledge.filter(k => {
    const matchSearch = !search || k.title.includes(search) || k.tags.some(t => t.includes(search)) || k.category.includes(search);
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
              placeholder="搜索话术、方案、案例..."
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
        </div>

        {/* Hot */}
        {hotItems.length > 0 && (
          <div className="bg-white rounded-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Flame className="w-4 h-4" style={{ color: '#EF4444' }} />
              <span className="font-medium text-sm" style={{ color: '#1F2329' }}>热门推荐</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {hotItems.map(item => (
                <KnowledgeCard key={item.id} item={item} catColors={catColors} onClick={() => triggerKnowledgeContext(item)} />
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
              <KnowledgeCard key={item.id} item={item} catColors={catColors} onClick={() => triggerKnowledgeContext(item)} />
            ))}
            {normalItems.length === 0 && hotItems.length === 0 && (
              <div className="col-span-3 text-xs text-center py-8" style={{ color: '#8F959E' }}>未找到相关内容</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: '33.4%' }} className="min-w-0">
        <ChatArea />
      </div>
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
