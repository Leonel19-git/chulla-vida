import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';
import { 
  X, 
  Calendar, 
  Users, 
  Plus, 
  Minus, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Loader2
} from 'lucide-react';

export const RouteBookingModal: React.FC = () => {
  const { 
    bookingPlace, 
    setBookingPlace, 
    createReservationAndPay, 
    setActiveVoucher,
    onboarding,
    t 
  } = useApp();

  const [tourDate, setTourDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [pax, setPax] = useState<number>(onboarding.cantidad_personas || 2);
  const [selectedExtras, setSelectedExtras] = useState<{ nombre: string; precio: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'transferencia' | 'deuna'>('tarjeta');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);

  if (!bookingPlace) return null;

  // Available optional sustainable eco-addons
  const EXTRA_OPTIONS = [
    { nombre: 'Alquiler de bastones de bambú y poncho impermeable', precio: 5 },
    { nombre: 'Taller adicional de cocina ancestral y degustación', precio: 10 },
    { nombre: 'Aporte voluntario al Fondo Comunal de Reforestación', precio: 3 }
  ];

  const toggleExtra = (extra: { nombre: string; precio: number }) => {
    setSelectedExtras(prev => 
      prev.some(e => e.nombre === extra.nombre)
        ? prev.filter(e => e.nombre !== extra.nombre)
        : [...prev, extra]
    );
  };

  const basePricePerPerson = bookingPlace.precio_base_pp;
  const subtotalBase = basePricePerPerson * pax;
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + (e.precio * pax), 0);
  const totalAmount = subtotalBase + extrasTotal;

  // 90% direct to rural host community / 10% platform operations fee
  const communityPayout90 = parseFloat((totalAmount * 0.90).toFixed(2));
  const platformFee10 = parseFloat((totalAmount * 0.10).toFixed(2));

  const handlePayAndConfirm = async () => {
    if (!acceptedTerms) {
      alert('Por favor confirma la política de cancelación y respeto comunitario.');
      return;
    }

    setIsProcessing(true);

    // Simulate payment gateway delay (1.4s)
    setTimeout(async () => {
      const confirmedRes = await createReservationAndPay(
        bookingPlace,
        tourDate,
        pax,
        selectedExtras,
        paymentMethod
      );

      setIsProcessing(false);
      setBookingPlace(null);

      // Trigger festive celebration confetti
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error(e);
      }

      // Automatically open the offline-ready QR voucher
      setActiveVoucher(confirmedRes);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-600 via-red-600 to-indigo-600"></div>

        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{t('book_modal_title')}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">
              {bookingPlace.titulo} • {bookingPlace.comunidad_nombre}
            </p>
          </div>

          <button
            onClick={() => setBookingPlace(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          
          {/* Step 1: Date & Pax Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{t('book_date_label')}</span>
              </label>
              <input
                type="date"
                value={tourDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTourDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:border-amber-400 outline-none"
              />
            </div>

            {/* Wambras / Pax Counter */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-400" />
                <span>{t('book_pax_label')}</span>
              </label>
              
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPax(Math.max(1, pax - 1))}
                  className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                  disabled={pax <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <span className="text-base font-black text-amber-400">{pax}</span>
                  <span className="text-[10px] text-slate-400 ml-1">guambra(s)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPax(Math.min(10, pax + 1))}
                  className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Eco-Addons */}
          <div className="space-y-2">
            <label className="font-bold text-slate-300 block">
              {t('book_extras_label')}:
            </label>
            <div className="space-y-2">
              {EXTRA_OPTIONS.map((extra, idx) => {
                const isSelected = selectedExtras.some(e => e.nombre === extra.nombre);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleExtra(extra)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-400 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-600'
                      }`}>
                        {isSelected && <span className="text-[10px] font-black">✓</span>}
                      </div>
                      <span className="text-xs">{extra.nombre}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-400">+${extra.precio * pax} USD</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transparent Price Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <p className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center justify-between">
              <span>{t('book_price_breakdown')}</span>
              <span className="text-emerald-400 font-bold lowercase text-[11px]">cero sorpresas</span>
            </p>

            <div className="space-y-1.5 text-xs text-slate-300 pt-1">
              <div className="flex justify-between">
                <span>Tarifa Base ({pax} personas × ${basePricePerPerson}):</span>
                <span className="font-semibold text-white">${subtotalBase.toFixed(2)} USD</span>
              </div>

              {extrasTotal > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Experiencias Extra Sostenibles:</span>
                  <span>+${extrasTotal.toFixed(2)} USD</span>
                </div>
              )}

              <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <span>•</span>
                  <span>{t('book_community_share')}</span>
                </span>
                <span className="font-bold">${communityPayout90.toFixed(2)} USD</span>
              </div>

              <div className="flex justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <span>•</span>
                  <span>{t('book_platform_fee')}</span>
                </span>
                <span>${platformFee10.toFixed(2)} USD</span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-700">
                <span>{t('book_total_to_pay')}:</span>
                <span className="text-amber-400">${totalAmount.toFixed(2)} USD</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector (Simulated) */}
          <div className="space-y-2">
            <label className="font-bold text-slate-300 block">
              {t('book_simulated_payment_title')}:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('tarjeta')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  paymentMethod === 'tarjeta'
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold">{t('book_payment_card')}</span>
                <span className="text-[9px] text-slate-500">Visa / Mastercard / Diners</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transferencia')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  paymentMethod === 'transferencia'
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold">{t('book_payment_transfer')}</span>
                <span className="text-[9px] text-slate-500">Pichincha / JEP / Produbanco</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('deuna')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  paymentMethod === 'deuna'
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">{t('book_payment_deuna')}</span>
                <span className="text-[9px] text-slate-500">Pago móvil directo sin costo</span>
              </button>
            </div>
          </div>

          {/* Cancellation Policy & Community Agreement */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
              />
              <label htmlFor="terms" className="text-xs text-slate-300 leading-snug cursor-pointer">
                <strong className="text-white">Política de cancelación transparente:</strong>{' '}
                {t('book_cancellation_policy')} Acepto respetar los protocolos comunitarios y el manual de respeto cultural.
              </label>
            </div>
            <p className="text-[10px] text-emerald-400 font-semibold pl-6">
              🛡️ Cero pagos en el tour. Al llegar solo muestras tu Voucher QR sin internet.
            </p>
          </div>

        </div>

        {/* Modal Bottom Action: Confirm & Pay */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setBookingPlace(null)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            disabled={isProcessing}
          >
            {t('close')}
          </button>

          <button
            type="button"
            onClick={handlePayAndConfirm}
            disabled={isProcessing}
            className="flex-1 sm:flex-none px-7 py-3 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:opacity-95 text-white shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t('book_processing')}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-yellow-300" />
                <span>{t('book_pay_now_btn')} (${totalAmount.toFixed(2)} USD)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
