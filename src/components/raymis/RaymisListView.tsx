import React from 'react';
import { useApp } from '../../context/AppContext';
import { Raymi } from '../../types';
import { Calendar, MapPin, Sparkles, ArrowRight, Sun, ShieldAlert } from 'lucide-react';

export const RaymisListView: React.FC = () => {
  const { raymis, setSelectedRaymi, t } = useApp();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <Sun className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Raymis y Calendario Sagrado del Ecuador
              </h1>
              <p className="text-xs text-slate-400">
                Las 4 grandes fiestas solares andinas y celebraciones étnicas de la costa y Amazonía.
              </p>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 self-start sm:self-auto">
            <span>☀️</span>
            Equinoccios & Solsticios
          </span>
        </div>
      </div>

      {/* Raymis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {raymis.map((raymi) => (
          <div
            key={raymi.id}
            onClick={() => setSelectedRaymi(raymi)}
            className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col"
          >
            {/* Image Banner */}
            <div className="relative h-48 w-full overflow-hidden bg-slate-950">
              <img
                src={raymi.imagen_url}
                alt={raymi.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30 shadow-md">
                  {raymi.provincia}
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors leading-tight">
                  {raymi.nombre}
                </h3>
                <p className="text-xs font-semibold text-amber-300">
                  {raymi.nombre_kichwa}
                </p>
              </div>
            </div>

            {/* Info Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                {raymi.significado_ancestral}
              </p>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fecha:</span>
                  </span>
                  <span className="font-bold text-white">{raymi.fecha_celebracion}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Próxima:</span>
                  </span>
                  <span className="font-bold text-emerald-300">{raymi.proxima_fecha}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Ver protocolo de respeto
                </span>
                <span className="p-2 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
