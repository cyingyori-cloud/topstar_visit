import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { X, Building2, Calendar, Target, MapPin } from 'lucide-react';

export default function AddVisitModal() {
  const { showAddVisit, setShowAddVisit, filteredCustomers } = useAppStore();
  const [customerId, setCustomerId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  if (!showAddVisit) return null;

  const handleConfirm = () => {
    if (!customerId || !purpose || !date) return;
    // In a real app this would POST to an API
    alert(`拜访任务已创建！\n客户：${filteredCustomers.find(c => c.id === customerId)?.name}\n目的：${purpose}\n时间：${date} ${time || '待定'}`);
    setShowAddVisit(false);
    setCustomerId('');
    setPurpose('');
    setDate('');
    setTime('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-xl w-[420px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <span className="font-semibold text-sm" style={{ color: '#1F2329' }}>新建拜访任务</span>
          <button onClick={() => setShowAddVisit(false)} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* 客户 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: '#5A5A5A' }}>
              <Building2 className="w-3.5 h-3.5" /> 选择客户
            </label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              style={{ color: '#1F2329' }}
            >
              <option value="">请选择客户</option>
              {filteredCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name} [{c.level}级]</option>
              ))}
            </select>
          </div>

          {/* 拜访目的 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: '#5A5A5A' }}>
              <Target className="w-3.5 h-3.5" /> 拜访目的
            </label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="如：采购节奏沟通、技术参数澄清"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              style={{ color: '#1F2329' }}
            />
          </div>

          {/* 日期 & 时间 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: '#5A5A5A' }}>
                <Calendar className="w-3.5 h-3.5" /> 拜访日期
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                style={{ color: '#1F2329' }}
              />
            </div>
            <div className="w-32">
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: '#5A5A5A' }}>
                时间（可选）
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                style={{ color: '#1F2329' }}
              />
            </div>
          </div>

          {/* 地址 */}
          {customerId && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8F959E' }}>
              <MapPin className="w-3.5 h-3.5" />
              地址：{filteredCustomers.find(c => c.id === customerId)?.address}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={() => setShowAddVisit(false)}
            className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
            style={{ color: '#5A5A5A' }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!customerId || !purpose || !date}
            className="px-4 py-1.5 text-sm rounded-lg text-white disabled:opacity-40"
            style={{ backgroundColor: '#1B6EF3' }}
          >
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}
