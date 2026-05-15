import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Factory, Bell, ChevronDown, BarChart3, BookOpen, Users, LayoutDashboard, Crown, Shield, UserCheck } from 'lucide-react';
import { salesReps } from '../data/roles';

const navItems = [
  { label: '客户盘点', icon: Users },
  { label: '拜访推进', icon: LayoutDashboard },
  { label: '拜访赋能', icon: BookOpen },
  { label: '经营复盘', icon: BarChart3 },
];

const roleIcons: Record<number, any> = {
  1: Crown,      // 销售总监
  2: Shield,     // 区域总监
  3: UserCheck,  // 销售人员
};

const roleColors: Record<number, string> = {
  1: '#F5A623',  // 金色
  2: '#DC2626',  // 红色
  3: '#1B6EF3',  // 蓝色
};

export default function TopNav() {
  const { activeNav, setActiveNav, currentRep, switchRep } = useAppStore();
  const [showProfile, setShowProfile] = useState(false);

  const currentIcon = roleIcons[currentRep.level] || UserCheck;
  const currentColor = roleColors[currentRep.level] || '#1B6EF3';

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1B6EF3, #4A90D9)' }}>
              <Factory className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold" style={{ color: '#1F2329' }}>TopStar Visit AI</span>

            <div className="relative ml-2">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: currentColor }}>
                  {(() => { const Icon = currentIcon; return <Icon className="w-4 h-4" />; })()}
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-medium" style={{ color: currentColor }}>{currentRep.role}</div>
                  <div className="text-sm font-semibold -mt-px" style={{ color: '#1F2329' }}>{currentRep.name}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8F959E' }} />
              </button>

              {showProfile && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="px-3 py-2.5 text-xs font-medium border-b border-gray-100 flex items-center gap-1.5" style={{ color: '#8F959E' }}>
                    🔄 切换角色视角
                  </div>

                  {[3].map(level => {
                    const reps = salesReps.filter(r => r.level === level);
                    if (reps.length === 0) return null;
                    const levelLabel = '一线销售';
                    const Color = roleColors[level];
                    return (
                      <div key={level}>
                        <div className="px-3 py-1.5 text-xs" style={{ backgroundColor: '#F9FAFB', color: '#B0B5BE' }}>
                          {levelLabel}
                        </div>
                        {reps.map(rep => {
                          const Icon = roleIcons[rep.level] || UserCheck;
                          const isActive = rep.id === currentRep.id;
                          return (
                            <button
                              key={rep.id}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                              style={{ backgroundColor: isActive ? `${Color}0A` : 'transparent' }}
                              onClick={() => { switchRep(rep.id); setShowProfile(false); }}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: isActive ? Color : '#D1D5DB' }}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium" style={{ color: '#1F2329' }}>{rep.name}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${Color}14`, color: Color, fontSize: 10 }}>{rep.role}</span>
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: '#8F959E' }}>负责 {rep.customerIds.length} 家客户</div>
                              </div>
                              {isActive && (
                                <span className="text-xs font-medium flex-shrink-0" style={{ color: '#52C41A' }}>✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all duration-200"
                  style={{
                    color: isActive ? '#1B6EF3' : '#5A5A5A',
                    backgroundColor: isActive ? 'rgba(27,110,243,0.08)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => alert('暂无新通知')}>
            <Bell className="w-5 h-5" style={{ color: '#5A5A5A' }} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>
    </>
  );
}
