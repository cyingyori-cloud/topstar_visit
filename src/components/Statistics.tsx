import { useAppStore } from '../stores/appStore';
import ChatArea from './ChatArea';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Layers3,
  Route,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';
import { TIER_RULES } from '../data/skills';
import { completedVisits } from '../data/mockData';

const levelColors: Record<string, string> = { S: '#DC2626', A: '#EA580C', B: '#16A34A', C: '#7B8794' };

const stageGroups = [
  { label: '线索/信息', stages: ['"收"线索', '"查"信息'], color: '#1B6EF3' },
  { label: '商机确认', stages: ['"获"商机', '"做"客情'], color: '#16A34A' },
  { label: '价值推进', stages: ['"观"案例', '"报"价值', '"约"高层'], color: '#F59E0B' },
  { label: '商务收口', stages: ['"定"商务', '"签"合同', '"收"全款'], color: '#DC2626' },
  { label: '休眠', stages: ['休眠'], color: '#7B8794' },
];

function getDaysSinceLastVisit(customerId: string) {
  const visits = completedVisits.filter(v => v.customerId === customerId);
  if (visits.length === 0) return 999;
  const last = visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
  return Math.floor((new Date().getTime() - new Date(last.visitDate).getTime()) / 86400000);
}

export default function Statistics() {
  const {
    filteredCustomers,
    filteredTasks,
    filteredCompletedVisits,
    filteredCoverage,
    currentRep,
    sendMessage,
  } = useAppStore();

  const totalOpp = filteredCustomers.reduce((sum, customer) => sum + customer.opportunityAmount, 0);
  const pendingConfirmCount = filteredTasks.filter(task => task.confirmationStatus === 'pending_confirmation').length;
  const coveredPct = filteredCoverage.total > 0 ? Math.round((filteredCoverage.covered / filteredCoverage.total) * 100) : 0;
  const advancingCount = filteredCustomers.filter(customer => !customer.opportunityStage.includes('休眠')).length;

  const tierReview = (['S', 'A', 'B', 'C'] as const).map(level => {
    const rule = TIER_RULES.find(item => item.tier === level);
    const customers = filteredCustomers.filter(customer => customer.level === level);
    const covered = new Set(filteredCompletedVisits.filter(visit => visit.customerLevel === level).map(visit => visit.customerId)).size;
    const overdue = customers.filter(customer => getDaysSinceLastVisit(customer.id) > (rule?.overdueDays || 30));
    const amount = customers.reduce((sum, customer) => sum + customer.opportunityAmount, 0);
    const coveragePct = customers.length > 0 ? Math.round((covered / customers.length) * 100) : 0;
    return {
      level,
      label: rule?.label || '',
      managementMethod: rule?.managementMethod || '',
      estimatedShare: rule?.estimatedShare || '',
      total: customers.length,
      covered,
      overdue: overdue.length,
      amount,
      coveragePct,
      color: rule?.color || levelColors[level],
    };
  });

  const riskCustomers = filteredCustomers
    .map(customer => {
      const rule = TIER_RULES.find(item => item.tier === customer.level);
      const days = getDaysSinceLastVisit(customer.id);
      const overdueDays = rule?.overdueDays || 30;
      return {
        customer,
        rule,
        days,
        isRisk: days > overdueDays,
        severity: days > overdueDays * 2 ? '高' : '中',
      };
    })
    .filter(item => item.isRisk)
    .sort((a, b) => b.customer.opportunityAmount - a.customer.opportunityAmount)
    .slice(0, 5);

  const stageReview = stageGroups.map(group => {
    const customers = filteredCustomers.filter(customer => group.stages.includes(customer.opportunityStage));
    const amount = customers.reduce((sum, customer) => sum + customer.opportunityAmount, 0);
    return { ...group, count: customers.length, amount };
  });
  const maxStageAmount = Math.max(...stageReview.map(item => item.amount), 1);

  const topActions = [
    riskCustomers.length > 0
      ? `先处理 ${getFullCompanyName(riskCustomers[0].customer.name)}：${riskCustomers[0].customer.level}级客户已超过经营提醒口径`
      : '当前无明显超期高风险客户，保持节奏',
    pendingConfirmCount > 0
      ? `确认 ${pendingConfirmCount} 个待确认拜访提醒，避免任务悬空`
      : '拜访任务确认状态正常',
    stageReview.find(item => item.label === '商务收口')?.count
      ? '商务收口客户要明确报价、采购流程和签约日期'
      : '补强价值推进客户，准备 ROI/案例/高层材料',
  ];

  const handleGenerateReview = () => {
    sendMessage('请基于当前经营复盘数据，按SABC客户结构、超期风险、商机阶段和下周动作，生成一份销售主管视角的经营复盘建议。');
  };

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4">
      <div className="overflow-y-auto space-y-3 pr-1" style={{ width: '66.6%', scrollbarWidth: 'thin' }}>
        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>{currentRep.name} · 经营复盘</div>
              <div className="text-xs mt-1" style={{ color: '#8F959E' }}>看客户结构、风险客户、商机阶段和下周动作</div>
            </div>
            <button
              onClick={handleGenerateReview}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
              style={{ color: '#1B6EF3' }}
            >
              生成复盘建议
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <KpiCard label="客户总数" value={String(filteredCustomers.length)} icon={Users} color="#1B6EF3" />
            <KpiCard label="商机总额" value={`¥${totalOpp}万`} icon={TrendingUp} color="#16A34A" />
            <KpiCard label="推进客户" value={String(advancingCount)} icon={Target} color="#F59E0B" />
            <KpiCard label="已完成拜访" value={String(filteredCompletedVisits.length)} icon={CheckCircle2} color="#7C3AED" />
            <KpiCard label="覆盖率" value={`${coveredPct}%`} icon={BarChart3} color="#DC2626" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4" style={{ color: '#1B6EF3' }} />
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>本周复盘结论</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {topActions.map((action, index) => (
              <div key={action} className="rounded-lg px-3 py-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#1B6EF3' }}>优先动作 {index + 1}</div>
                <div className="text-sm leading-relaxed" style={{ color: '#1F2329' }}>{action}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Layers3 className="w-4 h-4" style={{ color: '#1B6EF3' }} />
              <span className="font-medium text-sm" style={{ color: '#1F2329' }}>SABC经营健康</span>
            </div>
            <div className="space-y-2">
              {tierReview.map(item => (
                <div key={item.level} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#F8FAFC' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: item.color }}>{item.level}级 · {item.label}</span>
                    <span className="text-xs" style={{ color: '#8F959E' }}>参考{item.estimatedShare}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <Metric label="客户" value={`${item.total}家`} />
                    <Metric label="覆盖" value={`${item.covered}家/${item.coveragePct}%`} />
                    <Metric label="风险" value={`${item.overdue}家`} danger={item.overdue > 0} />
                    <Metric label="商机" value={`¥${item.amount}万`} />
                  </div>
                  <div className="text-xs mt-2 truncate" style={{ color: '#64748B' }}>{item.managementMethod}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4" style={{ color: '#1B6EF3' }} />
              <span className="font-medium text-sm" style={{ color: '#1F2329' }}>商机阶段卡点</span>
            </div>
            <div className="space-y-3">
              {stageReview.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: item.color }}>{item.label}</span>
                    <span className="text-xs" style={{ color: '#5A5A5A' }}>{item.count}家 · ¥{item.amount}万</span>
                  </div>
                  <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${item.amount > 0 ? Math.max((item.amount / maxStageAmount) * 100, 10) : 0}%`,
                      backgroundColor: item.color,
                      opacity: 0.75,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4" style={{ color: '#DC2626' }} />
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>需要盯紧的客户</span>
          </div>
          <div className="space-y-2">
            {riskCustomers.length > 0 ? riskCustomers.map(item => (
              <div key={item.customer.id} className="grid grid-cols-[1.5fr_0.7fr_0.7fr_1.8fr] items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: '#1F2329' }}>{getFullCompanyName(item.customer.name)}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8F959E' }}>{item.customer.industry} · {item.customer.currentOpportunity}</div>
                </div>
                <div className="text-xs" style={{ color: levelColors[item.customer.level] }}>{item.customer.level}级 · {item.rule?.label}</div>
                <div className="text-xs font-semibold" style={{ color: item.severity === '高' ? '#DC2626' : '#EA580C' }}>
                  {item.days === 999 ? '未拜访' : `${item.days}天未拜访`}
                </div>
                <div className="text-xs" style={{ color: '#64748B' }}>
                  建议：先补关系触达，再拿下一步承诺
                </div>
              </div>
            )) : (
              <div className="text-xs text-center py-6 rounded-lg" style={{ color: '#8F959E', backgroundColor: '#F8FAFC' }}>
                暂无明显超期风险客户
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
            <span className="font-medium text-sm" style={{ color: '#1F2329' }}>下周经营动作</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <ActionCard title="S级" text="补高层互动、活动邀约和驻场服务信号" color="#DC2626" />
            <ActionCard title="A级" text="确认月度联系，排季度上门拜访" color="#EA580C" />
            <ActionCard title="B级" text="保持月度触达，筛出升级商机" color="#16A34A" />
            <ActionCard title="C级" text="批量激活，筛选有价值线索" color="#7B8794" />
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

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="text-[10px]" style={{ color: '#8F959E' }}>{label}</div>
      <div className="text-xs font-semibold" style={{ color: danger ? '#DC2626' : '#1F2329' }}>{value}</div>
    </div>
  );
}

function ActionCard({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}26` }}>
      <div className="text-xs font-semibold mb-1" style={{ color }}>{title}</div>
      <div className="text-xs leading-relaxed" style={{ color: '#334155' }}>{text}</div>
    </div>
  );
}
