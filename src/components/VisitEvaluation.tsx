import { useState } from 'react';
// import { useAppStore } from '../stores/appStore';
import { TIER_RULES } from '../data/skills';
import { X, Star, CheckCircle2, Circle, MessageSquare, ArrowRight, Send } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

// 成单十步法 - 商机阶段
const OPPORTUNITY_STAGES: StageInfo[] = [
  { stage: '"收"线索', rate: 0, desc: '收集线索' },
  { stage: '"查"信息', rate: 10, desc: '了解信息' },
  { stage: '"获"商机', rate: 20, desc: '获得商机' },
  { stage: '"做"客情', rate: 30, desc: '做客情' },
  { stage: '"观"案例', rate: 40, desc: '参观案例' },
  { stage: '"报"价值', rate: 50, desc: '汇报价值' },
  { stage: '"约"高层', rate: 60, desc: '约见高层' },
  { stage: '"定"商务', rate: 80, desc: '确定商务' },
  { stage: '"签"合同', rate: 90, desc: '签订合同' },
  { stage: '"收"全款', rate: 100, desc: '收回全款' },
];

interface StageInfo {
  stage: string;
  rate: number;
  desc: string;
}

function getStageInfo(percent: number): StageInfo {
  if (percent === 0) return OPPORTUNITY_STAGES[0];
  if (percent <= 10) return OPPORTUNITY_STAGES[1];
  if (percent <= 20) return OPPORTUNITY_STAGES[2];
  if (percent <= 30) return OPPORTUNITY_STAGES[3];
  if (percent <= 40) return OPPORTUNITY_STAGES[4];
  if (percent <= 50) return OPPORTUNITY_STAGES[5];
  if (percent <= 60) return OPPORTUNITY_STAGES[6];
  if (percent <= 80) return OPPORTUNITY_STAGES[7];
  if (percent <= 90) return OPPORTUNITY_STAGES[8];
  return OPPORTUNITY_STAGES[9];
}

function getNextStage(currentPercent: number): StageInfo | null {
  const stages = OPPORTUNITY_STAGES.map(s => s.rate);
  for (const stage of stages) {
    if (stage > currentPercent) {
      return OPPORTUNITY_STAGES.find(s => s.rate === stage) || null;
    }
  }
  return null;
}

interface CompletedVisit {
  id: string;
  customerId: string;
  customerName: string;
  customerLevel: 'S' | 'A' | 'B' | 'C';
  visitDate: string;
  summary: string;
  outcome: string;
  nextSteps: string;
  archived: boolean;
}

interface Props {
  visit: CompletedVisit | null;
  onClose: () => void;
}

export default function VisitEvaluation({ visit, onClose }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [bac, setBac] = useState('');
  const [mac, setMac] = useState('');
  const [stageAdvance, setStageAdvance] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!visit) return null;

  const rule = TIER_RULES.find(r => r.tier === visit.customerLevel);
  const checkItems = rule?.fiveChecks || ['有实质性进展'];
  const completedCount = Object.values(checks).filter(Boolean).length;
  const allChecked = completedCount >= checkItems.length;
  const effectiveRate = checkItems.length > 0 ? Math.round(completedCount / checkItems.length * 100) : 100;

  const toggleCheck = (item: string) => {
    setChecks(prev => ({ ...prev, [item]: !prev[item] }));
  };

  // 获取商机阶段信息（模拟当前商机的百分比）
  const opportunityPercent = 30; // TODO: 从 visit 或 customer 获取
  const currentStage = getStageInfo(opportunityPercent);
  const nextStage = getNextStage(opportunityPercent);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div className="bg-white rounded-xl w-[480px] shadow-2xl overflow-hidden">
          <div className="px-6 py-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#52C41A' }} />
            <div className="text-lg font-semibold mb-2" style={{ color: '#1F2329' }}>拜访评估已提交</div>
            <div className="text-sm mb-4" style={{ color: '#8F959E' }}>
              {getFullCompanyName(visit.customerName)} · {visit.visitDate}
            </div>
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: allChecked ? '#52C41A' : '#F5A623' }}>{effectiveRate}%</div>
                <div className="text-xs" style={{ color: '#8F959E' }}>完成度</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#1B6EF3' }}>{completedCount}/{checkItems.length}</div>
                <div className="text-xs" style={{ color: '#8F959E' }}>检查项</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: allChecked ? '#52C41A' : '#F5A623' }}>
                  {allChecked ? '✅ 有效' : '⚠️ 部分'}
                </div>
                <div className="text-xs" style={{ color: '#8F959E' }}>评估结果</div>
              </div>
            </div>
            {bac && (
              <div className="text-sm mb-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
                ✅ BAC达成：{bac}
              </div>
            )}
            {mac && !bac && (
              <div className="text-sm mb-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFF7ED', color: '#9A3412' }}>
                🛡️ MAC达成：{mac}
              </div>
            )}
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: '#1B6EF3' }}>
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-xl w-[540px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: '#F5A623' }} />
            <span className="font-semibold text-sm" style={{ color: '#1F2329' }}>拜访有效性评估</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
        </div>

        {/* Visit info */}
        <div className="px-5 py-3" style={{ backgroundColor: '#F8F9FA' }}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium" style={{ color: '#1F2329' }}>{getFullCompanyName(visit.customerName)}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{
                backgroundColor: visit.customerLevel === 'S' ? '#FEE2E2' : visit.customerLevel === 'A' ? '#FFF7ED' : '#EFF6FF',
                color: visit.customerLevel === 'S' ? '#DC2626' : visit.customerLevel === 'A' ? '#EA580C' : '#2563EB',
              }}>{visit.customerLevel}级</span>
            </div>
            <span className="text-xs" style={{ color: '#8F959E' }}>{visit.visitDate}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: '#5A5A5A' }}>{visit.summary}</div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Check items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium" style={{ color: '#1F2329' }}>
                📋 {rule?.label || '一般'}客户检查项（{rule?.tier || visit.customerLevel}级规则）
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                backgroundColor: allChecked ? '#F0FDF4' : '#FFF7ED',
                color: allChecked ? '#52C41A' : '#F5A623',
              }}>{completedCount}/{checkItems.length}</span>
            </div>
            <div className="space-y-1.5">
              {checkItems.map((item, i) => (
                <button key={i} onClick={() => toggleCheck(item)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all"
                  style={{
                    backgroundColor: checks[item] ? '#F0FDF4' : '#F8F9FA',
                    border: `1px solid ${checks[item] ? '#BBF7D0' : '#E5E7EB'}`,
                  }}>
                  {checks[item]
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#52C41A' }} />
                    : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: '#D1D5DB' }} />
                  }
                  <span style={{ color: checks[item] ? '#166534' : '#1F2329' }}>{item}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BAC/MAC */}
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: '#1F2329' }}>🎯 承诺达成情况</div>
            <div className="space-y-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#5A5A5A' }}>BAC（最佳承诺）是否达成？</label>
                <input type="text" value={bac} onChange={e => setBac(e.target.value)}
                  placeholder="如：同意安排技术团队下周做现场诊断"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#5A5A5A' }}>MAC（最低承诺）是否达成？</label>
                <input type="text" value={mac} onChange={e => setMac(e.target.value)}
                  placeholder="如：提供了详细技术参数清单"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400" />
              </div>
            </div>
          </div>

          {/* Stage advance - 成单十步法 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="w-4 h-4" style={{ color: '#1B6EF3' }} />
              <span className="text-sm font-medium" style={{ color: '#1F2329' }}>商机阶段</span>
            </div>
            {/* 阶段进度条 */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium" style={{ color: '#1B6EF3' }}>{currentStage.stage} · {currentStage.desc}</span>
                <span style={{ color: '#8F959E' }}>{currentStage.rate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${currentStage.rate}%`,
                    background: 'linear-gradient(90deg, #1B6EF3, #7C3AED)'
                  }}
                />
              </div>
              {nextStage && (
                <div className="text-xs mt-1" style={{ color: '#52C41A' }}>
                  下一步：{nextStage.stage} · {nextStage.desc}
                </div>
              )}
            </div>
            {/* 阶段选择按钮 */}
            <div className="flex flex-wrap gap-1.5">
              {OPPORTUNITY_STAGES.map((stage) => {
                const isActive = currentStage.rate === stage.rate;
                const isPast = stage.rate < currentStage.rate;
                return (
                  <button
                    key={stage.stage}
                    onClick={() => setStageAdvance(stage.stage)}
                    className="text-xs px-2 py-1 rounded transition-all"
                    style={{
                      backgroundColor: isActive ? '#1B6EF3' : isPast ? '#E8F4FF' : '#F5F5F5',
                      color: isActive ? '#fff' : isPast ? '#1B6EF3' : '#8F959E',
                      fontWeight: isActive ? 600 : 400,
                      border: isActive ? 'none' : '1px solid #E5E7EB',
                    }}
                  >
                    {stage.stage}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4" style={{ color: '#8F959E' }} />
              <span className="text-sm font-medium" style={{ color: '#1F2329' }}>评估备注</span>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="记录本次拜访的关键收获、客户反馈、后续计划..."
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <div className="text-xs" style={{ color: allChecked ? '#52C41A' : '#F5A623' }}>
            {allChecked ? '✅ 所有检查项已完成，本次拜访有效' : `⚠️ 还有 ${checkItems.length - completedCount} 项未完成`}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50" style={{ color: '#5A5A5A' }}>
              取消
            </button>
            <button onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-white"
              style={{ backgroundColor: '#1B6EF3' }}>
              <Send className="w-3.5 h-3.5" /> 提交评估
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
