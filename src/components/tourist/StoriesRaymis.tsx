import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Calendar, MapPin } from 'lucide-react';

export const StoriesRaymis: React.FC = () => {
  const { raymis, setSelectedRaymi, t } = useApp();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>{t('feed_raymis_ticker_title')}</span>
            <span className="text-[10px] text-amber-300 font-normal hidden sm:inline">(Toca para ver ficha cultural y protocolo)</span>
          </h3>
        </div>
        <span className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Calendario Solar Andino
        </span>
      </div>

      {/* Stories Horizontal Carousel */}
      <div className="flex items-center gap-3.5 sm:gap-5 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
        {raymis.map((raymi) => (
          <button
            key={raymi.id}
            onClick={() => setSelectedRaymi(raymi)}
            className="group flex flex-col items-center flex-shrink-0 text-center transition-transform hover:scale-105 active:scale-95"
            title={`Ver detalles de ${raymi.nombre} en ${raymi.provincia}`}
          >
            {/* Story Circle with Andean Glow */}
            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 shadow-md group-hover:shadow-amber-500/30">
              <div className="p-0.5 rounded-full bg-slate-950">
                <img
                  src={raymi.imagen_url}
                  alt={raymi.nombre}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover group-hover:brightness-110 transition-all"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 text-xs bg-slate-900 px-1 py-0.2 rounded-full border border-amber-400">
                ☀️
              </span>
            </div>

            {/* Label & Date */}
            <span className="mt-1.5 text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate max-w-[85px]">
              {raymi.nombre_kichwa.split('/')[0]}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 text-orange-400" />
              {raymi.provincia.split('/')[0].trim()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
