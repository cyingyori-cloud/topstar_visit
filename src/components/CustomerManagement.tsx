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

        {/* SABC rules cards */}
        <div className="grid grid-cols-4 gap-2.5">
          {TIER_RULES.map(r => (
            <div key={r.tier} className="bg-white rounded-lg px-3 py-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: `3px solid ${r.color}` }}>
              <div className="text-sm font-bold mb-1.5" style={{ color: r.color }}>{r.tier}级 · {r.label}</div>
              <div className="space-y-1 text-xs" style={{ color: '#64748B' }}>
                <div>拜访频率：{r.visitFrequency > 0 ? `≥${r.visitFrequency}次/月上门` : r.contactFrequency > 0 ? `月度联系≥${r.contactFrequency}次` : '激活优先'}</div>
                <div>超期提醒：<span style={{ color: r.color, fontWeight: 600 }}>{r.overdueDays}天</span></div>
              </div>
            </div>
          ))}
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
