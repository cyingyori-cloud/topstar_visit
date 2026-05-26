import { useState, useRef, type ReactNode } from 'react';
import { useAppStore } from '../stores/appStore';
import { completedVisits, customers } from '../data/mockData';
import { TIER_RULES } from '../data/skills';
import CustomerBadge from './CustomerBadge';
import { ClipboardList, ChevronDown, Plus, Building2, MapPin, MoreHorizontal, Calendar, AlertTriangle, Target, Eye, X, Clock, CheckCircle2, UserRound, Users, Pencil } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

const periods = ['本日', '本周', '本月'];

const opportunityStageGuide: Record<string, string> = {
  '“收”线索': '维护私海人脉与本地关系，持续收集客户动态、设备更换信号和竞对信息。',
  '“查”信息': '核实设备现状、工艺痛点、品质要求、开机率和投产节奏，补齐客户资料。',
  '“获”商机': '识别需求条件，明确组织对接记录，录入商机并完成 SWOT 诊断。',
  '“做”客情': '发展内线/教练，私下交流决策链与商务互动，做深关键联系人关系。',
  '“观”案例': '邀约客户参观样板案例、公司或区域活动，强化同行成功预期。',
  '“报”价值': '诊断条件并引导需求，制定标准、汇报方案、放大价值并维护商机明细。',
  '“约”高层': '约访决策人，安排高层会晤和参访陪同，推动决策人支持态度。',
  '“定”商务': '制定竞对策略，展示附加值，明确报价策略、技术协议和签约日期。',
  '“签”合同': '确认合同模板、商务条款和定金安排，完成合同原件与 CRM 录入。',
  '“收”全款': '检查交付与服务，核对对账单和付款记录，推动订单回款闭环。',
};

function getOpportunityStageText(customer: any, hasOpportunity: boolean, task?: any) {
  if (!hasOpportunity || !customer) {
    return null;
  }

  const stage = customer.opportunityStage || '待确认';
  const percent = Number.isFinite(customer.opportunityPercent) ? `${customer.opportunityPercent}%` : '待补充';
  const guide = opportunityStageGuide[stage] || '围绕当前阶段确认关键节点、责任人、下一步动作和客户承诺。';
  const businessFact = customer.opportunityDescription || task?.visitGoal || task?.visitFocus || '';
  const nextAction = task?.expectedCommitment ? `下一步：${task.expectedCommitment}` : guide;
  return {
    title: `商机阶段：${stage} ${percent}`,
    detail: businessFact ? `${businessFact}。${nextAction}` : nextAction,
  };
}

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

export default function VisitTasks({ highlightedTaskId }: { highlightedTaskId?: string | null }) {
  const { taskPeriod, setTaskPeriod, triggerCustomerContext, filteredTasks, setShowAddVisit, updateVisitTask } = useAppStore();
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [editTask, setEditTask] = useState<any>(null);
  const [confirmTask, setConfirmTask] = useState<any>(null);
  const [confirmedTaskIds, setConfirmedTaskIds] = useState<string[]>([]);

  const pendingConfirmTasks = filteredTasks.filter(
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
    triggerCustomerContext(task.customerId, 'task', task);
  };

  const handlePrepareClick = (task: typeof filteredTasks[0]) => {
    triggerCustomerContext(task.customerId, 'prep', task);
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

      <div className="board-panel">
      <div
        className="board-panel-header flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4.5 h-4.5" style={{ color: '#B9D7F0' }} />
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
            <DaySection label="今天" count={todayTasks.length} color="#EF4444" tasks={todayTasks} highlightedTaskId={highlightedTaskId} onTaskClick={handleTaskClick} onPrepareClick={handlePrepareClick} onDetailClick={setDetailTask} onEditClick={setEditTask} />
            <DaySection label="明天" count={tomorrowTasks.length} color="#F59E0B" tasks={tomorrowTasks} highlightedTaskId={highlightedTaskId} onTaskClick={handleTaskClick} onPrepareClick={handlePrepareClick} onDetailClick={setDetailTask} onEditClick={setEditTask} />
            <DaySection label="周四" count={thursdayTasks.length} color="#8F959E" tasks={thursdayTasks} highlightedTaskId={highlightedTaskId} onTaskClick={handleTaskClick} onPrepareClick={handlePrepareClick} onDetailClick={setDetailTask} onEditClick={setEditTask} />
            <DaySection label="周五" count={fridayTasks.length} color="#8F959E" tasks={fridayTasks} highlightedTaskId={highlightedTaskId} onTaskClick={handleTaskClick} onPrepareClick={handlePrepareClick} onDetailClick={setDetailTask} onEditClick={setEditTask} />

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
          handlePrepareClick(detailTask);
          setDetailTask(null);
        }
      }} />
      <EditVisitTaskModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={(taskId, patch) => {
          updateVisitTask(taskId, patch);
          setEditTask(null);
        }}
      />
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
    <div className="board-panel">
      <div className="board-panel-header flex items-center justify-between px-4 py-3">
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
      <div className="divide-y" style={{ borderColor: '#E8EDF4' }}>
        {tasks.map(task => {
          const hasOpportunity = task.opportunityIntent !== 'no_opportunity';
          const customer = customers.find(c => c.id === task.customerId);
          const stageText = getOpportunityStageText(customer, hasOpportunity, task);
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
                    {hasOpportunity && stageText ? (
                      <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                        <div className="text-xs font-semibold mb-1" style={{ color: '#B45309' }}>
                          {stageText.title}
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: '#475569' }}>{stageText.detail}</div>
                      </div>
                    ) : null}
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
function DaySection({ label, count, color, tasks, highlightedTaskId, onTaskClick, onPrepareClick, onDetailClick, onEditClick }: {
  label: string; count: number; color: string; tasks: any[]; highlightedTaskId?: string | null; onTaskClick: (task: any) => void; onPrepareClick: (task: any) => void; onDetailClick: (task: any) => void; onEditClick: (task: any) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 py-1.5 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color: '#1F2329' }}>{label} ({count})</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tasks.map((task: any) => (
          <TaskCard
            key={task.id}
            task={task}
            highlighted={task.id === highlightedTaskId}
            onTaskClick={onTaskClick}
            onPrepareClick={onPrepareClick}
            onDetailClick={onDetailClick}
            onEditClick={onEditClick}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- 单个任务卡片 ---------- */
function TaskCard({ task, highlighted, onTaskClick, onPrepareClick, onDetailClick, onEditClick }: { task: any; highlighted?: boolean; onTaskClick: (t: any) => void; onPrepareClick: (t: any) => void; onDetailClick: (t: any) => void; onEditClick: (t: any) => void; }) {
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
  const hasOpportunity = task.opportunityIntent !== 'no_opportunity';
  const health = getHealthMeta(task.healthScore ?? 70, task.healthTrend ?? 'flat');
  const opportunityCount = hasOpportunity && customer ? 1 : 0;
  const opportunityMain = hasOpportunity ? (task.opportunityTopic || customer?.currentOpportunity || task.visitPurpose || '待确认商机') : '暂无商机';
  const opportunityStage = hasOpportunity ? (customer?.opportunityStage || '待确认') : '机会识别';
  const opportunityProgress = hasOpportunity && customer ? `${customer.opportunityPercent}%` : '待识别';
  const opportunityAmount = hasOpportunity && customer ? `¥${customer.opportunityAmount}万` : '-';
  const overviewSignal =
    task.customerId === 'c4'
      ? '来自作战总览推荐：本次重点是高层评审后收口定商务，现场要把TCO/ROI、报价、合同和审批链问清。'
      : `来自作战总览推荐：${hasOpportunity ? `当前处于${opportunityStage}，本次要推动客户给出明确下一步。` : '当前重点是验证真实需求和关键人意愿。'}`;

  const handleMouseEnter = () => { if (hideTimer.current) clearTimeout(hideTimer.current); setShowHistory(true); };
  const handleMouseLeave = () => { hideTimer.current = setTimeout(() => setShowHistory(false), 200); };

  return (
    <div
      id={`visit-task-${task.id}`}
      className="group relative rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg border overflow-hidden"
      style={{
        backgroundColor: highlighted ? '#F8FBFF' : '#FFFFFF',
        borderColor: highlighted ? '#1F5F99' : (overdue.status !== 'normal' ? overdue.color : `${cardBorder}55`),
        borderWidth: highlighted ? '2px' : '1px',
        boxShadow: highlighted ? '0 0 0 4px rgba(31,95,153,0.12), 0 18px 36px rgba(15,23,42,0.10)' : '0 12px 30px rgba(15,23,42,0.06)',
      }}
      onClick={() => onTaskClick(task)}
    >
      {highlighted && (
        <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ backgroundColor: '#EAF3FF', borderColor: '#C7D7EA', color: '#1F5F99' }}>
          <Target className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs font-medium leading-relaxed">{overviewSignal}</span>
        </div>
      )}
      <div className="px-3 py-3 border-b" style={{ borderColor: `${cardBorder}28`, background: `linear-gradient(135deg, ${cardBorder}12, #FFFFFF 74%)` }}>
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
              className="rounded-lg px-3 py-2 border"
              style={{
                backgroundColor: hasOpportunity ? '#F7FBF8' : '#F7FAFD',
                borderColor: hasOpportunity ? '#B7D9C2' : '#C8D7EA',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: hasOpportunity ? '#15803D' : '#1D4ED8' }}>
                  {hasOpportunity ? '商机进行中' : '无商机'}
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

        <div
          className="rounded-lg px-3 py-2 border"
          style={{ backgroundColor: `${cardBorder}0D`, borderColor: `${cardBorder}24` }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold" style={{ color: cardBorder }}>拜访目标</span>
          </div>
          <div className="text-xs leading-relaxed" style={{ color: '#1F2329' }}>
            {task.detailObjective || task.visitGoal || '确认客户当前需求、关键参与人、下一步推进节点和可落地承诺。'}
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1"
              style={{ borderColor: '#D7DEE8', color: '#475569', backgroundColor: '#FFF' }}
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(task);
              }}
            >
              <Pencil className="w-3 h-3" />
              编辑
            </button>
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
                onPrepareClick(task);
              }}
            >
              会前准备
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const detailStageSteps = ['“收”线索', '“查”信息', '“获”商机', '“做”客情', '“观”案例', '“报”价值', '“约”高层', '“定”商务', '“签”合同', '“收”全款'];

function getStageIndex(stage: string) {
  const normalizedStage = stage.replace(/[“”"]/g, '');
  const index = detailStageSteps.findIndex(item => item.replace(/[“”"]/g, '') === normalizedStage);
  return index >= 0 ? index : 0;
}

function splitCommitments(expectedCommitment: string | undefined, fallback: string | undefined) {
  const text = expectedCommitment || fallback || '明确下一步客户承诺和推进节点。';
  const bacMatch = text.match(/BAC[:：]\s*([^；;]+)[；;]?/);
  const macMatch = text.match(/MAC[:：]\s*(.+)$/);
  return {
    bac: bacMatch?.[1]?.trim() || '推动客户确认进入下一阶段，明确参会人、议题、时间和推进节点。',
    mac: macMatch?.[1]?.trim() || text,
  };
}

function getDecisionTone(item: any) {
  const text = `${item.role || ''}${item.person || ''}${item.status || ''}`;
  if (text.includes('高层') || text.includes('决策')) {
    return { label: '关键决策', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
  }
  if (text.includes('Coach') || text.includes('内线') || text.includes('采购')) {
    return { label: '已建入口', bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' };
  }
  if (text.includes('财务')) {
    return { label: '待补口径', bg: '#F3E8FF', color: '#7E22CE', border: '#E9D5FF' };
  }
  return { label: '待引荐', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
}

function getContactByKeyword(contacts: any[], keywords: string[]) {
  return contacts.find(contact => keywords.some(keyword => `${contact.name}${contact.title}`.includes(keyword)));
}

function getLatestVisit(task: any) {
  const visits = completedVisits
    .filter(visit => visit.customerId === task.customerId)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  return visits[0];
}

function getVisitBasis(task: any, customer: any, latestVisit: any, daysSinceLastVisit: number, opportunityStage: string, opportunityProgress: string) {
  const lastDate = latestVisit?.visitDate || task.lastVisitDate || '暂无记录';
  const lastPerson = task.contacts?.[0] ? `${task.contacts[0].name}（${task.contacts[0].title}）` : '待确认';
  const lastContent = latestVisit?.summary || task.lastVisitSummary || '暂无明确记录';
  const lastConclusion = latestVisit?.outcome || task.lastVisitSummary || '暂无明确结论';
  const nextSteps = latestVisit?.nextSteps || task.expectedCommitment || '待确认下一步动作';
  const daysText = daysSinceLastVisit >= 999 ? '暂无历史拜访记录' : `距上次拜访约${daysSinceLastVisit}天`;
  const opportunityName = task.opportunityTopic || customer?.currentOpportunity || '当前商机';
  const staleSignal = daysSinceLastVisit >= 14 && daysSinceLastVisit < 999 ? '已超过两周未推进，商机有冷却风险' : daysText;

  if (task.id === 't6') {
    return {
      story: '上次已经完成注塑+组装方案讨论，方案已提交到客户内部评审。现在销售不能只等客户反馈，因为评审周期拉长会让项目热度下降，也会给竞品和预算变化留下窗口。',
      diagnosis: '当前问题不是客户没有兴趣，而是项目停在“客户内部评审”里：评审结果、评审负责人、ROI材料缺口和下一次复盘会都还没有被锁定。',
      basis: '欣旺达是A级客户，当前方案已提交14天；商机仍在进行中，但风险提示为“内部评审周期拉长，ROI材料不充分”。这说明系统推荐拜访的核心依据是防止商机冷却，并把等待状态变成可推进动作。',
      conclusion: '这次不是普通客情回访，而是“方案已提交后的评审推进拜访”。',
      risk: '如果本次仍只做泛泛客情维护，项目可能继续卡在客户内部评审，销售拿不到复盘会、推进负责人和材料缺口，后续会很难判断真实成交节奏。',
      action: task.expectedCommitment || '推动客户安排方案复盘会，并确认下一步推进负责人。',
      items: [
        { label: '当前进展', value: '注塑+组装机器人单元方案已提交客户内部评审，当前处于“报价值”后的评审等待期。' },
        { label: '为什么现在拜访', value: '方案已提交14天，A级客户需要持续跟进；如果销售继续等待，客户内部评审容易变慢，竞品或预算变化也可能切入。' },
        { label: '主要卡点', value: '内部评审周期拉长，ROI材料不充分，客户还没有明确下一步复盘会、推进负责人和补充材料清单。' },
        { label: '本次主线', value: '先复盘上次提交方案和客户反馈，再问清内部评审进展，最后锁定方案复盘会、补充资料和下一步负责人。' },
        { label: '必须拿到', value: task.expectedCommitment || '推动客户安排方案复盘会，并确认下一步推进负责人。' },
      ],
      history: {
        date: lastDate,
        person: lastPerson,
        content: lastContent,
        conclusion: lastConclusion,
        nextSteps,
      },
    };
  }

  return {
    story: latestVisit
      ? `上次拜访在${lastDate}完成，围绕“${lastContent}”展开，形成的结论是“${lastConclusion}”。本次拜访需要承接上次结论，继续推进${opportunityName}。`
      : `该客户当前围绕${opportunityName}存在推进机会，但历史拜访记录不完整，本次需要先补齐客户现场信息和关键联系人判断。`,
    diagnosis: task.detailSummary || `当前客户处在${opportunityStage}阶段，销售不能只做信息同步，需要判断商机卡点、决策链缺口和下一步承诺。`,
    basis: `${task.customerLevel}级客户，商机为${opportunityName}，当前阶段${opportunityStage}，进度${opportunityProgress}；${staleSignal}。${task.visitGoal || customer?.opportunityDescription || ''}`,
    conclusion: task.detailSummary || `这次拜访的核心是推进${opportunityName}，不是简单维护关系；销售要把客户当前状态、评审卡点和下一步承诺一次问清。`,
    risk: task.opportunityRisk || '如果不及时确认客户真实推进阻力、关键参与人和资料缺口，商机可能继续停留在当前阶段。',
    action: task.expectedCommitment || '明确下一步客户承诺和推进节点。',
    items: [
      { label: '当前进展', value: `${task.customerLevel}级客户，商机为${opportunityName}，当前阶段${opportunityStage}，进度${opportunityProgress}。` },
      { label: '为什么现在拜访', value: task.visitGoal || customer?.opportunityDescription || `系统根据客户等级、商机状态和最近拜访间隔推荐本次拜访；${staleSignal}。` },
      { label: '主要卡点', value: task.opportunityRisk || '客户真实推进阻力、内部评审人和资料缺口仍需确认。' },
      { label: '本次主线', value: task.visitFocus || '确认客户当前评审进展、关键参与人、资料缺口和下一步推进节点。' },
      { label: '必须拿到', value: task.expectedCommitment || '明确下一步客户承诺和推进节点。' },
    ],
    history: {
      date: lastDate,
      person: lastPerson,
      content: lastContent,
      conclusion: lastConclusion,
      nextSteps,
    },
  };
}

function getVisitPlaybook(task: any, commitments: { bac: string; mac: string }) {
  if (task.id === 't8') {
    return {
      opening: '刘经理，上次我们已经把注塑取件方案的技术方向做了初步沟通。今天我不想再把时间放在单纯补参数上，而是想和您一起把高层评审要看的几件事准备齐：制造端看节拍、人力和稳定性，财务端看ROI/TCO和回收周期，高层看国产替代、供应稳定和导入风险。我们希望把这件事从采购/技术评估推进到定商务前的正式评审。',
      questions: [
        '如果这个项目进入正式评审，赵总最先看的是回本周期、人力节省、稳定性，还是国产替代和供应风险？',
        '制造/生产负责人和财务评审分别是谁参与？他们各自需要什么数据才愿意往下走？',
        '我们提交15页以内高层材料时，您建议先给谁预审？商务报价和合同节点通常怎么推进？',
      ],
      materials: [
        { name: '高层会晤材料', timing: '开场后第3-5分钟', script: '这份材料不展开讲技术细节，只让高层快速看到现状痛点、收益、风险和推进路径。', goal: '把议题从补参数升级为高层评审。' },
        { name: 'ROI/TCO测算底稿', timing: '客户问价格或投入时', script: '单价可以比，但我们建议按三年总成本看：人工、停机、维护、备件、导入周期和良率损失都要算进去。', goal: '避免进入单机比价。' },
        { name: '深圳比亚迪电子CNC上下料案例', timing: '客户质疑稳定性/落地性时', script: '咱们内部已有自动化复制基础，CNC上下料项目人员40到8人、利用率65%到92%、换型2小时到30分钟。注塑取件也可以按类似逻辑做价值验证。', goal: '用本客户体系内案例建立可信度。' },
        { name: '注塑取件方案页', timing: '制造端追问节拍和接口时', script: '这页重点看节拍、夹具、接口、验收指标和导入周期，我们会把风险项提前写进方案，不只讲概念。', goal: '让制造端认可可落地。' },
        { name: '竞品/进口设备对比', timing: '出现进口品牌或竞品对比时', script: '进口设备参数强，但交付周期、备件、服务响应和二次改造成本会影响TCO；拓斯达的本地响应和注塑场景经验是差异点。', goal: '把竞争维度拉到全生命周期价值。' },
        { name: '政策补贴线索', timing: '高层关注投资合理性时', script: '如果项目纳入国产替代或智能制造改造，可以把政策补贴作为投资评审的加分项，我们会配合整理申报口径。', goal: '降低投资决策阻力。' },
      ],
      objections: [
        { concern: '先把参数补齐再说', response: '参数我们会补齐，但如果没有制造和财务口径，参数补完还是容易进入比价。建议同步把ROI、TCO和高层评审口径建起来。' },
        { concern: '高层现在未必有时间', response: '可以先约30分钟预评审，不讲长方案，只看现状、回本、风险和推进路径。材料我先给您预审。' },
        { concern: '价格要和竞品比', response: '可以比，但建议按TCO比：采购价、停机损失、备件周期、服务响应和导入风险一起看。' },
      ],
      flow: task.meetingFlow || [],
      close: `刘经理，今天我想请您帮我定两个动作。最好结果是：${commitments.bac}。如果今天还不能定下来，退一步请您先帮我确认：${commitments.mac}。这样我们下次就不是继续补参数，而是按比亚迪内部评审节奏推进到商务。`,
    };
  }

  const opportunity = task.opportunityTopic || '当前商机';
  const materialSource = task.prepMaterials?.length ? task.prepMaterials : [
    `${opportunity}方案复盘材料：回顾已提交方案、客户反馈和待补充问题。`,
    'ROI/价值测算材料：补齐人工、节拍、良率、维护成本和回收周期。',
    '客户内部评审推进清单：确认评审负责人、参会人、材料提交节点和下一次会议时间。',
  ];
  const meetingFlow = task.meetingFlow?.length ? task.meetingFlow : [
    { step: '复盘上次结论', action: `先确认上次沟通结论：${task.lastVisitSummary || '上次沟通结果待补充'}，再问客户内部评审是否有新反馈。`, desiredSignal: '客户愿意说明评审进展和卡点。' },
    { step: '确认资料缺口', action: '逐项确认客户还缺方案、ROI、技术参数、案例还是商务口径，避免泛泛跟进。', desiredSignal: '客户说出需要补齐的具体资料。' },
    { step: '锁定推进人', action: '问清谁负责下一步评审、谁拍板、谁需要提前看材料。', desiredSignal: '拿到下一步负责人或参会人。' },
    { step: '收口下一步', action: '现场请求明确复盘会/评审会时间，以及会前材料提交节点。', desiredSignal: '获得明确时间、人员或材料清单。' },
  ];

  return {
    opening: task.meetingFlow?.[0]?.action || task.detailSummary || task.visitGoal || '先对齐本次拜访目的，再确认客户关注点、资料口径和下一步承诺。',
    questions: [
      '这次项目推进到下一阶段，客户内部最关键的判断标准是什么？',
      '谁会影响最终决策？现在支持、观望和反对的人分别是谁？',
      '为了拿到下一步承诺，我们会前或会后还需要补齐哪些资料？',
    ],
    materials: materialSource.map((item: string, index: number) => ({
      name: item.split('：')[0] || `资料${index + 1}`,
      timing: index === 0 ? '开场定调时' : index === 1 ? '客户问投入产出时' : '客户提出顾虑时',
      script: item,
      goal: index === 0 ? '统一客户评审口径。' : index === 1 ? '证明投资合理性。' : '支撑客户继续推进。'
    })),
    flow: meetingFlow,
    objections: [
      { concern: '客户说再看看', response: '理解，我们先不急着推进结论。能否先确认下一步需要补哪三类信息，以及由谁来判断？' },
      { concern: '客户只看价格', response: '价格一定会给到，但建议同时看导入周期、维护成本、稳定性和停机损失，避免只看采购价。' },
    ],
    close: `本次至少要拿到：${commitments.mac}。最佳结果是：${commitments.bac}`,
  };
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
  const daysSinceLastVisit = getDaysSinceLastVisit(task.customerId);
  const latestVisit = getLatestVisit(task);
  const stageIndex = getStageIndex(opportunityStage);
  const nextStage = detailStageSteps[stageIndex + 1] || '推进闭环';
  const commitments = splitCommitments(task.expectedCommitment, task.detailObjective);
  const playbook = getVisitPlaybook(task, commitments);
  const visitBasis = getVisitBasis(task, customer, latestVisit, daysSinceLastVisit, opportunityStage, opportunityProgress);
  const decisionContact = getContactByKeyword(task.contacts || [], ['高层', '决策', '赵总']);
  const coachContact = getContactByKeyword(task.contacts || [], ['采购', '刘经理', 'Coach', '内线']);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div
        className="w-[860px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <CustomerBadge level={task.customerLevel} />
              <div className="text-base font-semibold" style={{ color: '#1F2329' }}>{getFullCompanyName(task.customerName)}</div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: hasOpportunity ? '#DCFCE7' : '#DBEAFE', color: hasOpportunity ? '#15803D' : '#2563EB' }}>
                {hasOpportunity ? '商机进行中' : '无商机'}
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: '#8F959E' }}>{task.dayLabel} · {task.visitTime || '待定'} · {task.visitType}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[76vh] overflow-y-auto">
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#DCE6F2', backgroundColor: '#FFFFFF' }}>
            <div className="px-4 py-3 border-b" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <div className="grid grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 text-sm">
                <DetailItem label="拜访主题" value={task.visitPurpose} />
                <DetailItem label="正式对象" value={decisionContact ? `${decisionContact.name}（${decisionContact.title}）` : contactsText} />
                <DetailItem label="内线/入口" value={coachContact ? `${coachContact.name}（${coachContact.title}）` : contactsText} />
                <DetailItem label="地点/历史" value={`${task.location} · ${customer?.visitCount || 0}次`} />
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-4">
                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#FBFDFF', borderColor: '#DCE6F2' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>商机态势诊断</div>
                      <div className="text-xs mt-1" style={{ color: '#64748B' }}>{opportunityMain}</div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                      当前：{opportunityStage}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                    <DiagnosticMetric label="商机金额" value={customer ? `¥${customer.opportunityAmount}万` : '-'} />
                    <DiagnosticMetric label="赢率/进度" value={opportunityProgress} />
                    <DiagnosticMetric label="上次拜访" value={task.lastVisitDate || '暂无'} sub={`${daysSinceLastVisit >= 999 ? '暂无记录' : `${daysSinceLastVisit}天前`}`} />
                    <DiagnosticMetric label="下一阶段" value={nextStage} />
                  </div>

                  <StageTimeline currentIndex={stageIndex} />

                  <div className="mt-4 rounded-lg px-3 py-2 border flex items-start gap-2" style={{ backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#EA580C' }} />
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#C2410C' }}>本次关键风险</div>
                      <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>{task.opportunityRisk || '需要确认客户真实风险点和下一步推进阻力。'}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: health.bg, borderColor: `${health.color}40` }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: health.color }}>客户健康度</div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-semibold leading-none" style={{ color: health.color }}>{task.healthScore || 70}</span>
                    <span className="text-sm pb-0.5" style={{ color: '#64748B' }}>/100 · {health.level}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#E5E7EB' }}>
                    <div className="h-full rounded-full" style={{ width: `${task.healthScore || 70}%`, backgroundColor: health.color }} />
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>
                    趋势 {health.trendArrow} {health.trendText}。本次要把采购入口转成高层认可、财务口径和商务动作。
                  </div>
                </div>
              </div>

              <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>本次拜访目标</div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFFFFF', color: '#64748B' }}>目标从“讲方案”转为“推商务”</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CommitmentCard title="BAC · 最好承诺" content={commitments.bac} tone="primary" />
                  <CommitmentCard title="MAC · 最低承诺" content={commitments.mac} tone="secondary" />
                </div>
                <div className="mt-3 text-sm leading-relaxed px-3 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #E2E8F0' }}>
                  <span className="font-semibold" style={{ color: '#1F2329' }}>一句话判断：</span>{task.detailSummary || task.visitGoal}
                </div>
              </div>

              {task.decisionChain?.length ? (
                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>决策链画像</div>
                    <div className="text-xs" style={{ color: '#64748B' }}>先借入口，再补齐制造/财务/高层</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {task.decisionChain.map((item: any, index: number) => (
                      <DecisionRoleCard key={`${item.role}-${index}`} item={item} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-3">
                <DetailBlock title="销售判断" content={task.visitGoal} tone="reason" />
                <DetailBlock title={hasOpportunity ? '推进重点' : '线索目标'} content={hasOpportunity ? (task.visitFocus || task.expectedCommitment) : (task.visitFocus || '建立关系、摸清产线痛点与潜在切入口。')} tone="focus" />
              </div>
            </div>
          </div>

          <DetailSection title="拜访依据与推荐分析">
            <div className="space-y-3">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#DCE6F2', backgroundColor: '#FFFFFF' }}>
                <div className="grid grid-cols-[108px_1fr] border-b" style={{ borderColor: '#E2E8F0' }}>
                  <div className="px-3 py-3 text-sm font-semibold" style={{ backgroundColor: '#F8FAFC', color: '#1F2329' }}>故事背景</div>
                  <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: '#334155' }}>{visitBasis.story}</div>
                </div>
                <div className="grid grid-cols-[108px_1fr] border-b" style={{ borderColor: '#E2E8F0' }}>
                  <div className="px-3 py-3 text-sm font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>诊断</div>
                  <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: '#1E293B' }}>{visitBasis.diagnosis}</div>
                </div>
                <div className="grid grid-cols-[108px_1fr] border-b" style={{ borderColor: '#E2E8F0' }}>
                  <div className="px-3 py-3 text-sm font-semibold" style={{ backgroundColor: '#F8FAFC', color: '#475569' }}>依据</div>
                  <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: '#334155' }}>{visitBasis.basis}</div>
                </div>
                <div className="grid grid-cols-[108px_1fr] border-b" style={{ borderColor: '#E2E8F0' }}>
                  <div className="px-3 py-3 text-sm font-semibold" style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>结论</div>
                  <div className="px-4 py-3 text-sm leading-relaxed font-medium" style={{ color: '#1F2329' }}>{visitBasis.conclusion}</div>
                </div>
                <div className="grid grid-cols-[108px_1fr] border-b" style={{ borderColor: '#E2E8F0' }}>
                  <div className="px-3 py-3 text-sm font-semibold" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>风险</div>
                  <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: '#334155' }}>{visitBasis.risk}</div>
                </div>
                <div className="grid grid-cols-[108px_1fr]">
                  <div className="px-3 py-3 text-sm font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>动作</div>
                  <div className="px-4 py-3 text-sm leading-relaxed font-medium" style={{ color: '#1F2329' }}>{visitBasis.action}</div>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
                <div className="px-4 py-2 text-sm font-semibold" style={{ backgroundColor: '#F8FAFC', color: '#1F2329' }}>历史拜访情况</div>
                <div className="grid grid-cols-[0.8fr_1fr_1.45fr_1.45fr_1.3fr] text-xs font-semibold border-t" style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', color: '#475569' }}>
                  <div className="px-3 py-2 border-r border-slate-200">时间</div>
                  <div className="px-3 py-2 border-r border-slate-200">人物</div>
                  <div className="px-3 py-2 border-r border-slate-200">内容</div>
                  <div className="px-3 py-2 border-r border-slate-200">结论</div>
                  <div className="px-3 py-2">下一步</div>
                </div>
                <div className="grid grid-cols-[0.8fr_1fr_1.45fr_1.45fr_1.3fr] text-sm border-t" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
                  <div className="px-3 py-2 border-r border-slate-100 font-medium" style={{ color: '#1F2329' }}>{visitBasis.history.date}</div>
                  <div className="px-3 py-2 border-r border-slate-100">{visitBasis.history.person}</div>
                  <div className="px-3 py-2 border-r border-slate-100 leading-relaxed">{visitBasis.history.content}</div>
                  <div className="px-3 py-2 border-r border-slate-100 leading-relaxed">{visitBasis.history.conclusion}</div>
                  <div className="px-3 py-2 leading-relaxed">{visitBasis.history.nextSteps}</div>
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="拜访打法与资料使用">
            <div className="space-y-4">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: '#BFDBFE' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>1. 现场怎么开场</div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFFFFF', color: '#1D4ED8' }}>可直接照着说</span>
                  </div>
                </div>
                <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: '#1E293B' }}>
                  “{playbook.opening}”
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-3">
                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: '#1F2329' }}>2. 必问问题</div>
                  <div className="space-y-2">
                    {playbook.questions.map((question: string, index: number) => (
                      <div key={`${question}-${index}`} className="flex gap-2 text-sm leading-relaxed" style={{ color: '#334155' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>{index + 1}</span>
                        <span>“{question}”</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: '#15803D' }}>3. 收官怎么要承诺</div>
                  <div className="text-sm leading-relaxed mb-3" style={{ color: '#1E293B' }}>“{playbook.close}”</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <InfoPair label="BAC" value={commitments.bac} />
                    <InfoPair label="MAC" value={commitments.mac} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
                <div className="grid grid-cols-[1fr_1fr_1.35fr_0.9fr] text-xs font-semibold" style={{ backgroundColor: '#F8FAFC', color: '#475569' }}>
                  <div className="px-3 py-2 border-r border-slate-200">资料</div>
                  <div className="px-3 py-2 border-r border-slate-200">什么时候用</div>
                  <div className="px-3 py-2 border-r border-slate-200">怎么说</div>
                  <div className="px-3 py-2">目的</div>
                </div>
                {playbook.materials.map((item: any, index: number) => (
                  <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_1fr_1.35fr_0.9fr] text-sm border-t" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
                    <div className="px-3 py-2 font-semibold border-r border-slate-100" style={{ color: '#1F2329' }}>{item.name}</div>
                    <div className="px-3 py-2 border-r border-slate-100">{item.timing}</div>
                    <div className="px-3 py-2 border-r border-slate-100 leading-relaxed">“{item.script}”</div>
                    <div className="px-3 py-2 leading-relaxed">{item.goal}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3">
                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: '#1F2329' }}>4. 现场推进节奏</div>
                  <div className="space-y-2">
                    {playbook.flow.map((item: any, index: number) => (
                      <div key={`${item.step}-${index}`} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}>{index + 1}</span>
                          <span className="text-sm font-semibold" style={{ color: '#1F2329' }}>{item.step}</span>
                        </div>
                        <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>{item.action}</div>
                        <div className="text-xs mt-1" style={{ color: '#047857' }}>目标信号：{item.desiredSignal}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: '#92400E' }}>5. 顾虑怎么回应</div>
                  <div className="space-y-2">
                    {playbook.objections.map((item: any, index: number) => (
                      <div key={`${item.concern}-${index}`} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #FDE68A' }}>
                        <div className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>{item.concern}</div>
                        <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>“{item.response}”</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {task.keyIssues?.length ? (
                <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: '#1F2329' }}>6. 资料背后的高层关注点</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {task.keyIssues.map((item: any, index: number) => (
                      <div key={`${item.issue}-${index}`} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <div className="text-sm font-semibold mb-1" style={{ color: '#1F2329' }}>{item.issue}</div>
                        <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>{item.salesAngle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

            </div>
          </DetailSection>

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

function EditVisitTaskModal({
  task,
  onClose,
  onSave,
}: {
  task: any;
  onClose: () => void;
  onSave: (taskId: string, patch: any) => void;
}) {
  const [visitPurpose, setVisitPurpose] = useState('');
  const [visitType, setVisitType] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [opportunityTopic, setOpportunityTopic] = useState('');
  const [opportunityRisk, setOpportunityRisk] = useState('');
  const [visitGoal, setVisitGoal] = useState('');
  const [expectedCommitment, setExpectedCommitment] = useState('');
  const [visitFocus, setVisitFocus] = useState('');

  if (!task) return null;

  const contacts = task.contacts || [];
  const selectedContact = contacts.find((contact: any) => contact.name === (contactName || task.contacts?.[0]?.name));

  const handleSave = () => {
    const nextContacts = selectedContact ? [selectedContact, ...contacts.filter((contact: any) => contact.name !== selectedContact.name)] : contacts;
    onSave(task.id, {
      visitPurpose: visitPurpose || task.visitPurpose,
      visitType: visitType || task.visitType,
      visitTime: visitTime || task.visitTime,
      location: location || task.location,
      contacts: nextContacts,
      opportunityTopic: opportunityTopic || task.opportunityTopic,
      opportunityRisk: opportunityRisk || task.opportunityRisk,
      visitGoal: visitGoal || task.visitGoal,
      expectedCommitment: expectedCommitment || task.expectedCommitment,
      visitFocus: visitFocus || task.visitFocus,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div className="w-[680px] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-base font-semibold" style={{ color: '#1F2329' }}>编辑拜访任务</div>
            <div className="text-xs mt-1" style={{ color: '#8F959E' }}>{getFullCompanyName(task.customerName)} · 编辑后 AI 话术会按新信息生成</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[72vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-2 gap-3">
            <EditField label="拜访主题" value={visitPurpose || task.visitPurpose} onChange={setVisitPurpose} />
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>拜访类型</label>
              <select
                value={visitType || task.visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              >
                {['高层拜访', '客情回访', '商务谈判', '方案汇报', '技术交流', '初次拜访'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <EditField label="拜访时间" value={visitTime || task.visitTime || ''} onChange={setVisitTime} placeholder="例如：明天 10:00 / 待定" />
            <EditField label="拜访地点" value={location || task.location || ''} onChange={setLocation} />
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>本次联系人</label>
              <select
                value={contactName || task.contacts?.[0]?.name || ''}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              >
                {contacts.map((contact: any) => (
                  <option key={contact.name} value={contact.name}>{contact.name}（{contact.title}）</option>
                ))}
              </select>
            </div>
            <EditField label="商机主题" value={opportunityTopic || task.opportunityTopic || ''} onChange={setOpportunityTopic} />
          </div>

          <EditArea label="商机风险" value={opportunityRisk || task.opportunityRisk || ''} onChange={setOpportunityRisk} rows={2} placeholder="例如：竞品已进入、预算不明确、技术参数未闭环" />
          <EditArea label="本次拜访目标" value={visitGoal || task.visitGoal || ''} onChange={setVisitGoal} rows={3} />
          <EditArea label="期望客户承诺（BAC/MAC依据）" value={expectedCommitment || task.expectedCommitment || ''} onChange={setExpectedCommitment} rows={2} />
          <EditArea label="拜访重点/现场关注" value={visitFocus || task.visitFocus || ''} onChange={setVisitFocus} rows={2} />
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="text-xs" style={{ color: '#8F959E' }}>保存后会清除该客户旧话术缓存，重新点击卡片会生成新打法。</div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              style={{ color: '#5A5A5A' }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm text-white"
              style={{ backgroundColor: '#1B6EF3' }}
            >
              保存修改
            </button>
          </div>
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
    <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
      <div className="text-xs mb-1" style={{ color: '#8F959E' }}>{label}</div>
      <div className="text-sm font-medium leading-snug" style={{ color: '#1F2329' }}>{value}</div>
    </div>
  );
}

function DiagnosticMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div className="text-[11px] mb-1" style={{ color: '#64748B' }}>{label}</div>
      <div className="text-sm font-semibold leading-snug" style={{ color: '#1F2329' }}>{value}</div>
      {sub ? <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div> : null}
    </div>
  );
}

function StageTimeline({ currentIndex }: { currentIndex: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {detailStageSteps.map((stage, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const color = current ? '#2563EB' : done ? '#16A34A' : '#CBD5E1';
          return (
            <div key={stage} className="flex-1 min-w-0">
              <div className="h-1.5 rounded-full mb-1.5" style={{ backgroundColor: color }} />
              <div
                className="text-[10px] leading-tight truncate"
                title={stage}
                style={{ color: current ? '#1D4ED8' : done ? '#15803D' : '#94A3B8', fontWeight: current ? 700 : 500 }}
              >
                {stage.replace(/[“”]/g, '')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommitmentCard({ title, content, tone }: { title: string; content: string; tone: 'primary' | 'secondary' }) {
  const styles = tone === 'primary'
    ? { bg: '#EFF6FF', border: '#BFDBFE', title: '#1D4ED8', mark: '#2563EB' }
    : { bg: '#ECFDF5', border: '#BBF7D0', title: '#047857', mark: '#16A34A' };
  return (
    <div className="rounded-xl border px-3 py-3 relative overflow-hidden" style={{ backgroundColor: styles.bg, borderColor: styles.border }}>
      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: styles.mark }} />
      <div className="text-sm font-semibold mb-2 pl-1" style={{ color: styles.title }}>{title}</div>
      <div className="text-sm leading-relaxed pl-1" style={{ color: '#1E293B' }}>{content}</div>
    </div>
  );
}

function DecisionRoleCard({ item }: { item: any }) {
  const tone = getDecisionTone(item);
  return (
    <div className="rounded-xl border px-3 py-3 min-h-[150px] flex flex-col" style={{ backgroundColor: '#FBFDFF', borderColor: tone.border }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold leading-snug" style={{ color: '#1F2329' }}>{item.role}</div>
          <div className="text-xs mt-1 leading-snug" style={{ color: '#64748B' }}>{item.person}</div>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: tone.bg, color: tone.color }}>
          {tone.label}
        </span>
      </div>
      <div className="text-xs leading-relaxed mb-2" style={{ color: '#475569' }}>{item.status}</div>
      <div className="mt-auto text-xs leading-relaxed rounded-lg px-2 py-2" style={{ backgroundColor: '#F8FAFC', color: '#334155' }}>
        <span className="font-semibold" style={{ color: '#1F2329' }}>动作：</span>{item.action}
      </div>
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

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-2" style={{ color: '#1F2329' }}>{title}</div>
      {children}
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

function EditField({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
      />
    </div>
  );
}

function EditArea({ label, value, onChange, rows = 2, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400 resize-none"
      />
    </div>
  );
}
