import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type {
  AppTab, Role, Language, Place, Raymi, Reservation, ReservationStatus,
  SettlementRecord, ChatMessage, PartnerDiscount, OnboardingPreferences, PlaceReview, DemoPaymentStatus,
} from '../types';
import { translations } from '../i18n/translations';
import { translate, languageMetadata } from '../i18n/ui';
import { INITIAL_PLACES, INITIAL_RAYMIS, INITIAL_CHAT_MESSAGES, INITIAL_PARTNER_DISCOUNTS } from '../data/mockData';
import {
  readStoredValue, writeStoredValue, isRole, isLanguage, isPreferences, isPlaceArray,
  isReservationArray, isString, isStringArray, isRaymiArray, isChatMessageArray, isPlace,
} from '../lib/storage';

export const CURRENT_TRAVELER_EMAIL = 'viajero@chullavida.local';
const DEFAULT_PREFERENCES: OnboardingPreferences = {
  pasiones: ['Aventura', 'Cultura Viva'], presupuesto_max: 300, tipo_gasto: 'equilibrado',
  dias_disponibles: 4, cantidad_personas: 2, region_preferida: 'Todas',
  nivel_aventura: 'Todas', completado: false, origen: 'Cuenca',
};
const isHostRole = (role: Role) => role === 'local' || role === 'gestor';
const defaultTab = (role: Role): AppTab => isHostRole(role) ? 'host' : role === 'gad' || role === 'aliado' ? 'gad' : 'feed';
const uniqueId = (prefix: string) => `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export interface NotificationItem {
  id: string;
  tipo: 'reserva' | 'pago' | 'raymi' | 'chat' | 'qr';
  titulo: string;
  mensaje: string;
  timestamp: string;
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  places: Place[];
  raymis: Raymi[];
  reservations: Reservation[];
  settlements: SettlementRecord[];
  chatMessages: ChatMessage[];
  partnerDiscounts: PartnerDiscount[];
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onboarding: OnboardingPreferences;
  setOnboarding: React.Dispatch<React.SetStateAction<OnboardingPreferences>>;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  bookingPlace: Place | null;
  setBookingPlace: (place: Place | null) => void;
  activeVoucher: Reservation | null;
  setActiveVoucher: (voucher: Reservation | null) => void;
  selectedRaymi: Raymi | null;
  setSelectedRaymi: (raymi: Raymi | null) => void;
  isPhotoModalOpen: boolean;
  setIsPhotoModalOpen: (open: boolean) => void;
  placeForReview: Place | null;
  setPlaceForReview: (place: Place | null) => void;
  savedPlaceIds: string[];
  toggleSavedPlace: (id: string) => void;
  currentBusinessId: string;
  setCurrentBusinessId: (id: string) => void;
  publishExperience: (place: Place) => void;
  updateExperience: (id: string, changes: Partial<Place>) => void;
  cancelReservation: (id: string) => void;
  setReservationStatus: (id: string, status: ReservationStatus) => void;
  createReservationAndPay: (place: Place, date: string, pax: number, extras: { nombre: string; precio: number }[], paymentMethod: 'tarjeta' | 'transferencia' | 'deuna', demoStatus?: DemoPaymentStatus) => Promise<Reservation>;
  completeDemoPayment: (id: string) => boolean;
  validateVoucherQr: (qrOrCode: string) => { success: boolean; message: string; reservation?: Reservation };
  sendChatMessage: (canal: string, mensaje: string) => void;
  submitReviewAndSeals: (placeId: string, review: Omit<PlaceReview, 'id' | 'fecha'>) => void;
  togglePlaceHighlight: (placeId: string) => void;
  addRaymiOfficial: (newRaymi: Omit<Raymi, 'id'>) => void;
  toggleGadCertification: (placeId: string) => void;
  notifications: NotificationItem[];
  dismissNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>(() => readStoredValue('role', 'turista', isRole));
  const [language, setLanguage] = useState<Language>(() => readStoredValue('language', 'es', isLanguage));
  const [places, setPlaces] = useState<Place[]>(() => {
    const saved = readStoredValue('places', INITIAL_PLACES, isPlaceArray);
    const ids = new Set(saved.map(place => place.id));
    return [...saved, ...INITIAL_PLACES.filter(place => !ids.has(place.id))];
  });
  const [raymis, setRaymis] = useState<Raymi[]>(() => readStoredValue('raymis', INITIAL_RAYMIS, isRaymiArray));
  const [reservations, setReservations] = useState<Reservation[]>(() => readStoredValue('reservations', [], isReservationArray));
  // Synchronous actions share the latest list, including repeated clicks before React renders.
  const reservationsRef = useRef(reservations);
  reservationsRef.current = reservations;
  // There is no connected payment processor or bank transfer service in this local prototype.
  const [settlements] = useState<SettlementRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => readStoredValue('chat', INITIAL_CHAT_MESSAGES, isChatMessageArray));
  const [partnerDiscounts] = useState<PartnerDiscount[]>(INITIAL_PARTNER_DISCOUNTS);
  const [activeTab, setActiveTabState] = useState<AppTab>(() => defaultTab(role));
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [onboarding, setOnboardingState] = useState<OnboardingPreferences>(() => readStoredValue('preferences', DEFAULT_PREFERENCES, isPreferences));
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(() => readStoredValue('saved', [], isStringArray));
  const [currentBusinessId, setCurrentBusinessIdState] = useState(() => {
    const stored = readStoredValue('business', 'place-saraguro', isString);
    return places.some(place => place.id === stored) ? stored : places[0]?.id || 'place-saraguro';
  });
  const [isOnboardingOpen, setIsOnboardingOpenState] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [bookingPlace, setBookingPlaceState] = useState<Place | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<Reservation | null>(null);
  const [selectedRaymi, setSelectedRaymi] = useState<Raymi | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [placeForReview, setPlaceForReview] = useState<Place | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => { writeStoredValue('role', role); }, [role]);
  useEffect(() => { writeStoredValue('language', language); if (typeof document !== 'undefined') document.documentElement.lang = languageMetadata[language].tag; }, [language]);
  useEffect(() => { writeStoredValue('places', places); }, [places]);
  useEffect(() => { writeStoredValue('raymis', raymis); }, [raymis]);
  useEffect(() => { writeStoredValue('reservations', reservations); }, [reservations]);
  useEffect(() => { writeStoredValue('chat', chatMessages); }, [chatMessages]);
  useEffect(() => { writeStoredValue('preferences', onboarding); }, [onboarding]);
  useEffect(() => { writeStoredValue('saved', savedPlaceIds); }, [savedPlaceIds]);
  useEffect(() => { writeStoredValue('business', currentBusinessId); }, [currentBusinessId]);

  const t = (key: string, variables?: Record<string, string | number>): string => translate(language, translations.es[key] || key, variables);
  const addNotification = (tipo: NotificationItem['tipo'], titulo: string, mensaje: string) => {
    setNotifications(prev => [{ id: uniqueId('notif'), tipo, titulo, mensaje, timestamp: 'Hace un instante' }, ...prev].slice(0, 30));
  };
  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(item => item.id !== id));

  const setRole = (nextRole: Role) => {
    if (!isRole(nextRole)) return;
    setRoleState(nextRole);
    setActiveTabState(defaultTab(nextRole));
    setIsOnboardingOpenState(false);
    setSelectedPlace(null);
    setBookingPlaceState(null);
    setActiveVoucher(null);
    setSelectedRaymi(null);
    setIsPhotoModalOpen(false);
    setPlaceForReview(null);
    setNotifications([]);
  };
  const setActiveTab = (tab: AppTab) => {
    const allowed: AppTab[] = role === 'turista'
      ? ['feed', 'raymis', 'chat', 'vouchers', 'saved', 'help']
      : isHostRole(role) ? ['host', 'raymis', 'help'] : ['gad', 'raymis', 'help'];
    setActiveTabState(allowed.includes(tab) ? tab : defaultTab(role));
  };
  const setOnboarding: React.Dispatch<React.SetStateAction<OnboardingPreferences>> = update => {
    if (role !== 'turista') return;
    setOnboardingState(previous => {
      const next = typeof update === 'function' ? update(previous) : update;
      return isPreferences(next) ? next : previous;
    });
  };
  const setIsOnboardingOpen = (open: boolean) => { if (!open || role === 'turista') setIsOnboardingOpenState(open); };
  const setBookingPlace = (place: Place | null) => { if (!place || role === 'turista') setBookingPlaceState(place); };
  const toggleSavedPlace = (id: string) => {
    if (role !== 'turista' || !places.some(place => place.id === id)) return;
    setSavedPlaceIds(previous => previous.includes(id) ? previous.filter(saved => saved !== id) : [...previous, id]);
  };
  const setCurrentBusinessId = (id: string) => {
    if (!isHostRole(role) || !places.some(place => place.id === id)) return;
    setCurrentBusinessIdState(id);
  };

  const publishExperience = (place: Place) => {
    if (!isHostRole(role) || !isPlace(place) || places.some(existing => existing.id === place.id)) return;
    setPlaces(previous => [place, ...previous]);
    setCurrentBusinessIdState(place.id);
    addNotification('reserva', 'Experiencia publicada', 'Tu publicación se guardó en este navegador y ya aparece en Explorar.');
  };
  const updateExperience = (id: string, changes: Partial<Place>) => {
    if (!isHostRole(role) || id !== currentBusinessId) return;
    setPlaces(previous => previous.map(place => {
      if (place.id !== id) return place;
      const updated = { ...place, ...changes, id: place.id };
      return isPlace(updated) ? updated : place;
    }));
  };

  // Keep the legacy method name for existing components; this creates a local request, with no charge.
  const createReservationAndPay = async (place: Place, date: string, pax: number, extras: { nombre: string; precio: number }[], paymentMethod: 'tarjeta' | 'transferencia' | 'deuna', demoStatus?: DemoPaymentStatus): Promise<Reservation> => {
    if (role !== 'turista') throw new Error('Cambia al perfil de viajero para solicitar una reserva.');
    if (!['tarjeta', 'transferencia', 'deuna'].includes(paymentMethod)) throw new Error('Elige un método de pago disponible en la demostración.');
    if (demoStatus !== undefined && !['aprobado', 'pendiente'].includes(demoStatus)) throw new Error('El estado del pago de demostración no es válido.');
    const published = places.find(item => item.id === place.id);
    if (!published) throw new Error('Esta experiencia ya no está disponible.');
    if (!Number.isInteger(pax) || pax < 1 || pax > 100 || pax > published.cupos_disponibles_dia) throw new Error('Revisa los cupos disponibles y la cantidad de personas.');
    const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const today = ['year', 'month', 'day'].map(type => dateParts.find(part => part.type === type)?.value).join('-');
    const parsedDate = new Date(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date < today) throw new Error('Elige una fecha válida a partir de hoy.');
    if (!Array.isArray(extras) || extras.some(extra => typeof extra.nombre !== 'string' || !Number.isFinite(extra.precio) || extra.precio < 0)) throw new Error('Revisa los adicionales de tu solicitud.');
    const bookedPax = reservationsRef.current.filter(item => item.lugar_id === place.id && item.fecha_tour === date && item.estado !== 'cancelado').reduce((total, item) => total + item.cantidad_personas, 0);
    if (bookedPax + pax > published.cupos_disponibles_dia) throw new Error('No quedan suficientes cupos para esa fecha.');
    const total = Math.round((published.precio_base_pp + extras.reduce((sum, extra) => sum + extra.precio, 0)) * pax * 100) / 100;
    const code = `CV-${published.slug.slice(0, 3).toUpperCase()}-${uniqueId('r').slice(-8).toUpperCase()}`;
    const communityAmount = Math.round(total * 90) / 100;
    const reservation: Reservation = {
      id: uniqueId('res'), codigo_voucher: code, lugar_id: published.id, lugar_titulo: published.titulo,
      comunidad_nombre: published.comunidad_nombre, turista_nombre: 'Wambra viajero', turista_email: CURRENT_TRAVELER_EMAIL,
      turista_telefono: '', fecha_tour: date, cantidad_personas: pax, precio_total: total,
      monto_comunidad_90: communityAmount, comision_plataforma_10: Math.round((total - communityAmount) * 100) / 100,
      extras_seleccionados: extras.map(extra => ({ ...extra })), estado: 'pendiente', metodo_pago: paymentMethod,
      qr_data: `CHULLA-VIDA|${code}|PENDING|${published.id}|${pax}|${date}`, pagado_en: '',
      notificacion_whatsapp_enviada: false, telefono_notificado: '',
      ...(demoStatus === undefined ? {} : { pago_demo: {
        estado: demoStatus, referencia: uniqueId('DEMO').toUpperCase(), creado_en: new Date().toISOString(),
      } }),
    };
    reservationsRef.current = [reservation, ...reservationsRef.current];
    setReservations(reservationsRef.current);
    addNotification('reserva', 'Solicitud guardada', 'La solicitud se guardó en este navegador. No se ha cobrado dinero ni enviado un mensaje al anfitrión.');
    return reservation;
  };

  const completeDemoPayment = (id: string): boolean => {
    if (role !== 'turista') return false;
    const reservation = reservationsRef.current.find(item => item.id === id);
    if (!reservation || reservation.turista_email !== CURRENT_TRAVELER_EMAIL
      || !['pendiente', 'confirmado'].includes(reservation.estado) || reservation.pago_demo?.estado !== 'pendiente') return false;
    const updated: Reservation = { ...reservation, pago_demo: { ...reservation.pago_demo, estado: 'aprobado' } };
    reservationsRef.current = reservationsRef.current.map(item => item.id === id ? updated : item);
    setReservations(reservationsRef.current);
    setActiveVoucher(previous => previous?.id === id ? updated : previous);
    addNotification('pago', 'Simulación completada', 'El pago de prueba quedó aprobado. No se cobró dinero; el negocio debe confirmar la solicitud.');
    return true;
  };

  const cancelReservation = (id: string) => {
    const reservation = reservationsRef.current.find(item => item.id === id);
    if (!reservation || !['pendiente', 'confirmado'].includes(reservation.estado)) return;
    const owns = role === 'turista' ? reservation.turista_email === CURRENT_TRAVELER_EMAIL : isHostRole(role) && reservation.lugar_id === currentBusinessId;
    if (!owns) return;
    reservationsRef.current = reservationsRef.current.map(item => item.id === id ? { ...item, estado: 'cancelado' } : item);
    setReservations(reservationsRef.current);
    setActiveVoucher(previous => previous?.id === id ? { ...previous, estado: 'cancelado' } : previous);
    addNotification('reserva', 'Solicitud cancelada', 'El cambio quedó guardado en este navegador.');
  };

  const setReservationStatus = (id: string, status: ReservationStatus) => {
    if (!isHostRole(role)) return;
    const reservation = reservationsRef.current.find(item => item.id === id && item.lugar_id === currentBusinessId);
    if (!reservation) return;
    const transitions: Record<ReservationStatus, ReservationStatus[]> = {
      pendiente: ['confirmado', 'cancelado'], confirmado: ['completado', 'cancelado'],
      pagado: ['validado_en_sitio'], validado_en_sitio: ['completado'],
      liquidado_al_local: ['completado'], completado: [], cancelado: [],
    };
    if (!transitions[reservation.estado].includes(status)) return;
    reservationsRef.current = reservationsRef.current.map(item => item.id === id ? { ...item, estado: status, ...(status === 'validado_en_sitio' ? { validado_en: new Date().toISOString() } : {}) } : item);
    setReservations(reservationsRef.current);
    addNotification('reserva', 'Solicitud actualizada', 'El estado se actualizó en la demostración local. No se registró ningún pago.');
  };

  const validateVoucherQr = (qrOrCode: string): { success: boolean; message: string; reservation?: Reservation } => {
    if (!isHostRole(role)) return { success: false, message: 'La validación pertenece al perfil de negocio.' };
    const input = qrOrCode.trim().toUpperCase();
    const parts = input.split('|');
    const fullPayload = parts.length > 1;
    if (!input || (fullPayload && !['CHULLA-VIDA', 'GUAMBRA-VERIFIED'].includes(parts[0]))) return { success: false, message: 'Introduce el código completo o un QR de CHULLA VIDA.' };
    const code = fullPayload ? parts[1] : input;
    const reservation = reservationsRef.current.find(item => item.codigo_voucher.toUpperCase() === code && item.lugar_id === currentBusinessId);
    if (!reservation || (fullPayload && reservation.qr_data.toUpperCase() !== input)) return { success: false, message: 'No encontramos ese código en las reservas de este negocio.' };
    if (reservation.estado === 'validado_en_sitio') return { success: false, message: 'Este código ya fue utilizado.', reservation };
    const demoArrival = reservation.estado === 'confirmado' && reservation.pago_demo?.estado === 'aprobado';
    if (reservation.estado !== 'pagado' && !demoArrival) return { success: false, message: 'La solicitud no tiene un pago registrado y no habilita un canje.', reservation };
    const ecuadorToday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (demoArrival && reservation.fecha_tour > ecuadorToday) return { success: false, message: 'La llegada de prueba se registra a partir de la fecha de la visita.', reservation };
    const updated: Reservation = { ...reservation, estado: 'validado_en_sitio', validado_en: new Date().toISOString() };
    reservationsRef.current = reservationsRef.current.map(item => item.id === updated.id ? updated : item);
    setReservations(reservationsRef.current);
    addNotification('qr', 'Código validado', `${updated.codigo_voucher}: llegada registrada en este navegador.`);
    return { success: true, message: `${demoArrival ? 'Demostración · ' : ''}Llegada registrada para ${updated.cantidad_personas} personas.`, reservation: updated };
  };

  const sendChatMessage = (canal: string, mensaje: string) => {
    if (role !== 'turista' || !mensaje.trim()) return;
    setChatMessages(previous => [...previous, {
      id: uniqueId('msg'), canal, usuario_id: 'user-current', usuario_nombre: 'Wambra viajero', avatar_url: '',
      origen: onboarding.origen || 'Ecuador', mensaje: mensaje.trim().slice(0, 2000), timestamp: 'Ahora · local',
    }]);
  };
  const submitReviewAndSeals = (placeId: string, reviewData: Omit<PlaceReview, 'id' | 'fecha'>) => {
    if (role !== 'turista' || !reservations.some(item => item.lugar_id === placeId && item.turista_email === CURRENT_TRAVELER_EMAIL && ['completado', 'validado_en_sitio'].includes(item.estado))) return;
    const review: PlaceReview = { ...reviewData, usuario_nombre: 'Wambra viajero', id: uniqueId('rev'), fecha: new Date().toISOString().slice(0, 10) };
    setPlaces(previous => previous.map(place => place.id !== placeId ? place : {
      ...place, reviews: [review, ...place.reviews], sellos: {
        ...place.sellos, bueno: place.sellos.bueno + Number(review.sellos_otorgados.bueno),
        bonito: place.sellos.bonito + Number(review.sellos_otorgados.bonito), barato: place.sellos.barato + Number(review.sellos_otorgados.barato),
        seguro: review.sellos_otorgados.seguro || place.sellos.seguro, votos_totales: place.sellos.votos_totales + 1,
      },
    }));
    addNotification('reserva', 'Reseña guardada', 'Tu valoración quedó guardada en este navegador.');
  };
  const togglePlaceHighlight = (placeId: string) => {
    if (!isHostRole(role) || placeId !== currentBusinessId) return;
    setPlaces(previous => previous.map(place => place.id === placeId ? { ...place, es_destacado: !place.es_destacado, etiqueta_plan_pagado: !place.es_destacado ? 'Destacado · demostración' : undefined } : place));
  };
  const addRaymiOfficial = (newRaymi: Omit<Raymi, 'id'>) => {
    if (role !== 'gad') return;
    setRaymis(previous => [{ ...newRaymi, id: uniqueId('raymi') }, ...previous]);
    addNotification('raymi', 'Evento guardado', 'El evento quedó registrado en el calendario de este navegador.');
  };
  const toggleGadCertification = (placeId: string) => {
    if (role !== 'gad') return;
    setPlaces(previous => previous.map(place => place.id === placeId ? { ...place, sellos: { ...place.sellos, verificado_gad: !place.sellos.verificado_gad } } : place));
  };

  return <AppContext.Provider value={{
    role, setRole, language, setLanguage, t, places, raymis, reservations, settlements, chatMessages, partnerDiscounts,
    activeTab, setActiveTab, selectedRegion, setSelectedRegion, searchQuery, setSearchQuery, onboarding, setOnboarding,
    isOnboardingOpen, setIsOnboardingOpen, selectedPlace, setSelectedPlace, bookingPlace, setBookingPlace,
    activeVoucher, setActiveVoucher, selectedRaymi, setSelectedRaymi, isPhotoModalOpen, setIsPhotoModalOpen,
    placeForReview, setPlaceForReview, savedPlaceIds, toggleSavedPlace, currentBusinessId, setCurrentBusinessId,
    publishExperience, updateExperience, cancelReservation, setReservationStatus, createReservationAndPay, completeDemoPayment,
    validateVoucherQr, sendChatMessage, submitReviewAndSeals, togglePlaceHighlight, addRaymiOfficial,
    toggleGadCertification, notifications, dismissNotification,
  }}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
