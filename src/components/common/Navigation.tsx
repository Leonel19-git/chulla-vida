import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Compass, 
  Sun, 
  MessageSquare, 
  QrCode, 
  Store, 
  Landmark 
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, t, role, reservations } = useApp();

  const myPaidVouchersCount = reservations.filter(r => r.estado === 'pagado').length;

  const NAV_ITEMS = [
    { id: 'feed', label: t('nav_feed'), icon: Compass, badge: null },
    { id: 'raymis', label: t('nav_raymis'), icon: Sun, badge: '5 Raymis' },
    { id: 'chat', label: t('nav_chat'), icon: MessageSquare, badge: 'En vivo' },
    { id: 'vouchers', label: t('nav_my_vouchers'), icon: QrCode, badge: myPaidVouchersCount > 0 ? `${myPaidVouchersCount}` : null },
    { id: 'host', label: t('nav_host_portal'), icon: Store, badge: role === 'local' ? 'Tu Rol' : null },
    { id: 'gad', label: t('nav_gad_panel'), icon: Landmark, badge: (role === 'gad' || role === 'aliado') ? 'Tu Rol' : null },
  ] as const;

  return (
    <>
      {/* Desktop Sticky Sub-Nav */}
      <nav className="hidden md:block bg-slate-900/90 border-b border-slate-800 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-200' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 backdrop-blur-lg z-40 px-2 py-1.5">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                  isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-amber-500/20 text-amber-400' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="truncate max-w-[65px] mt-0.5">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-orange-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
