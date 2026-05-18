import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { completedVisits } from '../data/mockData';
import { TIER_RULES } from '../data/skills';
import CustomerBadge from './CustomerBadge';
import ChatArea from './ChatArea';
import { Search, Building2, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

function getDaysSinceLastVisit(customerId: string): { days: number; hasVisit: boolean } {
  const visits = completedVisits.filter(v => v.customerId === customerId);
  if (visits.length === 0) return { days: 0, hasVisit: false };
  const last = visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
  return { days: Math.floor((new Date().getTime() - new Date(last.visitDate).getTime()) / 86400000), hasVisit: true };
}

export default function CustomerManagement() {
  const { filteredCustomers, triggerCustomerContext } = useAppStore();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('全部');

  const filtered = filteredCustomers.filter(c => {
    const matchSearch = !search || c.name.includes(search) || c.industry.includes(search);
    const matchLevel = levelFilter === '全部' || c.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const stats = {
    total: filteredCustomers.length,
    sCount: filteredCustomers.filter(c => c.level === 'S').length,
    aCount: filteredCustomers.filter(c => c.level === 'A').length,
    totalOpp: filteredCustomers.reduce((s, c) => s + c.opportunityAmount, 0),
  };
  const levelFocus: Record<'S' | 'A' | 'B' | 'C', string> = {
    S: '高层关系与重点商机',
    A: '复购扩产与季度拜访',
    B: '月度触达与需求信号',
    C: '低成本激活筛选',
  };
  const levelSummary = (['S', 'A', 'B', 'C'] as const).map(level => {
    const rule = TIER_RULES.find(r => r.tier === level);
    const customersInLevel = filteredCustomers.filter(c => c.level === level);
    const amount = customersInLevel.reduce((sum, customer) => sum + customer.opportunityAmount, 0);
    const actualShare = stats.total > 0 ? Math.round((customersInLevel.length / stats.total) * 100) : 0;
    return {
      level,
      label: rule?.label || '',
      color: rule?.color || '#8F959E',
      estimatedShare: rule?.estimatedShare || '-',
      count: customersInLevel.length,
      amount,
      actualShare,
      focus: levelFocus[level],
    };
  });

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4">
      <div className="overflow-y-auto space-y-3 pr-1" style={{ width: '66.6%', scrollbarWidth: 'thin' }}>

        {/* Stats */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center"><div className="text-2xl font-bold" style={{ color: '#1B6EF3' }}>{stats.total}</div><div className="text-xs" style={{ color: '#8F959E' }}>客户总数</div></div>
            <div className="text-center"><div className="text-2xl font-bold" style={{ color: '#DC2626' }}>{stats.sCount}</div><div className="text-xs" style={{ color: '#8F959E' }}>S级客户</div></div>
            <div className="text-center"><div className="text-2xl font-bold" style={{ color: '#EA580C' }}>{stats.aCount}</div><div className="text-xs" style={{ color: '#8F959E' }}>A级客户</div></div>
            <div className="text-center"><div className="text-2xl font-bold" style={{ color: '#52C41A' }}>¥{stats.totalOpp}万</div><div className="text-xs" style={{ color: '#8F959E' }}>商机总额</div></div>
          </div>
        </div>

        {/* Customer structure snapshot */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium" style={{ color: '#1F2329' }}>客户结构概览</div>
            <div className="text-xs" style={{ color: '#8F959E' }}>按当前销售负责客户统计</div>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {levelSummary.map(item => (
              <div key={item.level} className="rounded-lg px-3 py-3 border" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: item.color }}>{item.level}级 · {item.label}</span>
                  <span className="text-xs" style={{ color: '#8F959E' }}>参考{item.estimatedShare}</span>
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-2xl font-bold" style={{ color: '#1F2329' }}>{item.count}</span>
                  <span className="text-xs mb-1" style={{ color: '#8F959E' }}>家 · 当前{item.actualShare}%</span>
                </div>
                <div className="text-xs mb-2" style={{ color: '#64748B' }}>商机 ¥{item.amount}万</div>
                <div className="text-xs rounded-md px-2 py-1" style={{ backgroundColor: `${item.color}10`, color: item.color }}>
                  {item.focus}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search & filter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8F959E' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索客户名称或行业..." className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400 bg-white" />
          </div>
          <div className="flex items-center gap-1">
            {['全部', 'S', 'A', 'B', 'C'].map(lv => (
              <button key={lv} onClick={() => setLevelFilter(lv)}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                style={{ backgroundColor: levelFilter === lv ? '#1B6EF3' : '#F3F4F6', color: levelFilter === lv ? '#fff' : '#5A5A5A', fontWeight: levelFilter === lv ? 600 : 400 }}>
                {lv === '全部' ? '全部' : `${lv}级`}
              </button>
            ))}
          </div>
        </div>

        {/* Customer list */}
        <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#F0F0F0' }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>客户名称</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>级别</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>地区</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>行业</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>商机</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>联系人</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={{ color: '#8F959E' }}>拜访状态</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const { days, hasVisit } = getDaysSinceLastVisit(c.id);
                const rule = TIER_RULES.find(r => r.tier === c.level);
                const isOverdue = hasVisit && rule && days > rule.overdueDays;
                const isCritical = hasVisit && rule && days > rule.overdueDays * 2;
                const isNeverVisited = !hasVisit;

                return (
                  <tr key={c.id} className="border-b cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: '#F7F8FA' }}
                    onClick={() => triggerCustomerContext(c.id, 'customer')}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8F959E' }} />
                        <span className="font-medium truncate" style={{ color: '#1F2329' }}>{getFullCompanyName(c.name)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><CustomerBadge level={c.level} /></td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: '#64748B' }}>{c.region}</td>
                    <td className="px-3 py-2.5"><span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#8F959E' }}>{c.industry}</span></td>
                    <td className="px-3 py-2.5 text-xs font-medium" style={{ color: '#1F2329' }}>¥{c.opportunityAmount}万</td>
                    <td className="px-3 py-2.5 text-xs truncate max-w-28" style={{ color: '#64748B' }}>{c.keyContacts.map(k => k.name).join('、')}</td>
                    <td className="px-3 py-2.5">
                      {isNeverVisited ? (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>未拜访</span>
                      ) : isCritical ? (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>严重超期{days}天</span>
                      ) : isOverdue ? (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFF7ED', color: '#EA580C' }}>超期{days}天</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F0FDF4', color: '#52C41A' }}>合规（{days}天前）</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-xs text-center py-8" style={{ color: '#8F959E' }}>未找到匹配的客户</div>
          )}
        </div>
      </div>

      <div style={{ width: '33.4%' }} className="min-w-0">
        <ChatArea />
      </div>
    </div>
  );
}
