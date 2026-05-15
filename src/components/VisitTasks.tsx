import { useState, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { completedVisits, customers, visitTasks } from '../data/mockData';
import { TIER_RULES } from '../data/skills';
import CustomerBadge from './CustomerBadge';
import { ClipboardList, ChevronDown, Plus, ChevronRight, Building2, MapPin, MoreHorizontal, Calendar, AlertTriangle, Target, Eye, X, Clock, CheckCircle2, UserRound, Users } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

const periods = ['本日', '本周', '本月'];

/* 计算距上次拜访天数 */
function getDaysSinceLastVisit(customerId: string): number {
  const visits = completedVisits.filter(v => v.customerId === customerId);
  if (visits.length === 0) return 999;
  const last = visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
  const today = new Date();
  return Math.floor((today.getTime() - new Date(last.visitDate).getTime()) / 86400000);
}

function getHealthMeta(score: number = 70, trend: 'up' | 'flat' | 'down' = 'flat') {
  const level = score < 50 ? '危险' : score < 70 ? '预警' : '健康';
  const color = score < 50 ? '#DC2626' : score < 70 ? '#EA580C' : '#16A34A';
  const bg = score < 50 ? '#FEF2F2' : score < 70 ? '#FFF7ED' : '#ECFDF5';
  const trendText = trend === 'up' ? '变好' : trend === 'down' ? '变差' : '持平';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  return { level, color, bg, trendText, trendArrow };
}

function getOverdueStatus(tier: 'S' | 'A' | 'B' | 'C', daysSince: number) {
  const rule = TIER_RULES.find(r => r.tier === tier);
  if (!rule) return { status: 'normal', label: '', color: '' };
  if (daysSince > rule.overdueDays * 2) return { status: 'critical', label: '严重超期', color: '#DC2626' };
  if (daysSince > rule.overdueDays) return { status: 'overdue', label: '已超期', color: '#F5A623' };
  return { status: 'normal', label: '', color: '' };
}

export default function VisitTasks() {
  const { taskPeriod, setTaskPeriod, triggerCustomerContext, filteredTasks, setShowAddVisit } = useAppStore();
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [confirmTask, setConfirmTask] = useState<any>(null);
  const [confirmedTaskIds, setConfirmedTaskIds] = useState<string[]>([]);

  const pendingConfirmTasks = visitTasks.filter(
    t => t.confirmationStatus === 'pending_confirmation' && !confirmedTaskIds.includes(t.id)
  );
  const activeTasks = filteredTasks.filter(
    t => t.confirmationStatus !== 'pending_confirmation' || confirmedTaskIds.includes(t.id)
  );

  const todayTasks = activeTasks.filter(t => t.dayLabel === '今天');
  const tomorrowTasks = activeTasks.filter(t => t.dayLabel === '明天');
  const thursdayTasks = activeTasks.filter(t => t.dayLabel === '周四');
  const fridayTasks = activeTasks.filter(t => t.dayLabel === '周五');

  const handleTaskClick = (task: typeof filteredTasks[0]) => {
    triggerCustomerContext(task.customerId, 'task');
  };

  // Count overdue tasks
  const overdueCount = filteredTasks.filter(t => {
    const days = getDaysSinceLastVisit(t.customerId);
    const rule = TIER_RULES.find(r => r.tier === t.customerLevel);
    return rule && days > rule.overdueDays;
  }).length;

  return (
    <>
      {pendingConfirmTasks.length > 0 && (
        <PendingConfirmationSection tasks={pendingConfirmTasks} onConfirm={setConfirmTask} />
      )}

      <div className="bg-white rounded-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ backgroundColor: '#6B7280' }}
        onClick={() => setCollapsed(!collapsed)}
      >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4.5 h-4.5" style={{ color: '#1B6EF3' }} />
            <span className="font-medium text-sm text-white">本周拜访任务</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(27,110,243,0.08)', color: '#1B6EF3' }}>{activeTasks.length}</span>
            {overdueCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                <AlertTriangle className="w-3 h-3" />{overdueCount}超期
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowPeriodMenu(!showPeriodMenu); }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/10"
                style={{ color: '#E5E7EB' }}
              >
                {taskPeriod} <ChevronDown className="w-3 h-3" />
              </button>
              {showPeriodMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[80px]">
                  {periods.map(p => (
                    <button key={p}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                      style={{ color: p === taskPeriod ? '#1B6EF3' : '#1F2329' }}
                      onClick={(e) => { e.stopPropagation(); setTaskPeriod(p); setShowPeriodMenu(false); }}
                    >{p}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowAddVisit(true); }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
              style={{ color: '#FFFFFF' }} title="新建拜访任务">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="px-3 py-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <DaySection label="今天" count={todayTasks.length} color="#EF4444" tasks={todayTasks} onTaskClick={handleTaskClick} onDetailClick={setDetailTask} />
            <DaySection label="明天" count={tomorrowTasks.length} color="#F59E0B" tasks={tomorrowTasks} onTaskClick={handleTaskClick} onDetailClick={setDetailTask} />
            <DaySection label="周四" count={thursdayTasks.length} color="#8F959E" tasks={thursdayTasks} onTaskClick={handleTaskClick} onDetailClick={setDetailTask} />
            <DaySection label="周五" count={fridayTasks.length} color="#8F959E" tasks={fridayTasks} onTaskClick={handleTaskClick} onDetailClick={setDetailTask} />

            {activeTasks.length === 0 && filteredTasks.length > 0 && (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-xs" style={{ borderColor: '#E5E7EB', color: '#8F959E', backgroundColor: '#FAFBFC' }}>
                当前没有已确认的拜访任务
              </div>
            )}

            {filteredTasks.length === 0 && (
              <div className="text-xs text-center py-6" style={{ color: '#8F959E' }}>本周暂无拜访任务，点击 + 新建</div>
            )}
          </div>
        )}
      </div>

      <VisitDetailModal task={detailTask} onClose={() => setDetailTask(null)} onPrepare={() => {
        if (detailTask) {
          handleTaskClick(detailTask);
          setDetailTask(null);
        }
      }} />
      <ConfirmVisitModal
        task={confirmTask}
        onClose={() => setConfirmTask(null)}
        onConfirm={(task) => {
          setConfirmedTaskIds((prev) => [...prev, task.id]);
          handleTaskClick(task);
          setConfirmTask(null);
        }}
      />
    </>
  );
}

function PendingConfirmationSection({ tasks, onConfirm }: { tasks: any[]; onConfirm: (task: any) => void }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderColor: '#F59E0B' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#6B7280' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold text-white">🔔 待确认拜访提醒</div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            商机进行中 {tasks.filter(t => t.opportunityIntent !== 'no_opportunity').length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
            无商机 {tasks.filter(t => t.opportunityIntent === 'no_opportunity').length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-amber-100">
        {tasks.map(task => {
          const hasOpportunity = task.opportunityIntent !== 'no_opportunity';
          return (
            <div key={task.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: '#1F2329' }}>{getFullCompanyName(task.customerName)}</span>
                    <CustomerBadge level={task.customerLevel} />
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: hasOpportunity ? '#DCFCE7' : '#EFF6FF', color: hasOpportunity ? '#15803D' : '#1D4ED8' }}
                    >
                      {hasOpportunity ? '商机进行中' : '无商机'}
                    </span>
                  </div>
                  {task.visitPurpose && (
                    <div className="text-sm mb-1" style={{ color: '#5A5A5A' }}>{task.visitPurpose}</div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: hasOpportunity ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${hasOpportunity ? '#BBF7D0' : '#BFDBFE'}` }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: hasOpportunity ? '#15803D' : '#1D4ED8' }}>
                        {hasOpportunity ? '拜访目的：推进商机' : '拜访目的：识别机会'}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: '#475569' }}>{task.visitFocus || task.visitGoal}</div>
                    </div>
                    <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#B45309' }}>
                        {hasOpportunity ? '本次内容：确认节点' : '本次内容：建立关系'}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: '#475569' }}>{task.expectedCommitment}</div>
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#8F959E' }}>
                    <span className="font-medium" style={{ color: '#64748B' }}>推荐拜访原因：</span>{task.visitGoal}
                  </div>
                </div>
                <button
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: '#2563EB' }}
                  onClick={() => onConfirm(task)}
                >
                  确认拜访
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getRecommendationReason(task: any) {
  const customer = customers.find(c => c.id === task.customerId);
  const daysSince = getDaysSinceLastVisit(task.customerId);
  const levelReason =
    task.customerLevel === 'S' ? 'S级客户需保持高频高层互动' :
    task.customerLevel === 'A' ? 'A级客户需要持续推进形成明确下一步' :
    task.customerLevel === 'B' ? 'B级客户需要通过接触验证真实需求' :
    'C级客户需要重新激活经营信号';
  const overdueReason = daysSince >= 999 ? '当前暂无历史拜访记录' : `距上次拜访已${daysSince}天`;
  const stageReason = customer ? `当前重点项目处于“${customer.opportunityStage}”阶段` : '当前客户处于待持续跟进状态';
  return `${levelReason}，${overdueReason}，${stageReason}。`;
}

/* ---------- 历史拜访悬浮气泡 ---------- */
function HistoryPopover({ customerId, customerName }: { customerId: string; customerName: string }) {
  // 按日期降序排列，最近的在最上面 — 与 getDaysSinceLastVisit 逻辑一致
  const history = completedVisits
    .filter(v => v.customerId === customerId)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));

  // 计算距上次天数，与卡片上的"距上次X天"对齐
  const daysSince = getDaysSinceLastVisit(customerId);

  return (
    <div className="absolute right-0 z-50 w-80 bg-white rounded-lg border border-gray-200 py-2 px-3"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.14)', top: '100%', marginTop: 4 }}
      onClick={(e) => e.stopPropagation()}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
        <span className="text-xs font-semibold" style={{ color: '#1F2329' }}>
          📜 {getFullCompanyName(customerName)}
        </span>
        {history.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EFF6FF', color: '#1B6EF3' }}>
            距上次{daysSince >= 999 ? '未拜访' : daysSince + '天'}
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-xs py-3 text-center" style={{ color: '#8F959E' }}>暂无历史拜访记录</div>
      ) : (
        <div className="space-y-0 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {history.map((v, idx) => {
            const isLatest = idx === 0; // 排序后第一个就是最近的
            const visitDays = Math.floor((new Date().getTime() - new Date(v.visitDate).getTime()) / 86400000);
            return (
              <div key={v.id} className="relative pl-4 py-1.5">
                {/* 时间线圆点 */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0" style={{
                    backgroundColor: isLatest ? '#1B6EF3' : '#D1D5DB',
                    boxShadow: isLatest ? '0 0 0 3px rgba(27,110,243,0.15)' : 'none',
                  }} />
                  {idx < history.length - 1 && <div className="w-px flex-1 mt-0.5" style={{ backgroundColor: '#E5E7EB' }} />}
                </div>

                <div className="ml-2">
                  {/* 日期行 */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: isLatest ? '#1B6EF3' : '#5A5A5A' }}>
                      <Calendar className="w-3 h-3 inline mr-0.5" />{v.visitDate}
                    </span>
                    <span className="text-xs" style={{ color: '#8F959E' }}>（{visitDays}天前）</span>
                    {isLatest && (
                      <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: '#DBEAFE', color: '#1B6EF3', fontSize: 10 }}>最近一次</span>
                    )}
                    {v.archived && <span className="text-xs px-1 rounded" style={{ backgroundColor: '#F3F4F6', color: '#8F959E', fontSize: 10 }}>已归档</span>}
                  </div>
                  {/* 内容 */}
                  <div className="text-xs mb-0.5" style={{ color: '#1F2329' }}>
                    {v.summary}
                  </div>
                  <div className="text-xs" style={{ color: '#5A5A5A' }}>结果：{v.outcome}</div>
                  {v.nextSteps && <div className="text-xs" style={{ color: '#8F959E' }}>下一步：{v.nextSteps}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- 每日任务分组 ---------- */
function DaySection({ label, count, color, tasks, onTaskClick, onDetailClick }: {
  label: string; count: number; color: string; tasks: any[]; onTaskClick: (task: any) => void; onDetailClick: (task: any) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 py-1.5 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color: '#1F2329' }}>{label} ({count})</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tasks.map((task: any) => <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} onDetailClick={onDetailClick} />)}
      </div>
    </div>
  );
}

/* ---------- 单个任务卡片 ---------- */
function TaskCard({ task, onTaskClick, onDetailClick }: { task: any; onTaskClick: (t: any) => void; onDetailClick: (t: any) => void; }) {
  const [showHistory, setShowHistory] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const customer = customers.find(c => c.id === task.customerId);
  const daysSince = getDaysSinceLastVisit(task.customerId);
  const overdue = getOverdueStatus(task.customerLevel, daysSince);
  const visitCount = completedVisits.filter(v => v.customerId === task.customerId).length;
  const visitTypeColor =
    task.visitType === '高层拜访' ? '#DC2626' :
    task.visitType === '商务谈判' ? '#7C3AED' :
    task.visitType === '方案汇报' ? '#1B6EF3' :
    task.visitType === '客情回访' ? '#059669' :
    task.visitType === '技术交流' ? '#EA580C' :
    '#8F959E';
  const cardBorder =
    task.customerLevel === 'S' ? '#DC2626' :
    task.customerLevel === 'A' ? '#EA580C' :
    task.customerLevel === 'B' ? '#16A34A' :
    '#9CA3AF';
  const commitmentTone =
    task.customerLevel === 'S' ? '争取高层确认与评审' :
    task.customerLevel === 'A' ? '推动方案进入下一步' :
    task.customerLevel === 'B' ? '建立关系并验证需求' :
    '激活信号并重新接触';
  const hasOpportunity = task.opportunityIntent !== 'no_opportunity';
  const health = getHealthMeta(task.healthScore ?? 70, task.healthTrend ?? 'flat');
  const opportunityCount = hasOpportunity && customer ? 1 : 0;
  const opportunityMain = hasOpportunity ? (task.opportunityTopic || customer?.currentOpportunity || task.visitPurpose || '待确认商机') : '暂无商机';
  const opportunityStage = hasOpportunity ? (customer?.opportunityStage || '待确认') : '机会识别';
  const opportunityProgress = hasOpportunity && customer ? `${customer.opportunityPercent}%` : '待识别';
  const opportunityAmount = hasOpportunity && customer ? `¥${customer.opportunityAmount}万` : '-';

  const handleMouseEnter = () => { if (hideTimer.current) clearTimeout(hideTimer.current); setShowHistory(true); };
  const handleMouseLeave = () => { hideTimer.current = setTimeout(() => setShowHistory(false), 200); };

  return (
    <div
      className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg border overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: overdue.status !== 'normal' ? overdue.color : `${cardBorder}55`,
        borderWidth: '1px',
      }}
      onClick={() => onTaskClick(task)}
    >
      <div className="px-3 py-3 border-b" style={{ borderColor: `${cardBorder}28`, backgroundColor: `${cardBorder}0F` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <CustomerBadge level={task.customerLevel} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-base font-semibold truncate" style={{ color: '#1F2329' }}>{getFullCompanyName(task.customerName)}</div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ backgroundColor: hasOpportunity ? '#DCFCE7' : '#EFF6FF', color: hasOpportunity ? '#15803D' : '#1D4ED8' }}
                >
                  {hasOpportunity ? '商机进行中' : '无商机'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${visitTypeColor}16`, color: visitTypeColor }}
                >
                  {task.visitType}
                </span>
                {overdue.status !== 'normal' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: `${overdue.color}16`, color: overdue.color }}>
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {overdue.label}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#16A34A' }}>
                    合规推进
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                  {task.dayLabel} · {task.visitTime || '待定'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F8FAFC', color: '#64748B' }}>
                  {daysSince >= 999 ? '未拜访' : `距上次${daysSince}天`}
                </span>
              </div>
              <div className="mt-2 rounded-lg px-2 py-1.5" style={{ backgroundColor: health.bg, border: `1px solid ${health.color}30` }}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold" style={{ color: health.color }}>客户健康度：{health.level}</span>
                  <span style={{ color: '#64748B' }}>总分 {task.healthScore ?? 70}/100 | 趋势 {health.trendArrow} {health.trendText}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${task.healthScore ?? 70}%`, backgroundColor: health.color }} />
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex-shrink-0" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/70 transition-colors" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="w-3.5 h-3.5" style={{ color: '#8F959E' }} />
            </button>
            {showHistory && <HistoryPopover customerId={task.customerId} customerName={task.customerName} />}
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">

        <div className="grid grid-cols-[1.2fr_0.8fr] gap-3">
          <div className="min-w-0 space-y-2">
            <div
              className="rounded-xl px-3 py-2 border"
              style={{
                backgroundColor: hasOpportunity ? '#F0FDF4' : '#EFF6FF',
                borderColor: hasOpportunity ? '#86EFAC' : '#BFDBFE',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: hasOpportunity ? '#15803D' : '#1D4ED8' }}>
                  {hasOpportunity ? '商机进行中' : '无商机 · 机会识别'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFFFFF', color: hasOpportunity ? '#15803D' : '#1D4ED8' }}>
                  {opportunityCount > 0 ? `${opportunityCount}个商机` : '线索培育'}
                </span>
              </div>
              {hasOpportunity ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                  <div><span className="font-medium">名称：</span>{opportunityMain}</div>
                  <div><span className="font-medium">金额：</span>{opportunityAmount}</div>
                  <div><span className="font-medium">阶段：</span>{opportunityStage} · {opportunityProgress}</div>
                  <div><span className="font-medium">风险：</span>{task.opportunityRisk || '待补充'}</div>
                </div>
              ) : (
                <div className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                  <span className="font-medium">拜访重点：</span>{task.visitFocus || '建立关键联系人关系，摸排产线痛点，判断是否存在机器人工作站切入机会。'}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs mb-0.5" style={{ color: '#8F959E' }}>拜访主题</div>
              <div className="text-sm font-medium leading-snug line-clamp-2" style={{ color: '#1F2329' }}>
                {task.visitPurpose}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-2 text-xs">
            <div className="grid grid-cols-1 gap-1.5" style={{ color: '#64748B' }}>
              <div className="flex items-center gap-1 truncate"><Users className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{task.contacts?.[0]?.name || '未分配'} · {task.contacts?.[0]?.title || '关键联系人'}</span></div>
              <div className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{task.location}</span></div>
              <div className="flex items-center gap-1"><Target className="w-3.5 h-3.5 flex-shrink-0" /> {visitCount}次历史拜访</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 左下：推荐拜访原因 */}
          <div className="rounded-xl px-2.5 py-2" style={{ backgroundColor: `${cardBorder}0D`, border: `1px solid ${cardBorder}24` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold" style={{ color: cardBorder }}>推荐拜访原因</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFF', color: cardBorder }}>AI建议</span>
            </div>
            <div className="text-xs leading-relaxed" style={{ color: '#1F2329' }}>
              {task.visitGoal}
            </div>
          </div>

          {/* 右下：推进重点 */}
          <div className="rounded-xl px-2.5 py-2 border" style={{ backgroundColor: '#FAFBFC', borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>{hasOpportunity ? '推进重点' : '线索目标'}</span>
            </div>
            <div className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
              {hasOpportunity ? (task.expectedCommitment || `${opportunityMain}当前处于${opportunityStage}，需确认下一步动作。`) : '本次重点不是推进报价，而是建立关系、摸清产线痛点与潜在切入口。'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {(task.customerLevel === 'S'
              ? ['上门', '活动邀约', '高层互动', '年度关怀', '驻场']
              : ['上门', '月度联系', '活动邀约']
            ).map((tag, index) => {
              const active = index < (task.customerLevel === 'S' ? 3 : 2);
              return (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5"
                  style={{
                    backgroundColor: active ? '#ECFDF5' : '#F3F4F6',
                    color: active ? '#16A34A' : '#9CA3AF',
                  }}
                >
                  <CheckCircle2 className="w-3 h-3" style={{ color: active ? '#16A34A' : '#D1D5DB' }} />
                  {tag}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{ borderColor: `${cardBorder}40`, color: cardBorder, backgroundColor: '#FFF' }}
              onClick={(e) => {
                e.stopPropagation();
                onDetailClick(task);
              }}
            >
              详情
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: '#F3F4F6', color: '#475569' }}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick(task);
              }}
            >
              AI助手
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitDetailModal({ task, onClose, onPrepare }: { task: any; onClose: () => void; onPrepare: () => void; }) {
  if (!task) return null;
  const customer = customers.find(c => c.id === task.customerId);
  const hasOpportunity = task.opportunityIntent === 'with_opportunity';
  const opportunityMain = task.opportunityTopic || customer?.currentOpportunity || '暂无明确商机';
  const opportunityStage = customer?.opportunityStage || (hasOpportunity ? '待推进' : '机会识别');
  const opportunityProgress = customer ? `${customer.opportunityPercent}%` : (hasOpportunity ? '待补充' : '未进入商机');
  const contactsText = task.contacts.map((c: any) => `${c.name}（${c.title}）`).join('、');
  const health = getHealthMeta(task.healthScore || 70, task.healthTrend || 'flat');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div
        className="w-[620px] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <CustomerBadge level={task.customerLevel} />
              <div className="text-base font-semibold" style={{ color: '#1F2329' }}>{getFullCompanyName(task.customerName)}</div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: hasOpportunity ? '#DCFCE7' : '#DBEAFE', color: hasOpportunity ? '#15803D' : '#2563EB' }}>
                {hasOpportunity ? '商机进行中' : '无商机 · 机会识别'}
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: '#8F959E' }}>{task.dayLabel} · {task.visitTime || '待定'} · {task.visitType}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem label="拜访主题" value={task.visitPurpose} />
            <DetailItem label="拜访对象" value={contactsText} />
            <DetailItem label="拜访地点" value={task.location} />
            <DetailItem label="历史拜访" value={`${customer?.visitCount || 0}次历史拜访 · 上次：${task.lastVisitDate || '暂无'}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#15803D' }}>{hasOpportunity ? '商机信息' : '机会识别'}</div>
              <div className="space-y-1.5 text-sm" style={{ color: '#334155' }}>
                <InfoLine label="商机名称" value={opportunityMain} />
                <InfoLine label="商机阶段" value={opportunityStage} />
                <InfoLine label="当前进度" value={opportunityProgress} />
                <InfoLine label="风险提示" value={task.opportunityRisk || '暂无明确风险'} />
              </div>
            </div>

            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: health.bg, border: `1px solid ${health.color}30` }}>
              <div className="text-sm font-semibold mb-2" style={{ color: health.color }}>客户健康度：{health.level}</div>
              <div className="text-sm mb-2" style={{ color: '#334155' }}>
                总分 {task.healthScore || 70}/100 · 趋势 {health.trendArrow} {health.trendText}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                <div className="h-full rounded-full" style={{ width: `${task.healthScore || 70}%`, backgroundColor: health.color }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailBlock title="推荐拜访原因" content={task.visitGoal} tone="reason" />
            <DetailBlock title={hasOpportunity ? '推进重点' : '线索目标'} content={hasOpportunity ? (task.expectedCommitment || task.visitFocus) : (task.visitFocus || '建立关系、摸清产线痛点与潜在切入口。')} tone="focus" />
          </div>

          <DetailBlock title="上次拜访情况" content={task.lastVisitSummary || '暂无历史摘要'} />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            style={{ color: '#5A5A5A' }}
          >
            关闭
          </button>
          <button
            onClick={onPrepare}
            className="px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: '#1B6EF3' }}
          >
            进入拜访准备
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmVisitModal({
  task,
  onClose,
  onConfirm,
}: {
  task: any;
  onClose: () => void;
  onConfirm: (task: any) => void;
}) {
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [contactName, setContactName] = useState('');
  const [opportunityTopic, setOpportunityTopic] = useState('');
  const [visitGoal, setVisitGoal] = useState('');
  const [note, setNote] = useState('');

  if (!task) return null;

  // 初始化拜访目标
  const defaultGoal = task.visitGoal || '';

  const contacts = task.contacts || [];

  const handleConfirm = () => {
    if (!visitDate || !contactName) return;
    onConfirm({
      ...task,
      visitTime: visitTime || task.visitTime,
      confirmVisitDate: visitDate,
      confirmVisitContact: contactName,
      opportunityTopic: opportunityTopic || task.opportunityTopic,
      visitGoal: visitGoal || defaultGoal,
      confirmNote: note,
    });
    setVisitDate('');
    setVisitTime('');
    setContactName('');
    setOpportunityTopic('');
    setVisitGoal('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div className="w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-base font-semibold" style={{ color: '#1F2329' }}>确认拜访信息</div>
            <div className="text-xs mt-1" style={{ color: '#8F959E' }}>{getFullCompanyName(task.customerName)} · {task.visitPurpose}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>拜访日期</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>拜访时间</label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>拜访联系人</label>
            <select
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
            >
              <option value="">请选择联系人</option>
              {contacts.map((contact: any) => (
                <option key={contact.name} value={contact.name}>{contact.name}（{contact.title}）</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>商机主题</label>
            <select
              value={opportunityTopic || task.opportunityTopic || ''}
              onChange={(e) => setOpportunityTopic(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
            >
              {task.opportunityIntent === 'no_opportunity' ? (
                <>
                  <option value="线索培育/机会识别">线索培育/机会识别</option>
                  <option value="产线痛点摸排">产线痛点摸排</option>
                  <option value="关键联系人建联">关键联系人建联</option>
                </>
              ) : (
                <>
                  <option value={task.opportunityTopic || '当前商机'}>{task.opportunityTopic || '当前商机'}</option>
                  <option value="注塑取件机器人工作站">注塑取件机器人工作站</option>
                  <option value="CNC机器人上下料单元">CNC机器人上下料单元</option>
                  <option value="整线机器人自动化方案">整线机器人自动化方案</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>
              推荐拜访原因
              <span className="ml-1.5 text-xs font-normal" style={{ color: '#9CA3AF' }}>（AI预填，可修改）</span>
            </label>
            <textarea
              value={visitGoal || defaultGoal}
              onChange={(e) => setVisitGoal(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400 resize-none"
              style={{ backgroundColor: '#FFFBEB' }}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>补充说明（可选）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="例如：客户要求重点讨论预算、竞品情况或评审节奏"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            style={{ color: '#5A5A5A' }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!visitDate || !contactName}
            className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-40"
            style={{ backgroundColor: '#2563EB' }}
          >
            确认并进入推进
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="text-xs mb-1" style={{ color: '#8F959E' }}>{label}</div>
      <div className="text-sm font-medium" style={{ color: '#1F2329' }}>{value}</div>
    </div>
  );
}

function DetailBlock({ title, content, tone = 'default' }: { title: string; content: string; tone?: 'default' | 'reason' | 'focus' }) {
  const styles = tone === 'reason'
    ? { bg: '#FFF7ED', border: '#FED7AA', title: '#EA580C' }
    : tone === 'focus'
      ? { bg: '#F8FAFC', border: '#E2E8F0', title: '#475569' }
      : { bg: '#F8FAFC', border: '#E2E8F0', title: '#1F2329' };
  return (
    <div>
      <div className="text-sm font-semibold mb-1.5" style={{ color: styles.title }}>{title}</div>
      <div className="text-sm leading-relaxed px-3 py-3 rounded-lg border" style={{ backgroundColor: styles.bg, borderColor: styles.border, color: '#475569' }}>
        {content}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0" style={{ color: '#64748B' }}>{label}：</span>
      <span className="font-medium" style={{ color: '#1F2329' }}>{value}</span>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
      <div className="text-[11px] mb-1" style={{ color: '#8F959E' }}>{label}</div>
      <div className="text-xs font-medium leading-relaxed" style={{ color: '#1F2329' }}>{value}</div>
    </div>
  );
}
