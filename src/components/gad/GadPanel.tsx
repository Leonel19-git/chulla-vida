import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GAD_PARISH_STATS } from '../../data/mockData';
import { 
  Landmark, 
  BarChart3, 
  Calendar, 
  Tag, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Check, 
  Users, 
  DollarSign, 
  MapPin,
  TrendingUp,
  Bus,
  Backpack,
  Coffee,
  X
} from 'lucide-react';

export const GadPanel: React.FC = () => {
  const { 
    places, 
    raymis, 
    partnerDiscounts, 
    addRaymiOfficial, 
    toggleGadCertification, 
    t 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'raymis' | 'allies'>('stats');
  const [isAddRaymiOpen, setIsAddRaymiOpen] = useState(false);

  // New Raymi Form State
  const [raymiName, setRaymiName] = useState('');
  const [raymiKichwa, setRaymiKichwa] = useState('');
  const [raymiProvince, setRaymiProvince] = useState('Loja');
  const [raymiDate, setRaymiDate] = useState('Diciembre');
  const [raymiMeaning, setRaymiMeaning] = useState('');
  const [raymiHistory, setRaymiHistory] = useState('');

  const handleCreateRaymi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raymiName || !raymiMeaning) return;

    addRaymiOfficial({
      nombre: raymiName,
      nombre_kichwa: raymiKichwa || raymiName,
      region: 'Sierra',
      provincia: raymiProvince,
      canton: 'Cabecera Cantonal',
      fecha_celebracion: raymiDate,
      proxima_fecha: '2027',
      significado_ancestral: raymiMeaning,
      historia_origen: raymiHistory || 'Celebración ancestral del calendario solar andino registrada por el GAD.',
      protocolo_respeto: [
        'Respetar el espacio ceremonial y los saberes de las autoridades comunitarias.',
        'No comercializar alcohol sin autorización del cabildo.',
        'Vestimenta adecuada y solicitud de permiso para registrar fotos.'
      ],
      imagen_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
      elementos_rituales: ['Sahumerio andino', 'Danza comunitaria', 'Pambamesa']
    });

    setIsAddRaymiOpen(false);
    setRaymiName('');
    setRaymiKichwa('');
    setRaymiMeaning('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400">
              <Landmark className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {t('gad_title')}
              </h1>
              <p className="text-xs text-slate-400">
                {t('gad_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-950 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
              <span>🏛️</span>
              Portal de Gobernanza Descentralizada
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stats'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t('gad_tab_stats')}</span>
        </button>

        <button
          onClick={() => setActiveTab('raymis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'raymis'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('gad_tab_raymis')}</span>
        </button>

        <button
          onClick={() => setActiveTab('allies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'allies'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>{t('gad_tab_allies')}</span>
        </button>
      </div>

      {/* TAB 1: RURAL TOURISM ANALYTICS */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Impacto Económico Directo a Comunidades</span>
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                $35,686.00 USD
              </p>
              <p className="text-[10px] text-slate-500">
                90% de los pagos quedan íntegramente en las familias rurales
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Familias Rurales Beneficiadas</span>
              </p>
              <p className="text-2xl sm:text-3xl font-black text-blue-400">
                201 familias
              </p>
              <p className="text-[10px] text-slate-500">
                En 6 cantones y parroquias sin intermediarios
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Sellos 3B+S Auditados por GAD</span>
              </p>
              <p className="text-2xl sm:text-3xl font-black text-amber-400">
                100% Verificados
              </p>
              <p className="text-[10px] text-slate-500">
                Garantía de calidad, precio justo y seguridad comunitaria
              </p>
            </div>
          </div>

          {/* Table of Rural Parishes Economic Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Distribución Descentralizada por Parroquia Rural
                </h3>
                <p className="text-xs text-slate-400">
                  Métricas anonimizadas de reservas y flujo económico territorial
                </p>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-bold">Parroquia / Comuna</th>
                    <th className="pb-3 font-bold">Provincia</th>
                    <th className="pb-3 font-bold">Reservas Confirmadas</th>
                    <th className="pb-3 font-bold">Familias Beneficiadas</th>
                    <th className="pb-3 font-bold">Derrama Económica USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {GAD_PARISH_STATS.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>{stat.parroquia}</span>
                      </td>
                      <td className="py-3 text-slate-300">{stat.provincia}</td>
                      <td className="py-3 font-semibold text-amber-400">{stat.reservas} reservas</td>
                      <td className="py-3 text-slate-300">{stat.familias_beneficiadas} familias</td>
                      <td className="py-3 font-black text-emerald-400">${stat.impacto_usd.toLocaleString()} USD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GAD Certification of 3B + S Seals */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span>Auditoría Municipal de Sellos 3B+S</span>
                </h3>
                <p className="text-xs text-slate-400">
                  El GAD avala que los lugares cumplen los estándares de seguridad comunitaria y guianza respetuosa.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {places.slice(0, 4).map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-xs text-white">{p.titulo}</p>
                    <p className="text-[11px] text-slate-400">{p.comunidad_nombre}</p>
                    <span className="text-[10px] text-amber-400 mt-1 inline-block">
                      {p.sellos.votos_totales} votos de turistas verificados
                    </span>
                  </div>

                  <button
                    onClick={() => toggleGadCertification(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      p.sellos.verificado_gad
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{p.sellos.verificado_gad ? 'Aval GAD Concedido' : 'Conceder Aval GAD'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: OFFICIAL RAYMIS CALENDAR MANAGER */}
      {activeTab === 'raymis' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white">
                Calendario Oficial de Raymis
              </h3>
              <p className="text-xs text-slate-400">
                Administración oficial del calendario andino y notificaciones push
              </p>
            </div>

            <button
              onClick={() => setIsAddRaymiOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{t('gad_add_raymi_btn')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {raymis.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">{r.nombre}</h4>
                    <p className="text-xs text-amber-400 font-medium">{r.nombre_kichwa}</p>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-lg text-slate-300">
                    {r.provincia}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{r.significado_ancestral}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Próxima: <strong className="text-white">{r.proxima_fecha}</strong></span>
                  <span className="text-emerald-400 font-semibold">● Publicada</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal to register new Raymi */}
          {isAddRaymiOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-left space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white">Registrar Nueva Raymi Oficial</h3>
                  <button onClick={() => setIsAddRaymiOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateRaymi} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Nombre de la Raymi</label>
                    <input
                      type="text"
                      value={raymiName}
                      onChange={(e) => setRaymiName(e.target.value)}
                      placeholder="Ej: Yamor (Fiesta de las Siete Variedades de Maíz)"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Nombre en Kichwa</label>
                    <input
                      type="text"
                      value={raymiKichwa}
                      onChange={(e) => setRaymiKichwa(e.target.value)}
                      placeholder="Ej: Yamor Raymi"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Provincia</label>
                      <input
                        type="text"
                        value={raymiProvince}
                        onChange={(e) => setRaymiProvince(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Fecha Tradicional</label>
                      <input
                        type="text"
                        value={raymiDate}
                        onChange={(e) => setRaymiDate(e.target.value)}
                        placeholder="Ej: Septiembre"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Significado Ancestral</label>
                    <textarea
                      rows={3}
                      value={raymiMeaning}
                      onChange={(e) => setRaymiMeaning(e.target.value)}
                      placeholder="Agradecimiento al maíz y elaboración de la chicha ceremonial..."
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors"
                  >
                    Inscribir en Calendario Oficial
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALLIED PARTNERS & CONVENIOS */}
      {activeTab === 'allies' && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Convenios y Descuentos para Viajeros Wambra
            </h3>
            <p className="text-xs text-slate-400">
              Beneficios negociados con empresas de transporte cooperativo y emprendimientos culturales
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {partnerDiscounts.map((disc) => (
              <div key={disc.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-lg">
                    {disc.icono === 'Bus' ? '🚌' : disc.icono === 'Backpack' ? '🎒' : '☕'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {disc.descuento}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-white">{disc.aliado_nombre}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{disc.categoria}</p>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{disc.descripcion}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase">Cupón Activo</p>
                    <code className="text-xs font-mono font-bold text-emerald-400">{disc.codigo_cupon}</code>
                  </div>
                  <span className="text-[10px] text-slate-500">Hasta {disc.valido_hasta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
