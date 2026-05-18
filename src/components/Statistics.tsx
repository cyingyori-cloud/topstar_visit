import { useAppStore } from '../stores/appStore';
import ChatArea from './ChatArea';
import { TrendingUp, Users, CheckCircle2, Target, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar, Phone } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';
import { TIER_RULES } from '../data/skills';
import { completedVisits } from '../data/mockData';

const levelColors: Record<string, string> = { S: '#DC2626', A: '#EA580C', B: '#16A34A', C: '#7B8794' };

export default function Statistics() {
  const { filteredCustomers, filteredTasks, filteredCompletedVisits, filteredCoverage, currentRep } = useAppStore();

  const totalOpp = filteredCustomers.reduce((s, c) => s + c.opportunityAmount, 0);

  // Opportunity by level
  const oppByLevel = (['S', 'A', 'B', 'C'] as const).map(level => {
    const c = filteredCustomers.filter(x => x.level === level);
    const amount = c.reduce((s, x) => s + x.opportunityAmount, 0);
    return { level, amount, count: c.length };
  });

  // Top customers by opportunity
  const topCustomers = [...filteredCustomers].sort((a, b) => b.opportunityAmount - a.opportunityAmount).slice(0, 5);

  // Stage distribution (销售成单路径)
  const stages = ['"收"线索', '"查"信息', '"获"商机', '"做"客情', '"观"案例', '"报"价值', '"约"高层', '"定"商务', '"签"合同', '"收"全款', '休眠'];
  const stageData = stages.map(s => ({
    stage: s,
    count: filteredCustomers.filter(c => c.opportunityStage === s).length,
  }));

  // Bar chart max
  const maxOpp = Math.max(...oppByLevel.map(l => l.amount), 1);
  const maxStage = Math.max(...stageData.map(s => s.count), 1);

  // 超期客户分析
  const today = new Date();
  const overdueAnalysis = (['S', 'A', 'B', 'C'] as const).map(level => {
    const rule = TIER_RULES.find(r => r.tier === level);
    const customersInLevel = filteredCustomers.filter(c => c.level === level);
    const overdueCustomers = customersInLevel.filter(c => {
      const visits = completedVisits.filter(v => v.customerId === c.id);
      if (visits.length === 0) return true;
      const lastVisit = visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
      const daysSince = Math.floor((today.getTime() - new Date(lastVisit.visitDate).getTime()) / 86400000);
      return daysSince > (rule?.overdueDays || 30);
    });
    return {
      level,
      total: customersInLevel.length,
      overdue: overdueCustomers.length,
      overdueAmount: overdueCustomers.reduce((s, c) => s + c.opportunityAmount, 0),
      overdueDays: rule?.overdueDays || 30,
    };
  });
  const totalOverdue = overdueAnalysis.reduce((s, a) => s + a.overdue, 0);
  const totalOverdueAmount = overdueAnalysis.reduce((s, a) => s + a.overdueAmount, 0);

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4">
      <div className="overflow-y-auto space-y-3 pr-1" style={{ width: '66.6%', scrollbarWidth: 'thin' }}>

        {/* Overview KPI */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="text-xs font-medium mb-3" style={{ color: '#8F959E' }}>📊 {currentRep.name} · 核心指标</div>
          <div className="grid grid-cols-5 gap-4">
            <KpiCard label="客户总数" value={String(filteredCustomers.length)} icon={Users} color="#1B6EF3" />
            <KpiCard label="商机总额" value={`¥${totalOpp}万`} icon={TrendingUp} color="#52C41A" />
            <KpiCard label="本周任务" value={String(filteredTasks.length)} icon={Target} color="#F5A623" />
            <KpiCard label="已完成拜访" value={String(filteredCompletedVisits.length)} icon={CheckCircle2} color="#7C3AED" />
            <KpiCard label="覆盖率" value={`${filteredCoverage.total > 0 ? Math.round(filteredCoverage.covered / filteredCoverage.total * 100) : 0}%`} icon={BarChart3} color="#DC2626" />
          </div>
        </div>

        {/* 核心洞察卡片 */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: '#F5A623' }} />
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>本周经营洞察</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* 超期客户 */}
            <div className="rounded-lg p-3" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: '#D97706' }} />
                <span className="text-xs font-medium" style={{ color: '#92400E' }}>超期客户</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#B45309' }}>{totalOverdue}<span className="text-xs font-normal ml-1">家</span></div>
              <div className="text-xs mt-1" style={{ color: '#B45309' }}>涉及商机 ¥{totalOverdueAmount}万</div>
              <div className="flex gap-2 mt-2">
                {overdueAnalysis.filter(a => a.overdue > 0).map(a => (
                  <span key={a.level} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: levelColors[a.level] + '20', color: levelColors[a.level] }}>
                    {a.level}级 {a.overdue}家
                  </span>
                ))}
              </div>
            </div>
            {/* 本周待办 */}
            <div className="rounded-lg p-3" style={{ backgroundColor: '#DBEAFE', border: '1px solid #93C5FD' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Phone className="w-3.5 h-3.5" style={{ color: '#1D4ED8' }} />
                <span className="text-xs font-medium" style={{ color: '#1E40AF' }}>本周拜访</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#1D4ED8' }}>{filteredTasks.length}<span className="text-xs font-normal ml-1">个任务</span></div>
              <div className="text-xs mt-1" style={{ color: '#1E40AF' }}>
                {filteredTasks.filter(t => t.confirmationStatus === 'pending_confirmation').length} 个待确认
              </div>
            </div>
            {/* 商机推进 */}
            <div className="rounded-lg p-3" style={{ backgroundColor: '#D1FAE5', border: '1px solid #86EFAC' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#15803D' }} />
                <span className="text-xs font-medium" style={{ color: '#166534' }}>商机推进</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#15803D' }}>
                {stageData.filter(s => s.stage === '"获"商机' || s.stage === '"约"高层' || s.stage === '"定"商务' || s.stage === '"签"合同').reduce((s, i) => s + i.count, 0)}
                <span className="text-xs font-normal ml-1">家在推进</span>
              </div>
              <div className="text-xs mt-1" style={{ color: '#166534' }}>
                线索 {stageData.find(s => s.stage === '"收"线索')?.count || 0} 家 · 商机 {stageData.find(s => s.stage === '"获"商机')?.count || 0} 家 · 高层 {stageData.find(s => s.stage === '"约"高层')?.count || 0} 家
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Opportunity by level - horizontal bar */}
          <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" style={{ color: '#1B6EF3' }} />
              <span className="font-medium text-sm" style={{ color: '#1F2329' }}>商机金额按等级分布</span>
            </div>
            <div className="space-y-3">
              {oppByLevel.map(item => (
                <div key={item.level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: levelColors[item.level] }}>{item.level}级 ({item.count}家)</span>
                    <span className="text-xs" style={{ color: '#5A5A5A' }}>¥{item.amount}万</span>
                  </div>
                  <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${(item.amount / maxOpp) * 100}%`,
                      backgroundColor: levelColors[item.level],
                      opacity: 0.8,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage distribution */}
          <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4" style={{ color: '#1B6EF3' }} />
              <span className="font-medium text-sm" style={{ color: '#1F2329' }}>商机阶段分布</span>
            </div>
            <div className="space-y-2">
              {stageData.map((item, i) => (
                <div key={item.stage} className="flex items-center gap-2">
                  <span className="text-xs w-16 text-right" style={{ color: '#8F959E' }}>{item.stage}</span>
                  <div className="flex-1 h-5 rounded-md bg-gray-100 overflow-hidden flex items-center">
                    <div className="h-full rounded-md flex items-center justify-end pr-1 transition-all duration-700" style={{
                      width: item.count > 0 ? `${Math.max((item.count / maxStage) * 100, 15)}%` : '0%',
                      backgroundColor: ['#FEE2E2', '#FED7AA', '#DBEAFE', '#D1FAE5', '#E9D5FF'][i],
                    }}>
                      {item.count > 0 && <span className="text-xs font-medium" style={{ color: ['#DC2626', '#EA580C', '#2563EB', '#059669', '#7C3AED'][i] }}>{item.count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top customers by opportunity */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: '#52C41A' }} />
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>商机金额 TOP 5</span>
          </div>
          <div className="space-y-3">
            {topCustomers.map((c, i) => {
              const maxAmt = topCustomers[0]?.opportunityAmount || 1;
              const rankColors = ['#F5A623', '#8F959E', '#CD7F32', '#D1D5DB', '#D1D5DB'];
              return (
                <div key={c.id} className="flex items-center gap-3">
                  {/* 排名 */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: i < 3 ? rankColors[i] : '#E5E7EB',
                      color: i < 3 ? '#fff' : '#9CA3AF',
                    }}
                  >
                    {i + 1}
                  </div>
                  {/* 客户名 + 等级 */}
                  <div className="w-44 flex-shrink-0 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: '#1F2329' }}>
                      {getFullCompanyName(c.name)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#8F959E' }}>{c.level}级 · {c.industry}</div>
                  </div>
                  {/* 进度条 */}
                  <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(c.opportunityAmount / maxAmt) * 100}%`,
                        backgroundColor: levelColors[c.level],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  {/* 金额 */}
                  <span className="w-16 text-right text-sm font-semibold flex-shrink-0" style={{ color: '#1B6EF3' }}>
                    ¥{c.opportunityAmount}万
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage comparison */}
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#52C41A' }} />
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>拜访覆盖详情</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {filteredCoverage.byLevel.map(item => {
              const pct = item.total > 0 ? Math.round(item.covered / item.total * 100) : 0;
              const r = 28;
              const circ = 2 * Math.PI * r;
              return (
                <div key={item.level} className="flex flex-col items-center py-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                  <div className="relative mb-1">
                    <svg width={r * 2 + 8} height={r * 2 + 8} viewBox={`0 0 ${r * 2 + 8} ${r * 2 + 8}`}>
                      <circle cx={r + 4} cy={r + 4} r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
                      <circle cx={r + 4} cy={r + 4} r={r} fill="none" stroke={levelColors[item.level]} strokeWidth="5"
                        strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                        transform={`rotate(-90 ${r + 4} ${r + 4})`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold" style={{ color: levelColors[item.level] }}>{pct}%</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium" style={{ color: levelColors[item.level] }}>{item.level}级</span>
                  <span className="text-xs" style={{ color: '#8F959E' }}>{item.covered}/{item.total}家</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ width: '33.4%' }} className="min-w-0">
        <ChatArea />
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="text-center py-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
      <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: '#8F959E' }}>{label}</div>
    </div>
  );
}
