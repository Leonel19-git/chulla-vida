import React from 'react';
import { useApp } from '../../context/AppContext';
import { StoriesRaymis } from './StoriesRaymis';
import { PlaceCard } from './PlaceCard';
import { 
  Search, 
  SlidersHorizontal, 
  Compass, 
  MapPin, 
  Sparkles,
  Users,
  DollarSign
} from 'lucide-react';

const REGIONS = [
  { id: 'Todas', label: 'Todas las Regiones', icon: '🇪🇨' },
  { id: 'Sierra', label: 'Sierra Andina', icon: '🏔️' },
  { id: 'Costa', label: 'Costa del Pacífico', icon: '🌊' },
  { id: 'Amazonía', label: 'Amazonía Viva', icon: '🌿' }
];

export const TouristFeed: React.FC = () => {
  const { 
    places, 
    selectedRegion, 
    setSelectedRegion, 
    searchQuery, 
    setSearchQuery, 
    onboarding, 
    setIsOnboardingOpen, 
    t 
  } = useApp();

  // Filter places by Region and Search Query
  const filteredPlaces = places.filter(place => {
    const matchesRegion = selectedRegion === 'Todas' || place.region === selectedRegion;
    const matchesSearch = searchQuery === '' || 
      place.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.comunidad_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.provincia.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.etiquetas.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesRegion && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Raymis Stories Ticker */}
      <StoriesRaymis />

      {/* Onboarding Summary Pill Bar */}
      {onboarding.completado && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Tablero Wambra Calculado:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              👥 {onboarding.cantidad_personas} wambras
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              💰 Presupuesto ~${onboarding.presupuesto_max} USD
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              🧭 {onboarding.pasiones.slice(0, 2).join(', ')}
            </span>
          </div>

          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Reajustar preferencias</span>
          </button>
        </div>
      )}

      {/* Search and Region Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('feed_search_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:border-amber-400 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Region Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {REGIONS.map((reg) => {
            const isSelected = selectedRegion === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{reg.icon}</span>
                <span>{reg.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Places Feed Grid (10 full destinations) */}
      {filteredPlaces.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <Compass className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No encontramos rutas con esos filtros</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('feed_empty')}
          </p>
          <button
            onClick={() => {
              setSelectedRegion('Todas');
              setSearchQuery('');
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-amber-300 hover:bg-slate-700 transition-colors"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

    </div>
  );
};
