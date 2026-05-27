import { useState, type ReactNode } from 'react';
import { Activity, CircleDollarSign, Compass, ShieldCheck, Target } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { customers, completedVisits } from '../data/mockData';
import { TIER_RULES } from '../data/skills';
import { getFullCompanyName } from '../utils/companyNames';

function getDaysSinceLastVisit(customerId: string): number {
  const visits = completedVisits.filter(v => v.customerId === customerId);
  if (visits.length === 0) return 999;
  const last = visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
  const today = new Date();
  return Math.floor((today.getTime() - new Date(last.visitDate).getTime()) / 86400000);
}

function getVisitMode(task: any, customer?: any) {
  const hasActiveOpportunity = task.opportunityIntent !== 'no_opportunity'
    && !/无商机|休眠|暂停/i.test(`${task.opportunityTopic || ''} ${customer?.currentOpportunity || ''} ${customer?.opportunityStage || ''}`);
  return hasActiveOpportunity ? 'win' : 'cultivate';
}

function getPrepScore(task: any) {
  const checks = [
    Boolean(task.visitGoal),
    Boolean(task.expectedCommitment),
    Boolean(task.opportunityRisk || task.visitFocus),
    Array.isArray(task.contacts) && task.contacts.length > 0,
    Array.isArray(task.prepMaterials) && task.prepMaterials.length > 0,
    Array.isArray(task.decisionChain) && task.decisionChain.length > 0,
  ];
  return checks.filter(Boolean).length;
}

function getPriorityScore(task: any, customer?: any) {
  let score = 0;
  const mode = getVisitMode(task, customer);
  const daysSince = getDaysSinceLastVisit(task.customerId);
  const rule = TIER_RULES.find(r => r.tier === task.customerLevel);
  if (task.customerLevel === 'S') score += 28;
  if (task.customerLevel === 'A') score += 22;
  if (mode === 'win') score += 24;
  if (/约|定|签|报价值|高层|商务/.test(`${customer?.opportunityStage || ''} ${task.expectedCommitment || ''} ${task.visitPurpose || ''}`)) score += 20;
  if ((task.healthScore || 70) < 60) score += 16;
  if (rule && daysSince > rule.overdueDays) score += 14;
  if (/ROI|TCO|审批|合同|定商务|竞品|比价|风险/.test(`${task.opportunityRisk || ''} ${task.visitGoal || ''} ${task.expectedCommitment || ''}`)) score += 12;
  return score;
}

function getActionTitle(task: any, customer?: any) {
  const mode = getVisitMode(task, customer);
  if (mode === 'cultivate') return '先判断是否值得见：验证痛点、预算和关键人';
  if (/定商务|报价|合同|审批|签约/.test(`${task.expectedCommitment || ''} ${task.visitGoal || ''}`)) {
    return '高层评审后收口商务：报价、合同、审批链要问清';
  }
  if (/约|高层/.test(`${customer?.opportunityStage || ''} ${task.visitPurpose || ''}`)) {
    return '从采购技术层往上推：先借内线约到真实决策人';
  }
  return '推进当前商机：拿到客户下一步明确承诺';
}

function getActionHint(task: any) {
  if (task.customerId === 'c4') {
    return '比亚迪电子本次重点不是补参数，而是让高层认可国产装备的TCO/ROI和定商务路径。';
  }
  return task.opportunityRisk || task.visitFocus || task.visitGoal || '确认客户当前状态、关键问题和下一步动作。';
}

function getRankingReasons(task: any, customer?: any) {
  const reasons: string[] = [];
  const mode = getVisitMode(task, customer);
  if (['S', 'A'].includes(task.customerLevel)) reasons.push(`${task.customerLevel}级客户`);
  if (mode === 'win') reasons.push('有活跃商机');
  if (customer?.opportunityStage) reasons.push(`${customer.opportunityStage}阶段`);
  if (Number(customer?.opportunityPercent || 0) >= 45) reasons.push(`${customer?.opportunityPercent}%赢率`);
  if (/高层|约/.test(`${customer?.opportunityStage || ''} ${task.visitPurpose || ''}`)) reasons.push('高层推进');
  if (/定商务|报价|合同|审批|签约/.test(`${task.expectedCommitment || ''} ${task.visitGoal || ''}`)) reasons.push('商务收口');
  if (/ROI|TCO|竞品|比价|风险/.test(`${task.opportunityRisk || ''} ${task.visitGoal || ''}`)) reasons.push('ROI/TCO风险');
  return reasons.slice(0, 4);
}

export default function VisitOverviewDashboard({ onViewTask }: { onViewTask?: (taskId: string) => void }) {
  const { filteredTasks, filteredCompletedVisits, triggerCustomerContext, isTyping, selectedCustomerId } = useAppStore();
  const [watchTab, setWatchTab] = useState<'all' | 'win' | 'cultivate'>('all');
  const [actionFeedback, setActionFeedback] = useState<{ taskId: string; action: 'view' | 'prep' | 'tactic'; text: string } | null>(null);
  const activeTasks = filteredTasks.filter(t => t.confirmationStatus !== 'pending_confirmation');
  const enrichedTasks = activeTasks
    .map(task => {
      const customer = customers.find(c => c.id === task.customerId);
      const mode = getVisitMode(task, customer);
      return { task, customer, mode, score: getPriorityScore(task, customer) };
    })
    .sort((a, b) => b.score - a.score);

  const winCount = enrichedTasks.filter(item => item.mode === 'win').length;
  const cultivateCount = enrichedTasks.filter(item => item.mode === 'cultivate').length;
  const readyCount = activeTasks.filter(t => getPrepScore(t) >= 4).length;
  const readiness = Math.round((readyCount / Math.max(1, activeTasks.length)) * 100);
  const thisMonthCompleted = filteredCompletedVisits.filter(visit => visit.visitDate.startsWith('2026-05'));
  const remainingPlannedVisits = activeTasks.length;
  const monthlyVisitStats = {
    monthPlan: thisMonthCompleted.length + remainingPlannedVisits,
    weekPlan: activeTasks.filter(task => ['今天', '明天', '周四', '周五', '周六', '周日'].includes(task.dayLabel)).length,
    monthCompleted: thisMonthCompleted.length,
    monthPending: remainingPlannedVisits,
  };
  const priorityCount = Math.max(1, enrichedTasks.filter(item => item.score >= 60).length);
  const winReserve = customers.filter(c => ['S', 'A'].includes(c.level) && c.opportunityPercent >= 50).length;
  const activeOpportunityCount = customers.filter(c => c.opportunityPercent > 0 && c.opportunityStage !== '休眠').length;
  const watchItems = enrichedTasks
    .filter(item => watchTab === 'all' || item.mode === watchTab)
    .slice(0, 4);
  const tierStats = (['S', 'A', 'B', 'C'] as const).map(level => {
    const list = customers.filter(c => c.level === level);
    const overdue = list.filter(c => {
      const rule = TIER_RULES.find(r => r.tier === level);
      return rule && getDaysSinceLastVisit(c.id) > rule.overdueDays;
    }).length;
    return {
      level,
      count: list.length,
      overdue,
      label: level === 'S' ? '战略' : level === 'A' ? '重点' : level === 'B' ? '活跃' : '沉睡',
    };
  });
  const funnelRows = [
    { key: '“做”客情', step: '做客情' },
    { key: '“报”价值', step: '报价值' },
    { key: '“约”高层', step: '约高层' },
    { key: '“定”商务', step: '定商务' },
  ].map(stage => {
    const list = customers.filter(c => c.opportunityStage === stage.key);
    return { ...stage, count: list.length, amount: list.reduce((sum, c) => sum + (c.opportunityAmount || 0), 0) };
  });
  const maxFunnelCount = Math.max(1, ...funnelRows.map(row => row.count));
  const scheduleItems = activeTasks
    .slice()
    .sort((a, b) => (a.dayLabel || '').localeCompare(b.dayLabel || '') || (a.visitTime || '99:99').localeCompare(b.visitTime || '99:99'))
    .slice(0, 4);

  const viewTask = (task: any) => {
    setActionFeedback({ taskId: task.id, action: 'view', text: '已定位到下方拜访卡片，蓝色高亮处可继续编辑、看详情或会前准备。' });
    onViewTask?.(task.id);
  };
  const openPrep = (task: any) => {
    setActionFeedback({ taskId: task.id, action: 'prep', text: '已发送到右侧智能拜访助手，正在生成会前准备检查。' });
    onViewTask?.(task.id);
    triggerCustomerContext(task.customerId, 'prep', task);
  };
  const openTactic = (task: any) => {
    setActionFeedback({ taskId: task.id, action: 'tactic', text: '已发送到右侧智能拜访助手，正在生成完整拜访打法。' });
    onViewTask?.(task.id);
    triggerCustomerContext(task.customerId, 'task', task);
  };

  return (
    <div className="business-surface rounded-xl flex-shrink-0 overflow-hidden">
      <div className="px-5 py-4 border-b" style={{ borderColor: '#E1E8F0', background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F9FD 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EAF3FF', color: '#1F5F99' }}>
                <Compass className="w-4 h-4" />
              </span>
              <div>
                <div className="text-base font-semibold" style={{ color: '#1F2329' }}>拜访作战总览</div>
                <div className="text-xs mt-0.5" style={{ color: '#667085' }}>先判断今天该推进谁、准备是否够、下一步该拿什么承诺</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden lg:block text-right">
              <div className="text-xs" style={{ color: '#667085' }}>本周准备度</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-28 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8EDF4' }}>
                  <div className="h-full rounded-full" style={{ width: `${readiness}%`, background: readiness >= 70 ? '#1F9D73' : '#F59E0B' }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: '#1F2329' }}>{readiness}%</span>
              </div>
            </div>
            <div className="px-3 py-2 rounded-lg border text-right" style={{ borderColor: '#D7DEE8', backgroundColor: '#FFFFFF' }}>
              <div className="text-[11px]" style={{ color: '#667085' }}>2026-05-26</div>
              <div className="text-xs font-medium" style={{ color: '#1F5F99' }}>本周拜访节奏</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4">
          <MetricCard icon={<Target className="w-4 h-4" />} label="必须出手" value={`${priorityCount}`} suffix="项" hint="按客户等级、阶段和风险排序" tone="blue" />
          <MetricCard icon={<CircleDollarSign className="w-4 h-4" />} label="赢单储备" value={`${winReserve}`} suffix="个" hint={`活跃商机 ${activeOpportunityCount} 个`} tone="green" />
          <MetricCard icon={<Activity className="w-4 h-4" />} label="赢单 / 育单" value={`${winCount}/${cultivateCount}`} suffix="" hint="区分推进成交与培育机会" tone="orange" />
          <MetricCard icon={<ShieldCheck className="w-4 h-4" />} label="准备完成" value={`${readyCount}`} suffix={`/${activeTasks.length}`} hint="可先点会前准备确认缺口" tone="slate" />
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="rounded-xl border px-3 py-2 flex items-center gap-2" style={{ borderColor: '#DDE6F0', backgroundColor: '#F8FBFF' }}>
          <span className="text-xs font-semibold" style={{ color: '#1F5F99' }}>使用路径</span>
          <span className="text-xs" style={{ color: '#667085' }}>看顶部判断</span>
          <span className="text-xs" style={{ color: '#B0B7C3' }}>→</span>
          <span className="text-xs" style={{ color: '#667085' }}>点查看任务定位卡片</span>
          <span className="text-xs" style={{ color: '#B0B7C3' }}>→</span>
          <span className="text-xs" style={{ color: '#667085' }}>在卡片里编辑/看详情/会前准备</span>
          <span className="ml-auto text-xs" style={{ color: '#8F959E' }}>下方任务卡片承接执行</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 pt-3" style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(390px, 0.9fr)' }}>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#DDE6F0' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>本周优先动作</div>
              <div className="text-xs mt-0.5" style={{ color: '#667085' }}>这里做判断，下方拜访卡片负责执行</div>
            </div>
            <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: '#F2F6FB' }}>
              {[
                { key: 'all', label: '全部' },
                { key: 'win', label: '赢单' },
                { key: 'cultivate', label: '育单' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className="text-xs px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    backgroundColor: watchTab === tab.key ? '#FFFFFF' : 'transparent',
                    color: watchTab === tab.key ? '#1F5F99' : '#667085',
                    boxShadow: watchTab === tab.key ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  }}
                  onClick={() => setWatchTab(tab.key as 'all' | 'win' | 'cultivate')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {watchItems.map(({ task, customer, mode, score }) => {
              const isWin = mode === 'win';
              const severity = score >= 70 ? '#DC2626' : score >= 55 ? '#F59E0B' : '#1F5F99';
              const rankingReasons = getRankingReasons(task, customer);
              const activeFeedback = actionFeedback?.taskId === task.id ? actionFeedback : null;
              const agentWorking = activeFeedback && selectedCustomerId === task.customerId && isTyping;
              return (
                <div
                  key={task.id}
                  className="rounded-xl border px-3 py-3 transition-all"
                  style={{
                    borderColor: activeFeedback ? '#1F5F99' : '#E3EAF2',
                    backgroundColor: activeFeedback ? '#F5FAFF' : (score >= 70 ? '#FFF7F7' : '#FAFCFF'),
                    boxShadow: activeFeedback ? '0 0 0 3px rgba(31,95,153,0.10)' : 'none',
                  }}
                >
                  <div className="grid items-start gap-3" style={{ gridTemplateColumns: '4px minmax(0, 1fr) auto' }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: severity }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: isWin ? '#EAF8F2' : '#FFF4E6', color: isWin ? '#087A55' : '#B45309' }}>
                          {isWin ? '赢单型拜访' : '育单型拜访'}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EEF4FB', color: '#1F5F99' }}>{task.customerLevel}级</span>
                        <span className="text-[11px]" style={{ color: '#667085' }}>{task.dayLabel} {task.visitTime || '待定'}</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold truncate" style={{ color: '#1F2329' }}>{getActionTitle(task, customer)}</div>
                      <div className="mt-1 text-xs truncate" style={{ color: '#526173' }}>
                        {getFullCompanyName(task.customerName)} · {task.contacts?.[0]?.name || customer?.keyContacts?.[0]?.name || '关键联系人'} · {customer?.opportunityStage || '待确认'} {customer?.opportunityPercent ?? 0}%
                      </div>
                      <div className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: '#475569' }}>{getActionHint(task)}</div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium" style={{ color: '#8F959E' }}>排序原因</span>
                        {rankingReasons.map(reason => (
                          <span key={reason} className="text-[11px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#EEF4FB', color: '#526173' }}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: activeFeedback?.action === 'view' ? '#1F5F99' : '#C7D7EA', color: '#1F5F99', backgroundColor: activeFeedback?.action === 'view' ? '#EAF3FF' : '#FFFFFF' }} onClick={() => viewTask(task)}>
                        {activeFeedback?.action === 'view' ? '已定位' : '查看任务'}
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: activeFeedback?.action === 'prep' ? '#174A78' : '#1F5F99' }} onClick={() => openPrep(task)}>
                        {activeFeedback?.action === 'prep' ? (agentWorking ? '生成中...' : '已发送') : '会前准备'}
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: activeFeedback?.action === 'tactic' ? '#1F5F99' : '#D7DEE8', color: activeFeedback?.action === 'tactic' ? '#1F5F99' : '#526173', backgroundColor: activeFeedback?.action === 'tactic' ? '#EAF3FF' : '#FFFFFF' }} onClick={() => openTactic(task)}>
                        {activeFeedback?.action === 'tactic' ? (agentWorking ? '生成中...' : '已发送') : '生成打法'}
                      </button>
                    </div>
                  </div>
                  {activeFeedback && (
                    <div className="mt-3 rounded-lg border px-3 py-2 flex items-center justify-between gap-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#C7D7EA' }}>
                      <div className="text-xs leading-relaxed" style={{ color: '#1F5F99' }}>
                        {activeFeedback.text}
                      </div>
                      {(activeFeedback.action === 'prep' || activeFeedback.action === 'tactic') && (
                        <div className="text-[11px] flex-shrink-0" style={{ color: agentWorking ? '#F59E0B' : '#667085' }}>
                          {agentWorking ? '右侧生成中' : '请查看右侧助手'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Panel title="客户覆盖状态" action="按S/A/B/C看触达风险">
            <div className="grid grid-cols-4 gap-2">
              {tierStats.map(stat => (
                <div key={stat.level} className="rounded-lg border px-2 py-2" style={{ borderColor: '#E3EAF2', backgroundColor: '#FAFCFF' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: stat.level === 'S' ? '#9A6A1F' : stat.level === 'A' ? '#1F5F99' : stat.level === 'B' ? '#6D5BD0' : '#667085' }}>{stat.level}</span>
                    <span className="text-lg font-semibold" style={{ color: '#1F2329' }}>{stat.count}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: '#667085' }}>{stat.label}客户</div>
                  <div className="mt-1 text-[10px]" style={{ color: stat.overdue > 0 ? '#DC2626' : '#1F9D73' }}>{stat.overdue > 0 ? `${stat.overdue}家需补访` : '节奏正常'}</div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="rounded-xl border bg-white p-3" style={{ borderColor: '#DDE6F0' }}>
            <div className="grid grid-cols-4 gap-2">
              <VisitStat label="本月计划拜访数" value={monthlyVisitStats.monthPlan} tone="blue" />
              <VisitStat label="本月已拜访数" value={monthlyVisitStats.monthCompleted} tone="slate" />
              <VisitStat label="本月未拜访数" value={monthlyVisitStats.monthPending} tone="orange" />
              <VisitStat label="本周计划拜访数" value={monthlyVisitStats.weekPlan} tone="green" />
            </div>
          </div>

          <Panel title="商机阶段分布" action="看哪里卡住">
            <div className="space-y-2">
              {funnelRows.map(row => (
                <div key={row.key} className="flex items-center gap-2">
                  <div className="text-xs w-14 flex-shrink-0" style={{ color: '#526173' }}>{row.step}</div>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ backgroundColor: '#EEF4FB' }}>
                    <div
                      className="h-full px-2 flex items-center text-xs font-medium"
                      style={{
                        width: `${Math.max(16, (row.count / maxFunnelCount) * 100)}%`,
                        backgroundColor: row.step === '报价值' ? '#F59E0B' : row.step === '定商务' ? '#1F9D73' : '#2A6F9E',
                        color: '#FFFFFF',
                      }}
                    >
                      {row.amount ? `¥${row.amount}万` : '暂无金额'}
                    </div>
                  </div>
                  <div className="text-xs w-5 text-right" style={{ color: '#526173' }}>{row.count}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="今日节奏" action="点开先做准备">
            <div className="space-y-1">
              {scheduleItems.map(task => {
                const mode = getVisitMode(task, customers.find(c => c.id === task.customerId));
                return (
                  <button key={task.id} className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors" onClick={() => openPrep(task)}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mode === 'win' ? '#1F9D73' : '#F59E0B' }} />
                      <span className="text-xs font-semibold w-11" style={{ color: '#1F5F99' }}>{task.visitTime || '待定'}</span>
                      <span className="text-xs truncate flex-1" style={{ color: '#1F2329' }}>{getFullCompanyName(task.customerName)} · {task.contacts?.[0]?.name || '关键联系人'}</span>
                    </div>
                    <div className="text-[11px] mt-0.5 ml-[72px]" style={{ color: '#667085' }}>准备包可查看 · {task.dayLabel}</div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, suffix, hint, tone }: { icon: ReactNode; label: string; value: string; suffix: string; hint: string; tone: 'blue' | 'green' | 'orange' | 'slate' }) {
  const palette = {
    blue: { bg: '#EFF6FF', color: '#1F5F99', border: '#CFE2F5' },
    green: { bg: '#ECFDF5', color: '#087A55', border: '#CDEBDD' },
    orange: { bg: '#FFF7ED', color: '#B45309', border: '#FED7AA' },
    slate: { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
  }[tone];
  return (
    <div className="rounded-xl border px-3 py-3" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium" style={{ color: palette.color }}>{label}</div>
        <span style={{ color: palette.color }}>{icon}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold" style={{ color: '#1F2329' }}>{value}</span>
        {suffix ? <span className="text-xs" style={{ color: '#667085' }}>{suffix}</span> : null}
      </div>
      <div className="text-[11px] mt-0.5 truncate" style={{ color: '#667085' }}>{hint}</div>
    </div>
  );
}

function VisitStat({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'orange' | 'slate' }) {
  const palette = {
    blue: { bg: '#EFF6FF', color: '#1F5F99' },
    green: { bg: '#ECFDF5', color: '#087A55' },
    orange: { bg: '#FFF7ED', color: '#B45309' },
    slate: { bg: '#F8FAFC', color: '#475569' },
  }[tone];
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: palette.bg }}>
      <div className="text-[10px] leading-tight" style={{ color: '#667085' }}>{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color: palette.color }}>{value}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: '#DDE6F0' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>{title}</div>
        <div className="text-[11px]" style={{ color: '#8F959E' }}>{action}</div>
      </div>
      {children}
    </div>
  );
}
