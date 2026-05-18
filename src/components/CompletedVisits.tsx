import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { TIER_RULES } from '../data/skills';
import CustomerBadge from './CustomerBadge';
import VisitEvaluation from './VisitEvaluation';
import { CheckCircle2, ChevronDown, ChevronRight, Check, Star, ClipboardCheck } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

const periods = ['本周', '本月', '本季'];
const levelColors: Record<string, string> = { S: '#DC2626', A: '#EA580C', B: '#16A34A', C: '#7B8794' };

export default function CompletedVisits() {
  const { completedPeriod, setCompletedPeriod, triggerCustomerContext, filteredCompletedVisits } = useAppStore();
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [evalVisit, setEvalVisit] = useState<any>(null);

  const completionGoals = (['S', 'A', 'B', 'C'] as const).map(level => {
    const levelCompleted = new Set(filteredCompletedVisits.filter(v => v.customerLevel === level).map(v => v.customerId)).size;
    const targets: Record<string, number> = { S: 5, A: 5, B: 6, C: 4 };
    return { level, completed: levelCompleted, target: targets[level] };
  });
  const totalCompleted = completionGoals.reduce((s, g) => s + g.completed, 0);
  const recentVisits = showAll ? filteredCompletedVisits : filteredCompletedVisits.slice(0, 3);

  return (
    <>
      <div className="board-panel">
        <div className="board-panel-header flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5" style={{ color: '#B9D7F0' }} />
            <span className="font-medium text-sm text-white">已完成拜访</span>
          </div>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowPeriodMenu(!showPeriodMenu); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/10" style={{ color: '#E5E7EB' }}>
              {completedPeriod} <ChevronDown className="w-3 h-3" />
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[80px]">
                {periods.map(p => (
                  <button key={p} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                    style={{ color: p === completedPeriod ? '#1F5F99' : '#1F2329' }}
                    onClick={(e) => { e.stopPropagation(); setCompletedPeriod(p); setShowPeriodMenu(false); }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="px-4 py-3">
            <div className="text-sm mb-3" style={{ color: '#1F2329' }}>
              本月已完成：<span className="font-semibold" style={{ color: '#1B6EF3' }}>{totalCompleted}次</span>
            </div>

            {/* Progress by level */}
            <div className="text-xs mb-2" style={{ color: '#8F959E' }}>按客户等级：</div>
            <div className="space-y-2 mb-4">
              {completionGoals.map(goal => {
                const pct = Math.min(100, (goal.completed / goal.target) * 100);
                const isComplete = goal.completed >= goal.target;
                return (
                  <div key={goal.level} className="flex items-center gap-2">
                    <span className="text-xs w-8 font-medium" style={{ color: levelColors[goal.level] }}>{goal.level}级</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: levelColors[goal.level], opacity: 0.8 }} />
                    </div>
                    <span className="text-xs min-w-[70px] text-right" style={{ color: '#5A5A5A' }}>{goal.completed}次 (目标{goal.target})</span>
                    {isComplete && <Check className="w-3.5 h-3.5" style={{ color: '#52C41A' }} />}
                  </div>
                );
              })}
            </div>

            {/* Recent completed */}
            <div className="text-xs mb-2" style={{ color: '#8F959E' }}>最近完成：</div>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {recentVisits.map(visit => {
                const rule = TIER_RULES.find(r => r.tier === visit.customerLevel);
                const checks = rule?.fiveChecks || ['有实质性进展'];
                // Simulate: some visits evaluated, some not
                const hasEvaluation = Math.random() > 0.3; // In real app, check if evaluation exists
                const completedChecks = hasEvaluation
                  ? checks.slice(0, visit.customerLevel === 'S' ? 3 + Math.floor(Math.random() * 2) : visit.customerLevel === 'A' ? 2 + Math.floor(Math.random()) : 1)
                  : [];
                const isEvaluated = completedChecks.length > 0;
                const isEffective = completedChecks.length >= checks.length;

                return (
                  <div key={visit.id}
                    className="group px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-200"
                    style={{ backgroundColor: '#F8F9FA' }}
                    onClick={() => triggerCustomerContext(visit.customerId, 'completed')}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: '#1F2329' }}>{getFullCompanyName(visit.customerName)}</span>
                        <CustomerBadge level={visit.customerLevel} />
                        <span className="text-xs" style={{ color: '#8F959E' }}>· {visit.visitDate.slice(5)}</span>
                        {visit.archived && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100" style={{ color: '#8F959E' }}>已归档</span>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#1B6EF3' }} />
                    </div>
                    <div className="text-xs" style={{ color: '#5A5A5A' }}>拜访结果：{visit.outcome}</div>

                    {/* Evaluation status + button */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        {isEvaluated ? (
                          <>
                            <Star className="w-3 h-3" style={{ color: isEffective ? '#52C41A' : '#F5A623' }} />
                            <span className="text-xs" style={{ color: isEffective ? '#52C41A' : '#F5A623' }}>
                              {isEffective ? '有效拜访' : `部分完成(${completedChecks.length}/${checks.length})`}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: '#8F959E' }}>待评估</span>
                        )}
                        <span className="text-xs" style={{ color: '#B0B5BE' }}>· {rule?.label}</span>
                      </div>
                      <button
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                        style={{ color: '#1B6EF3' }}
                        onClick={(e) => { e.stopPropagation(); setEvalVisit(visit); }}>
                        <ClipboardCheck className="w-3 h-3" />
                        {isEvaluated ? '重新评估' : '开始评估'}
                      </button>
                    </div>

                    {visit.nextSteps && <div className="text-xs mt-0.5" style={{ color: '#8F959E' }}>下一步：{visit.nextSteps}</div>}
                  </div>
                );
              })}
            </div>

            {!showAll && filteredCompletedVisits.length > 3 && (
              <button className="text-xs mt-2 hover:underline" style={{ color: '#1B6EF3' }} onClick={() => setShowAll(true)}>查看全部 →</button>
            )}
            {filteredCompletedVisits.length === 0 && (
              <div className="text-xs text-center py-4" style={{ color: '#8F959E' }}>暂无已完成的拜访记录</div>
            )}
          </div>
        )}
      </div>

      {/* Evaluation dialog */}
      <VisitEvaluation visit={evalVisit} onClose={() => setEvalVisit(null)} />
    </>
  );
}
