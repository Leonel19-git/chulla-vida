import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import QRCode from 'qrcode';
import { 
  X, 
  QrCode as QrIcon, 
  Download, 
  CheckCircle2, 
  Calendar, 
  Users, 
  MapPin, 
  ShieldCheck, 
  WifiOff, 
  Share2, 
  Printer,
  Sparkles
} from 'lucide-react';

export const VoucherModal: React.FC = () => {
  const { activeVoucher, setActiveVoucher, t } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const voucherCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeVoucher) {
      QRCode.toDataURL(activeVoucher.qr_data || activeVoucher.codigo_voucher, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
    }
  }, [activeVoucher]);

  if (!activeVoucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `VOUCHER-${activeVoucher.codigo_voucher}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Ribbon */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500"></div>

        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-white">
                {t('voucher_title')}
              </h2>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                <span>{t('voucher_subtitle')}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveVoucher(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Body */}
        <div className="p-6 overflow-y-auto space-y-4" ref={voucherCardRef}>
          
          {/* Main Ticket Card with Andean Border */}
          <div className="relative bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border-4 border-amber-500/30 overflow-hidden">
            
            {/* Top Cutout Circles (Ticket style) */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600"></div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                  CHULLA VIDA • PASAPORTE SOSTENIBLE
                </span>
                <p className="text-xs text-slate-500">Turismo Comunitario de Ecuador</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                PAGADO 100%
              </span>
            </div>

            {/* Prominent Zero Payment Notice */}
            <div className="my-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-xs font-black text-emerald-900 tracking-wide">
                {t('voucher_paid_badge')}
              </p>
              <p className="text-[10px] text-emerald-700">
                El anfitrión ya recibió la liquidación. Al llegar solo muestra este QR.
              </p>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center my-4 py-2">
              {qrDataUrl ? (
                <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-inner">
                  <img src={qrDataUrl} alt="Voucher QR Code" className="w-44 h-44 object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-slate-100 flex items-center justify-center rounded-2xl">
                  <QrIcon className="w-12 h-12 text-slate-400 animate-pulse" />
                </div>
              )}

              {/* Unique Voucher Code */}
              <div className="mt-2 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Código de Validación</span>
                <p className="font-mono text-lg font-black text-slate-950 tracking-wider">
                  {activeVoucher.codigo_voucher}
                </p>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="space-y-2 border-t border-dashed border-slate-300 pt-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Experiencia / Destino</p>
                <p className="font-extrabold text-slate-900 text-sm leading-snug">
                  {activeVoucher.lugar_titulo}
                </p>
                <p className="text-[11px] text-orange-600 font-semibold">
                  {activeVoucher.comunidad_nombre}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Titular</p>
                  <p className="font-bold text-slate-800 truncate">{activeVoucher.turista_nombre}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Fecha del Tour</p>
                  <p className="font-bold text-slate-800">{activeVoucher.fecha_tour}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Cantidad de Wambras</p>
                  <p className="font-bold text-slate-800">{activeVoucher.cantidad_personas} persona(s)</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Total Pagado en App</p>
                  <p className="font-extrabold text-emerald-700">${activeVoucher.precio_total.toFixed(2)} USD</p>
                </div>
              </div>
            </div>

            {/* Offline instructions footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <p className="text-[10px] text-slate-500 italic">
                * Propinas voluntarias y artesanías se abonan en efectivo si deseas apoyar a las familias.
              </p>
            </div>
          </div>

          {/* Low-tech notification log confirmation */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <span className="text-emerald-400">📱</span>
            <div className="flex-1">
              <p className="font-bold text-white">Notificación Comunitaria Despachada:</p>
              <p className="text-slate-400 mt-0.5">
                Se envió aviso automático por WhatsApp al número del cabildo ({activeVoucher.telefono_notificado}) confirmando tu grupo y el monto acreditado de ${activeVoucher.monto_comunidad_90.toFixed(2)} USD.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t('voucher_offline_btn')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
