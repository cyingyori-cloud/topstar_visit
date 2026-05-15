import { useAppStore } from '../stores/appStore';
import ChatArea from './ChatArea';
import { TrendingUp, Users, CheckCircle2, Target, BarChart3, PieChart } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

const levelColors: Record<string, string> = { S: '#DC2626', A: '#EA580C', B: '#2563EB', C: '#9CA3AF' };

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

  // Stage distribution
  const stages = ['初步接触', '需求确认', '方案沟通', '方案评估', '技术评审'];
  const stageData = stages.map(s => ({
    stage: s,
    count: filteredCustomers.filter(c => c.opportunityStage.includes(s.replace('需求确认', '需求确认'))).length,
  }));

  // Bar chart max
  const maxOpp = Math.max(...oppByLevel.map(l => l.amount), 1);
  const maxStage = Math.max(...stageData.map(s => s.count), 1);

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
