import React from 'react';
import { AndeanSeals } from '../../types';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface AndeanSealBadgeProps {
  sellos: AndeanSeals;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const AndeanSealBadge: React.FC<AndeanSealBadgeProps> = ({ 
  sellos, 
  size = 'md', 
  showDetails = false 
}) => {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {/* 3B Badge: Bueno, Bonito, Barato */}
      <div 
        className={`group relative inline-flex items-center gap-1 rounded-full font-bold shadow-sm transition-all ${
          size === 'sm' 
            ? 'px-2 py-0.5 text-xs bg-amber-100 text-amber-900 border border-amber-300' 
            : 'px-2.5 py-1 text-xs md:text-sm bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-amber-500/20'
        }`}
        title="Sellos Andinos 3B: Bueno (Calidad), Bonito (Cultura/Paisaje), Barato (Precio Justo Mochilero). Otorgado por turistas con QR verificado."
      >
        {/* Andean Geometric Chakana symbol icon */}
        <span className="inline-block text-yellow-300 font-black">✦</span>
        <span>3B</span>
        <span className="text-[10px] opacity-80 font-normal">
          ({sellos.bueno + sellos.bonito + sellos.barato})
        </span>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-lg bg-slate-900 p-2 text-[11px] text-white shadow-xl group-hover:block z-30 font-normal">
          <p className="font-bold text-amber-400">Sello 3B Andino</p>
          <p>• {sellos.bueno} Bueno (Acogida)</p>
          <p>• {sellos.bonito} Bonito (Cultura)</p>
          <p>• {sellos.barato} Barato (Precio Justo)</p>
          <p className="text-[9px] text-slate-400 mt-1">¡No se compra con dinero!</p>
        </div>
      </div>

      {/* S Badge: Lugar Seguro */}
      {sellos.seguro && (
        <div 
          className={`group relative inline-flex items-center gap-1 rounded-full font-bold shadow-sm transition-all ${
            size === 'sm' 
              ? 'px-2 py-0.5 text-xs bg-emerald-100 text-emerald-900 border border-emerald-300' 
              : 'px-2.5 py-1 text-xs md:text-sm bg-emerald-700 text-emerald-100 border border-emerald-500/40 shadow-emerald-700/20'
          }`}
          title="Sello S: Lugar Seguro y Comunidad Organizada. Verificado por protocolos de cabildo y turistas."
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
          <span>+ S</span>
          <span className="hidden sm:inline text-[10px] font-medium text-emerald-200">Seguro</span>

          {/* Hover Tooltip */}
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-44 rounded-lg bg-slate-900 p-2 text-[11px] text-white shadow-xl group-hover:block z-30 font-normal">
            <p className="font-bold text-emerald-400">Sello +S: Seguridad</p>
            <p>Comunidad organizada, protocolos de auxilio rural y senderos señalizados.</p>
          </div>
        </div>
      )}

      {/* GAD Verified Stamp */}
      {sellos.verificado_gad && (
        <div 
          className={`inline-flex items-center gap-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/40 font-medium ${
            size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          title="Verificado oficialmente por el GAD Cantonal / Provincial"
        >
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          <span>GAD Verificado</span>
        </div>
      )}

      {showDetails && (
        <span className="text-xs text-slate-400 flex items-center gap-1 ml-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          {sellos.votos_totales} votos de wambras
        </span>
      )}
    </div>
  );
};
