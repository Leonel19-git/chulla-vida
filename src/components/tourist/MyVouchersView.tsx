import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  QrCode, 
  CheckCircle2, 
  Calendar, 
  Users, 
  MapPin, 
  WifiOff, 
  ArrowRight,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';

export const MyVouchersView: React.FC = () => {
  const { reservations, setActiveVoucher, setActiveTab, t } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <QrCode className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {t('nav_my_vouchers')}
              </h1>
              <p className="text-xs text-slate-400">
                Tus pasaportes de viaje comunitarios válidos sin conexión a internet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Funciona sin internet</span>
            </span>
          </div>
        </div>
      </div>

      {/* Vouchers List */}
      <div className="space-y-3.5">
        {reservations.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <FileCheck2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Aún no tienes vouchers de viaje</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Explora las rutas en el tablero y reserva tu próxima aventura sostenible con $0 pagos en sitio.
            </p>
            <button
              onClick={() => setActiveTab('feed')}
              className="mt-4 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg"
            >
              Explorar Rutas en el Tablero
            </button>
          </div>
        ) : (
          reservations.map((res) => (
            <div
              key={res.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {res.codigo_voucher}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    res.estado === 'validado_en_sitio'
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30'
                      : res.estado === 'liquidado_al_local'
                      ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {res.estado === 'validado_en_sitio'
                      ? 'Validado en Sitio'
                      : res.estado === 'liquidado_al_local'
                      ? 'Liquidado y Completado'
                      : 'Pagado 100% • Listo para el Tour'}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-white leading-snug">
                  {res.lugar_titulo}
                </h3>
                <p className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{res.comunidad_nombre}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {res.fecha_tour}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {res.cantidad_personas} persona(s)
                  </span>
                  <span>•</span>
                  <span className="font-bold text-emerald-400">
                    ${res.precio_total.toFixed(2)} USD (Cubierto)
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center gap-2">
                <button
                  onClick={() => setActiveVoucher(res)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white shadow-lg flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ver Voucher QR</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
