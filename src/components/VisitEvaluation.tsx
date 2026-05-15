import { useState } from 'react';
// import { useAppStore } from '../stores/appStore';
import { TIER_RULES } from '../data/skills';
import { X, Star, CheckCircle2, Circle, MessageSquare, ArrowRight, Send } from 'lucide-react';
import { getFullCompanyName } from '../utils/companyNames';

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

          {/* Stage advance */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="w-4 h-4" style={{ color: '#1B6EF3' }} />
              <span className="text-sm font-medium" style={{ color: '#1F2329' }}>商机阶段是否推进？</span>
            </div>
            <div className="flex items-center gap-2">
              {['未推进', '有进展', '已推进到下一阶段'].map(opt => (
                <button key={opt} onClick={() => setStageAdvance(opt)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: stageAdvance === opt ? '#1B6EF3' : '#F3F4F6',
                    color: stageAdvance === opt ? '#fff' : '#5A5A5A',
                    fontWeight: stageAdvance === opt ? 600 : 400,
                  }}>
                  {opt}
                </button>
              ))}
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
