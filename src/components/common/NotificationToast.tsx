import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, X, CheckCircle2, DollarSign, Sun, MessageSquare, QrCode } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notifications, dismissNotification } = useApp();

  // Show only top 2 most recent active notifications
  const recentNotifs = notifications.slice(0, 2);

  if (recentNotifs.length === 0) return null;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'pago': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'reserva': return <CheckCircle2 className="w-4 h-4 text-amber-400" />;
      case 'raymi': return <Sun className="w-4 h-4 text-orange-400" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'qr': return <QrCode className="w-4 h-4 text-purple-400" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {recentNotifs.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto bg-slate-900/95 border border-amber-500/30 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3"
        >
          <div className="p-1.5 rounded-xl bg-slate-800 flex-shrink-0 mt-0.5">
            {getIcon(n.tipo)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-300 leading-tight">{n.titulo}</p>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">{n.mensaje}</p>
            <span className="text-[9px] text-slate-500 mt-1 inline-block">{n.timestamp}</span>
          </div>
          <button
            onClick={() => dismissNotification(n.id)}
            className="text-slate-500 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
