import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, MapPin, Sparkles, ShieldAlert, Heart, Compass } from 'lucide-react';

export const RaymiDetailModal: React.FC = () => {
  const { selectedRaymi, setSelectedRaymi, setSelectedRegion, setActiveTab, t } = useApp();

  if (!selectedRaymi) return null;

  const handleExploreRegion = () => {
    setSelectedRegion(selectedRaymi.region);
    setActiveTab('feed');
    setSelectedRaymi(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Hero Image & Close */}
        <div className="relative h-56 sm:h-64 w-full overflow-hidden">
          <img
            src={selectedRaymi.imagen_url}
            alt={selectedRaymi.nombre}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
          
          <button
            onClick={() => setSelectedRaymi(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title on Hero */}
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/90 text-slate-950 mb-1.5 shadow-md">
              ☀️ FIESTA SAGRADA DEL CALENDARIO ANDINO
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {selectedRaymi.nombre}
            </h2>
            <p className="text-sm font-semibold text-amber-300">
              {selectedRaymi.nombre_kichwa}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-300 text-xs sm:text-sm">
          
          {/* Quick Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Fecha Tradicional</p>
                <p className="font-bold text-xs text-white truncate">{selectedRaymi.fecha_celebracion}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Provincia / Cantón</p>
                <p className="font-bold text-xs text-white truncate">{selectedRaymi.provincia}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Próxima Edición</p>
                <p className="font-bold text-xs text-emerald-300 truncate">{selectedRaymi.proxima_fecha}</p>
              </div>
            </div>
          </div>

          {/* Significado Ancestral */}
          <div>
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <span>🌾 ¿Qué es y qué representa?</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
              {selectedRaymi.significado_ancestral}
            </p>
          </div>

          {/* Historia y Origen */}
          <div>
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <span>📜 Historia y Memoria Ancestral</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
              {selectedRaymi.historia_origen}
            </p>
          </div>

          {/* Elementos Rituales */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Símbolos y Elementos Rituales
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedRaymi.elementos_rituales.map((elem, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-amber-200 border border-slate-700"
                >
                  ✦ {elem}
                </span>
              ))}
            </div>
          </div>

          {/* PROTOCOLO DE RESPETO CULTURAL */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Cómo Participar con Respeto Cultural (Manual Wambra)</span>
            </h4>
            <p className="text-[11px] text-amber-200/80">
              Las Raymis son celebraciones espirituales sagradas, no shows para turistas. Recuerda seguir estas normas:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
              {selectedRaymi.protocolo_respeto.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Modal Bottom Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedRaymi(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            {t('close')}
          </button>

          <button
            onClick={handleExploreRegion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg hover:opacity-95"
          >
            <Compass className="w-4 h-4" />
            <span>Ver Rutas Comunitarias en {selectedRaymi.region}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
