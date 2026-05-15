import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { TIER_RULES } from '../data/skills';
import { BarChart3, ChevronDown, AlertTriangle } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

const periods = ['本周', '本月', '本季'];

const levelColors: Record<string, string> = { S: '#DC2626', A: '#EA580C', B: '#2563EB', C: '#9CA3AF' };
const alertThresholds: Record<string, number> = { S: 80, A: 60, B: 0, C: 0 };

export default function CoverageRate() {
  const { coveragePeriod, setCoveragePeriod, triggerCustomerContext, filteredCoverage } = useAppStore();
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const overallPct = filteredCoverage.total > 0 ? Math.round((filteredCoverage.covered / filteredCoverage.total) * 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(overallPct / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-white rounded-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" style={{ backgroundColor: '#2D3A4F' }} onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5" style={{ color: '#93C5FD' }} />
          <span className="font-medium text-sm text-white">拜访覆盖率</span>
        </div>
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setShowPeriodMenu(!showPeriodMenu); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/10" style={{ color: '#E5E7EB' }}>
            {coveragePeriod} <ChevronDown className="w-3 h-3" />
          </button>
          {showPeriodMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[80px]">
              {periods.map(p => (
                <button key={p} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                  style={{ color: p === coveragePeriod ? '#1B6EF3' : '#1F2329' }}
                  onClick={(e) => { e.stopPropagation(); setCoveragePeriod(p); setShowPeriodMenu(false); }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-3">
          {/* Donut */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#F0F0F0" strokeWidth="8" />
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#1B6EF3" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={strokeDasharray} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold" style={{ color: '#1B6EF3' }}>{overallPct}%</span>
                <span className="text-xs" style={{ color: '#8F959E' }}>{filteredCoverage.covered}/{filteredCoverage.total}家</span>
              </div>
            </div>
          </div>

          {/* By level with SABC thresholds */}
          <div className="text-xs mb-2" style={{ color: '#8F959E' }}>按等级覆盖（SABC规则）：</div>
          <div className="space-y-2 mb-3">
            {filteredCoverage.byLevel.map(item => {
              const pct = item.total > 0 ? Math.round((item.covered / item.total) * 100) : 0;
              const threshold = alertThresholds[item.level];
              const isAlert = threshold > 0 && pct < threshold;
              const rule = TIER_RULES.find(r => r.tier === item.level);
              return (
                <div key={item.level}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs w-14 font-medium" style={{ color: levelColors[item.level] }}>{item.level}级客户</span>
                      {isAlert && <AlertTriangle className="w-3 h-3" style={{ color: '#DC2626' }} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#5A5A5A' }}>{item.covered}/{item.total} {pct}%</span>
                      {isAlert && <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: 10 }}>{'<'}{threshold}%预警</span>}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${pct}%`,
                      backgroundColor: isAlert ? '#DC2626' : levelColors[item.level],
                      opacity: isAlert ? 0.9 : 0.7,
                    }} />
                  </div>
                  {rule && <div className="text-xs mt-0.5" style={{ color: '#B0B5BE' }}>规则：{rule.label} · {rule.visitFrequency > 0 ? `≥${rule.visitFrequency}次/月上门` : `联系≥${rule.contactFrequency}次/月`}</div>}
                </div>
              );
            })}
          </div>

          {/* Uncovered alerts */}
          {filteredCoverage.uncoveredHighPriority.filter(c => c.customerLevel === 'S').length > 0 && (
            <div className="rounded-lg px-3 py-2 mb-2" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: '#EA580C' }}>
                <AlertTriangle className="w-3.5 h-3.5" /> 未覆盖S级客户：
              </div>
              {filteredCoverage.uncoveredHighPriority.filter(c => c.customerLevel === 'S').map(c => (
                <div key={c.customerId} className="text-xs cursor-pointer hover:underline" style={{ color: '#EA580C' }}
                  onClick={() => triggerCustomerContext(c.customerId, 'uncovered')}>
                  · {getFullCompanyName(c.customerName)}（距上次：{c.daysSinceLastVisit}天 · 规则：7天）
                </div>
              ))}
            </div>
          )}

          {filteredCoverage.uncoveredHighPriority.filter(c => c.customerLevel === 'A').length > 0 && (
            <button className="flex items-center gap-1.5 text-xs hover:underline" style={{ color: '#F59E0B' }}
              onClick={() => {
                const first = filteredCoverage.uncoveredHighPriority.find(c => c.customerLevel === 'A');
                if (first) triggerCustomerContext(first.customerId, 'uncovered');
              }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              超30天未拜访A级客户（{filteredCoverage.uncoveredHighPriority.filter(c => c.customerLevel === 'A').length}家 · 规则：30天）→
            </button>
          )}

          {filteredCoverage.total === 0 && (
            <div className="text-xs text-center py-4" style={{ color: '#8F959E' }}>暂无客户数据</div>
          )}
        </div>
      )}
    </div>
  );
}
