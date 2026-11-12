import React from 'react';
import { Place } from '../../types';
import { useApp } from '../../context/AppContext';
import { AndeanSealBadge } from '../common/AndeanSealBadge';
import { 
  MapPin, 
  Clock, 
  Users, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Flame,
  Award
} from 'lucide-react';

interface PlaceCardProps {
  place: Place;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  const { setSelectedPlace, setBookingPlace, onboarding, t } = useApp();

  const paxCount = onboarding.cantidad_personas || 2;
  const totalPrice = place.precio_base_pp * paxCount;

  return (
    <div className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col">
      
      {/* Card Media Header */}
      <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-950">
        <img
          src={place.imagenes[0]}
          alt={place.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

        {/* Region & Adventure Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950/80 backdrop-blur-md text-white border border-slate-700 shadow-md">
            {place.region}
          </span>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1 ${
            place.nivel_aventura === 'Adrenalina'
              ? 'bg-red-950/80 text-red-300 border border-red-500/40'
              : place.nivel_aventura === 'Moderado'
              ? 'bg-orange-950/80 text-orange-300 border border-orange-500/40'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
          }`}>
            <Flame className="w-3 h-3" />
            {place.nivel_aventura}
          </span>
        </div>

        {/* Plan Destacado / Verified Badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
          {place.es_destacado && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg flex items-center gap-1">
              <Award className="w-3 h-3 text-slate-950" />
              {place.etiqueta_plan_pagado || t('feed_sponsored_badge')}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {t('feed_verified_community')}
          </span>
        </div>

        {/* Community & Location Name on Bottom of Image */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <p className="text-xs font-bold text-amber-300 flex items-center gap-1 drop-shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-orange-400" />
            <span>{place.comunidad_nombre}</span>
          </p>
          <p className="text-[11px] text-slate-300">
            {place.provincia} • {place.canton_parroquia}
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        {/* Title and Short description */}
        <div>
          <h3 
            onClick={() => setSelectedPlace(place)}
            className="text-base sm:text-lg font-bold text-white hover:text-amber-400 transition-colors line-clamp-2 cursor-pointer"
          >
            {place.titulo}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {place.descripcion_corta}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {place.etiquetas.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Andean 3B + S Seal Badges */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Sellos Andinos:</span>
            <AndeanSealBadge sellos={place.sellos} size="sm" showDetails />
          </div>
        </div>

        {/* Pricing Breakdown & Dynamic Party Calculation */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                ${place.precio_base_pp}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                USD {t('feed_per_person')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{t('feed_total_for_group')}: <strong className="text-white">${totalPrice} USD</strong> ({paxCount} panas)</span>
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3 text-amber-400" />
              {place.duracion_dias} {t('feed_days')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setSelectedPlace(place)}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-center"
          >
            {t('feed_btn_view_place')}
          </button>
          
          <button
            onClick={() => setBookingPlace(place)}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:opacity-95 text-white shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-1"
          >
            <span>{t('feed_btn_book_route')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
