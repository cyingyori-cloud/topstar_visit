import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { knowledgeCategories } from '../data/mockData';
import { Lightbulb, Search, Pin, Flame } from 'lucide-react';
import { normalizeCompanyNames } from '../utils/companyNames';

export default function KnowledgePanel() {
  const { triggerKnowledgeContext, filteredKnowledge } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const hotItems = filteredKnowledge.filter(k => k.hot);
  const filteredItems = searchQuery
    ? filteredKnowledge.filter(k =>
        k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        k.category.includes(searchQuery)
      )
    : hotItems;

  return (
    <div className="board-panel">
      <div
        className="board-panel-header flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4.5 h-4.5" style={{ color: '#B9D7F0' }} />
          <span className="font-medium text-sm text-white">行业知识 & 话术</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowSearch(!showSearch); }}
          className="p-1 rounded hover:bg-white/10"
        >
          <Search className="w-4 h-4" style={{ color: '#CBD5E1' }} />
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-3">
          {showSearch && (
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索话术、方案、案例..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400 transition-colors"
                style={{ backgroundColor: '#F5F7FA' }}
                autoFocus
              />
            </div>
          )}

          <div className="mb-3">
            {!searchQuery && (
              <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: '#8F959E' }}>
                <Flame className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                热门话术
              </div>
            )}
            {searchQuery && (
              <div className="text-xs mb-2" style={{ color: '#8F959E' }}>
                搜索结果 ({filteredItems.length})
              </div>
            )}
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="group px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-200"
                  style={{ backgroundColor: '#F8F9FA' }}
                  onClick={() => triggerKnowledgeContext(item)}
                >
                  <div className="flex items-start gap-1.5">
                    <Pin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#1B6EF3' }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#1F2329' }}>
                        {normalizeCompanyNames(item.title)}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#8F959E' }}>
                        适用：{item.applicableIndustries.length > 0 ? item.applicableIndustries.join('、') : '所有客户'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-xs text-center py-4" style={{ color: '#8F959E' }}>未找到相关内容</div>
              )}
            </div>
          </div>

          <div className="text-xs mb-1.5" style={{ color: '#8F959E' }}>📂 知识分类</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {knowledgeCategories.map(cat => (
              <button
                key={cat.name}
                className="text-xs px-2 py-1 rounded-full hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'rgba(27,110,243,0.08)', color: '#1B6EF3' }}
                onClick={() => { setSearchQuery(cat.name); setShowSearch(true); }}
              >
                {cat.name}({cat.count})
              </button>
            ))}
          </div>

          <button
            className="text-xs hover:underline"
            style={{ color: '#1B6EF3' }}
            onClick={() => { setShowSearch(true); setSearchQuery(''); }}
          >
            查看全部 →
          </button>
        </div>
      )}
    </div>
  );
}
