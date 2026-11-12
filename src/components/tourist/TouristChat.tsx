import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  MessageSquare, 
  Send, 
  Users, 
  MapPin, 
  ShieldAlert, 
  Sparkles, 
  Compass,
  Flame
} from 'lucide-react';

const CHANNELS = [
  { id: '#panas-de-ruta', label: 'Panas de Ruta', icon: '🎒', desc: 'Compartir camionetas y abaratar costos' },
  { id: '#sierra-y-volcanes', label: 'Sierra & Volcanes', icon: '🏔️', desc: 'Páramo, Quilotoa, Saraguro y senderismo' },
  { id: '#amazonia-mochilera', label: 'Amazonía Mochilera', icon: '🌿', desc: 'Cofán, Shiripuno, selva y consejos' },
  { id: '#costa-y-surf', label: 'Costa & Arqueología', icon: '🌊', desc: 'Agua Blanca, Isla de la Plata y playas' },
];

export const TouristChat: React.FC = () => {
  const { chatMessages, sendChatMessage, t } = useApp();
  const [activeChannel, setActiveChannel] = useState<string>('#panas-de-ruta');
  const [inputText, setInputText] = useState<string>('');

  const filteredMessages = chatMessages.filter(m => m.canal === activeChannel);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(activeChannel, inputText);
    setInputText('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-600/20 text-orange-400">
                <MessageSquare className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {t('chat_title')}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('chat_subtitle')}
            </p>
          </div>

          {/* Low Tech Protection Badge */}
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 max-w-sm">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90 leading-tight">
              {t('chat_notice')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Layout: Channels Sidebar + Messages Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        
        {/* Channels Sidebar */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 pb-1">
            Canales de Encuentro
          </p>

          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {CHANNELS.map(ch => {
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full p-2.5 rounded-2xl text-left flex items-center gap-2.5 transition-all whitespace-nowrap md:whitespace-normal ${
                    isActive 
                      ? 'bg-amber-500/20 border border-amber-500/40 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-lg">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{ch.label}</p>
                    <p className="text-[10px] text-slate-400 hidden md:block truncate">{ch.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div className="md:col-span-3 flex flex-col justify-between p-4 sm:p-5 bg-slate-900/90">
          
          {/* Active Channel Top Bar */}
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-amber-400">{activeChannel}</span>
              <span className="text-xs text-slate-400 hidden sm:inline">• {filteredMessages.length} mensajes</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
              ● Red Wambra Activa
            </span>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 max-h-[380px] pr-1">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aún no hay mensajes en este canal.</p>
                <p className="text-[11px] text-slate-600">¡Sé el primer guambra en proponer ruta o preguntar!</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 group animate-in fade-in">
                  <img
                    src={msg.avatar_url}
                    alt={msg.usuario_nombre}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 flex-shrink-0"
                  />
                  <div className="flex-1 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 group-hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-white">{msg.usuario_nombre}</span>
                        <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.2 rounded-md border border-amber-500/20 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {msg.origen}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{msg.mensaje}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('chat_placeholder')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:border-amber-400 outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('chat_send_btn')}</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
