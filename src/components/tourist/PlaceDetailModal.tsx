import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AndeanSealBadge } from '../common/AndeanSealBadge';
import { 
  X, 
  MapPin, 
  Clock, 
  Users, 
  Check, 
  AlertCircle, 
  Leaf, 
  HelpCircle, 
  Phone, 
  MessageCircle, 
  Camera, 
  ArrowRight,
  ShieldCheck,
  Award,
  ChevronDown,
  Sparkles,
  CloudSun,
  Mountain
} from 'lucide-react';

export const PlaceDetailModal: React.FC = () => {
  const { 
    selectedPlace, 
    setSelectedPlace, 
    setBookingPlace, 
    setIsPhotoModalOpen, 
    setPlaceForReview,
    onboarding,
    t 
  } = useApp();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  if (!selectedPlace) return null;

  const paxCount = onboarding.cantidad_personas || 2;
  const totalPrice = selectedPlace.precio_base_pp * paxCount;

  const handleOpenPhotoUpload = () => {
    setPlaceForReview(selectedPlace);
    setIsPhotoModalOpen(true);
  };

  const handleBookNow = () => {
    setBookingPlace(selectedPlace);
    setSelectedPlace(null);
  };

  // Pre-filled WhatsApp message for low-tech communities
  const whatsappMsg = encodeURIComponent(
    `¡Hola cabildo de ${selectedPlace.comunidad_nombre}! Les escribo desde la app Wambra. Quisiera consultar sobre la experiencia "${selectedPlace.titulo}" para ${paxCount} personas. ¡Allillachu!`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header with Close */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              {selectedPlace.region} • {selectedPlace.provincia}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {selectedPlace.canton_parroquia}
            </span>
          </div>

          <button
            onClick={() => setSelectedPlace(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          
          {/* Gallery Carousel Header */}
          <div className="space-y-3">
            <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden shadow-xl bg-slate-950">
              <img
                src={selectedPlace.imagenes[activeImageIdx]}
                alt={selectedPlace.titulo}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>

              {/* Title & Community Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 drop-shadow">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span>{selectedPlace.comunidad_nombre}</span>
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight">
                  {selectedPlace.titulo}
                </h2>
              </div>
            </div>

            {/* Thumbnail Selectors */}
            {selectedPlace.imagenes.length > 1 && (
              <div className="flex gap-2">
                {selectedPlace.imagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`h-16 w-24 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIdx === idx ? 'border-amber-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar: Clima, Altitud, Mejor Época, Sellos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Clima Habitual</p>
                <p className="font-bold text-xs text-white">{selectedPlace.clima}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mountain className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Altitud</p>
                <p className="font-bold text-xs text-white">{selectedPlace.altitud}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Duración Recomendada</p>
                <p className="font-bold text-xs text-white">{selectedPlace.duracion_dias} {t('feed_days')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">Cupos Diarios</p>
                <p className="font-bold text-xs text-white">{selectedPlace.cupos_disponibles_dia} personas máx</p>
              </div>
            </div>
          </div>

          {/* Andean 3B + S Seal System Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {t('seal_3b_s_title')}
              </span>
              <AndeanSealBadge sellos={selectedPlace.sellos} size="md" showDetails />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('seal_no_buy_notice')}
            </p>
          </div>

          {/* Historia Ancestral & Datos Curiosos */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📜 {t('place_history_title')}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {selectedPlace.historia_ancestral}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <p className="text-xs font-bold text-amber-400">{t('place_curiosities_title')}:</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {selectedPlace.datos_curiosos.map((dato, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">✦</span>
                    <span>{dato}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* QUÉ INCLUYE VS QUÉ NO INCLUYE (CERO PAGOS EN SITIO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Qué Incluye ($0 en sitio) */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                <Check className="w-4 h-4 text-emerald-300" />
                <span>{t('place_includes_title')}</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 font-medium">
                {t('place_includes_note')}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-200 mt-2">
                {selectedPlace.que_incluye.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Qué NO Incluye (Opcionales en efectivo) */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>{t('place_excludes_title')}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('place_excludes_note')}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 mt-2">
                {selectedPlace.que_no_incluye.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Recomendaciones Ecológicas (Sumak Kawsay) */}
          <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 space-y-2">
            <h4 className="text-xs font-bold text-teal-300 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-teal-400" />
              <span>{t('place_eco_title')}</span>
            </h4>
            <ul className="space-y-1 text-xs text-slate-300">
              {selectedPlace.recomendaciones_eco.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400">🌱</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto Directo con Comunidades (Baja Conectividad / WhatsApp directo) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400" />
                <span>{t('place_contact_community_title')}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Para respetar la brecha digital rural, no usamos chats en vivo con la comunidad. Coordina directamente por WhatsApp o llamada con su cabildo:
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href={`https://wa.me/${selectedPlace.contacto_whatsapp.replace('+', '')}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('place_whatsapp_btn')}</span>
              </a>

              <a
                href={`tel:${selectedPlace.telefono_llamadas}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{t('place_call_btn')}</span>
              </a>
            </div>

            {/* FAQs Accordion */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                {t('place_faq_title')}
              </p>
              
              <div className="space-y-1.5">
                {selectedPlace.preguntas_frecuentes.map((faq, idx) => (
                  <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                      className="w-full p-2.5 text-left text-xs font-semibold text-slate-200 hover:bg-slate-900 flex items-center justify-between"
                    >
                      <span>{faq.pregunta}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openFaqIdx === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaqIdx === idx && (
                      <div className="p-2.5 pt-0 text-[11px] text-slate-400 bg-slate-900/50">
                        {faq.respuesta}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Testimonios y Fotos de Turistas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {t('place_reviews_title')}
              </h4>
              <button
                onClick={handleOpenPhotoUpload}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{t('place_upload_photo_btn')}</span>
              </button>
            </div>

            {selectedPlace.reviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Sé el primer guambra en visitar este lugar, subir tu foto y votar los sellos 3B+S.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPlace.reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={rev.avatar_url} alt={rev.usuario_nombre} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-xs text-white">{rev.usuario_nombre}</p>
                        <p className="text-[10px] text-slate-400">{rev.fecha}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{rev.comentario}</p>
                    {rev.foto_url && (
                      <img src={rev.foto_url} alt="visita" className="w-full h-32 rounded-xl object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Sticky Bottom Action: Pricing & Booking Trigger */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-400">${selectedPlace.precio_base_pp}</span>
              <span className="text-xs text-slate-400 font-medium">USD {t('feed_per_person')}</span>
              <span className="text-xs text-slate-500 ml-2">(${totalPrice} USD total para {paxCount} panas)</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium">
              ✓ Cero pagos en sitio. 90% liquidado directo a la comunidad.
            </p>
          </div>

          <button
            onClick={handleBookNow}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:opacity-95 text-white shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2"
          >
            <span>{t('feed_btn_book_route')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
