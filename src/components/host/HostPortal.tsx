import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, CalendarDays, Check, CheckCheck, ChevronRight,
  CircleHelp, ClipboardList, Clock3, ImagePlus, MapPin, Pencil, Plus,
  Settings2, Store, Users, X, CreditCard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { languageMetadata } from '../../i18n/ui';
import type { AdventureLevel, Place, Region, Reservation, ReservationStatus } from '../../types';
import './host.css';
import { BusinessWallet } from './BusinessWallet';
import { walletText } from '../../i18n/wallet';

type Section = 'overview' | 'experiences' | 'requests' | 'business' | 'wallet';
type RequestFilter = 'all' | 'pendiente' | 'confirmado' | 'cancelado';
type ExperienceDraft = {
  title: string; community: string; region: Region; province: string; location: string;
  description: string; price: string; days: string; capacity: string;
  adventure: AdventureLevel; photo: string; included: string; phone: string;
};

const currency = (value: number) => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value);

const statusLabels: Record<ReservationStatus, string> = {
  pendiente: 'Por responder', confirmado: 'Confirmada', cancelado: 'Cancelada',
  pagado: 'Pagada', validado_en_sitio: 'Visita registrada',
  liquidado_al_local: 'Liquidada', completado: 'Completada',
};

const fallbackImage = (region?: Region) => region === 'Costa' || region === 'Galápagos'
  ? '/images/coast.jpg' : region === 'Amazonía' ? '/images/forest.jpg' : '/images/quilotoa.jpg';

function imageFallback(event: React.SyntheticEvent<HTMLImageElement>, region?: Region) {
  const fallback = fallbackImage(region);
  if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
}

function draftFor(place?: Place): ExperienceDraft {
  return {
    title: place?.titulo ?? '', community: place?.comunidad_nombre ?? '',
    region: place?.region ?? 'Sierra', province: place?.provincia ?? '',
    location: place?.canton_parroquia ?? '', description: place?.descripcion_corta ?? '',
    price: String(place?.precio_base_pp ?? 25), days: String(place?.duracion_dias ?? 1),
    capacity: String(place?.cupos_disponibles_dia ?? 8), adventure: place?.nivel_aventura ?? 'Tranqui',
    photo: place?.imagenes[0] ?? '', included: place?.que_incluye.join('\n') ?? '',
    phone: place?.contacto_whatsapp ?? '',
  };
}

function formatDate(value: string, locale = 'es-EC') {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value || 'Fecha por acordar';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day, 12));
}

function ExperienceForm({ place, onSave, onCancel }: {
  place?: Place; onSave: (draft: ExperienceDraft) => void; onCancel: () => void;
}) {
  const { t } = useApp();
  const [draft, setDraft] = useState(() => draftFor(place));
  const [error, setError] = useState('');
  const field = <K extends keyof ExperienceDraft>(key: K, value: ExperienceDraft[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setError('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (![draft.title, draft.community, draft.province, draft.location, draft.description, draft.included].every(value => value.trim())) {
      setError('Completa los campos obligatorios e indica qué incluye la experiencia.'); return;
    }
    if (draft.photo.trim() && !/^https?:\/\//i.test(draft.photo.trim()) && !/^\/(?!\/)/.test(draft.photo.trim())) {
      setError('Usa una dirección de foto que empiece con https:// o deja el campo vacío.'); return;
    }
    if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0 || Number(draft.price) > 10000 || !Number.isInteger(Number(draft.days)) || Number(draft.days) < 1 || Number(draft.days) > 14 || !Number.isInteger(Number(draft.capacity)) || Number(draft.capacity) < 1 || Number(draft.capacity) > 99) {
      setError('Revisa el precio, la duración (1–14 días) y los cupos (1–99 personas).'); return;
    }
    onSave(draft);
  };

  return (
    <form className="host-editor" onSubmit={submit}>
      <div className="host-section-heading">
        <div><h2>{t(place ? 'Editar experiencia' : 'Publica una nueva experiencia')}</h2><p>{t("Cuenta qué hace especial a tu lugar y qué recibirá cada visitante.")}</p></div>
        <button type="button" className="icon-button" onClick={onCancel} aria-label={t("Cerrar formulario")}><X size={20} /></button>
      </div>
      <div className="host-form-grid">
        <label className="host-field host-span-full"><span className="field-label">{t("Nombre de la experiencia *")}</span><input className="field" required maxLength={120} value={draft.title} onChange={event => field('title', event.target.value)} placeholder={t("Ej. Un día entre tejidos y sabores de Saraguro")} /></label>
        <label className="host-field host-span-full"><span className="field-label">{t("Negocio o comunidad anfitriona *")}</span><input className="field" required maxLength={120} value={draft.community} onChange={event => field('community', event.target.value)} /></label>
        <label className="host-field"><span className="field-label">{t("Región *")}</span><select className="field" value={draft.region} onChange={event => field('region', event.target.value as Region)}>{(['Sierra', 'Costa', 'Amazonía', 'Galápagos'] as Region[]).map(region => <option key={region} value={region}>{t(region)}</option>)}</select></label>
        <label className="host-field"><span className="field-label">{t("Provincia *")}</span><input className="field" required maxLength={80} value={draft.province} onChange={event => field('province', event.target.value)} /></label>
        <label className="host-field host-span-full"><span className="field-label">{t("Cantón, parroquia o punto de encuentro *")}</span><input className="field" required maxLength={160} value={draft.location} onChange={event => field('location', event.target.value)} /></label>
        <label className="host-field host-span-full"><span className="field-label">{t("Descripción *")}</span><textarea className="field" required rows={4} maxLength={1200} value={draft.description} onChange={event => field('description', event.target.value)} placeholder={t("Describe las actividades, el entorno y a quién le gustaría esta experiencia.")} /><span className="host-field-hint">{t("Escribe información que puedas ofrecer y confirmar.")}</span></label>
        <label className="host-field"><span className="field-label">{t("Precio por persona · USD *")}</span><input className="field" type="number" required min="0" max="10000" step="0.01" value={draft.price} onChange={event => field('price', event.target.value)} /></label>
        <label className="host-field"><span className="field-label">{t("Duración en días *")}</span><input className="field" type="number" required min="1" max="14" step="1" value={draft.days} onChange={event => field('days', event.target.value)} /></label>
        <label className="host-field"><span className="field-label">{t("Cupos máximos por día *")}</span><input className="field" type="number" required min="1" max="99" step="1" value={draft.capacity} onChange={event => field('capacity', event.target.value)} /></label>
        <label className="host-field"><span className="field-label">{t("Nivel de aventura *")}</span><select className="field" value={draft.adventure} onChange={event => field('adventure', event.target.value as AdventureLevel)}><option value="Tranqui">{t("Suave · caminatas tranquilas")}</option><option value="Moderado">{t("Media · actividad moderada")}</option><option value="Adrenalina">{t("Intensa · mayor esfuerzo físico")}</option></select></label>
        <label className="host-field host-span-full"><span className="field-label">{t("¿Qué incluye? *")}</span><textarea className="field" required rows={3} maxLength={1500} value={draft.included} onChange={event => field('included', event.target.value)} placeholder={'Escribe un servicio por línea.\nEj. Taller de tejido de dos horas\nAlmuerzo preparado por el negocio'} /></label>
        <label className="host-field host-span-full"><span className="field-label">{t("Foto de portada · URL opcional")}</span><input className="field" value={draft.photo} maxLength={2000} onChange={event => field('photo', event.target.value)} placeholder="https://…" /><span className="host-field-hint">{t("Si la dejas vacía, usaremos una fotografía de referencia de la región.")}</span></label>
        <label className="host-field host-span-full"><span className="field-label">{t("WhatsApp de contacto · opcional")}</span><input className="field" type="tel" value={draft.phone} maxLength={30} onChange={event => field('phone', event.target.value)} placeholder="+593…" /></label>
      </div>
      {error && <p className="host-form-error" role="alert">{t(error)}</p>}
      <div className="host-form-footer"><p>{t("Los cambios se guardan en este navegador.")}</p><div><button type="button" className="button button-secondary" onClick={onCancel}>{t("Cancelar")}</button><button type="submit" className="button button-primary"><Check size={17} />{t(place ? 'Guardar cambios' : 'Publicar experiencia')}</button></div></div>
    </form>
  );
}

function BusinessForm({ place, onSave }: { place: Place; onSave: (changes: Partial<Place>) => void }) {
  const { t } = useApp();
  const [community, setCommunity] = useState(place.comunidad_nombre);
  const [phone, setPhone] = useState(place.contacto_whatsapp);
  const [telephone, setTelephone] = useState(place.telefono_llamadas);
  const [location, setLocation] = useState(place.canton_parroquia);
  const [error, setError] = useState('');
  return (
    <form className="host-business-form" onSubmit={event => {
      event.preventDefault();
      if (!community.trim() || !location.trim()) { setError('Escribe el nombre del negocio y su ubicación.'); return; }
      onSave({ comunidad_nombre: community.trim(), contacto_whatsapp: phone.trim(), telefono_llamadas: telephone.trim(), canton_parroquia: location.trim() });
      setError('');
    }}>
      <div className="host-form-grid">
        <label className="host-field host-span-full"><span className="field-label">{t("Nombre del negocio o comunidad *")}</span><input className="field" required maxLength={120} value={community} onChange={event => setCommunity(event.target.value)} /></label>
        <label className="host-field host-span-full"><span className="field-label">{t("Ubicación y punto de encuentro *")}</span><input className="field" required maxLength={160} value={location} onChange={event => setLocation(event.target.value)} /></label>
        <label className="host-field"><span className="field-label">{t("WhatsApp de contacto")}</span><input className="field" type="tel" maxLength={30} value={phone} placeholder="+593…" onChange={event => setPhone(event.target.value)} /></label>
        <label className="host-field"><span className="field-label">{t("Teléfono para llamadas")}</span><input className="field" type="tel" maxLength={30} value={telephone} placeholder="+593…" onChange={event => setTelephone(event.target.value)} /></label>
      </div>
      {error && <p className="host-form-error" role="alert">{t(error)}</p>}
      <div className="host-form-footer"><p>{t("Estos datos aparecerán en la ficha de tu experiencia.")}</p><button className="button button-primary" type="submit"><Check size={17} />{t("Guardar datos")}</button></div>
    </form>
  );
}

export const HostPortal: React.FC = () => {
  const { t, language, places, reservations, currentBusinessId, setCurrentBusinessId, publishExperience, updateExperience, setReservationStatus, cancelReservation } = useApp();
  const [section, setSection] = useState<Section>('overview');
  const [editor, setEditor] = useState<'new' | 'edit' | null>(null);
  const [filter, setFilter] = useState<RequestFilter>('all');
  const [notice, setNotice] = useState('');
  const [cancelCandidate, setCancelCandidate] = useState<string | null>(null);
  const currentPlace = places.find(place => place.id === currentBusinessId);
  const businessRequests = useMemo(() => reservations.filter(request => request.lugar_id === currentBusinessId), [reservations, currentBusinessId]);
  const pendingRequests = businessRequests.filter(request => request.estado === 'pendiente');
  const activeRequests = businessRequests.filter(request => request.estado !== 'cancelado');
  const confirmedRequests = businessRequests.filter(request => request.estado !== 'pendiente' && request.estado !== 'cancelado');
  const visitors = activeRequests.reduce((total, request) => total + request.cantidad_personas, 0);
  const estimatedValue = activeRequests.reduce((total, request) => total + request.precio_total, 0);
  const visibleRequests = businessRequests.filter(request => filter === 'all' || request.estado === filter);

  const changeSection = (value: Section) => { setSection(value); setEditor(null); setNotice(''); setCancelCandidate(null); };
  const openPublication = () => { setSection('experiences'); setEditor('new'); setNotice(''); };
  const saveExperience = (draft: ExperienceDraft) => {
    const changes: Partial<Place> = {
      titulo: draft.title.trim(), comunidad_nombre: draft.community.trim(), region: draft.region,
      provincia: draft.province.trim(), canton_parroquia: draft.location.trim(), descripcion_corta: draft.description.trim(),
      precio_base_pp: Number(draft.price), duracion_dias: Number(draft.days), cupos_disponibles_dia: Number(draft.capacity),
      nivel_aventura: draft.adventure, imagenes: [draft.photo.trim() || fallbackImage(draft.region)],
      que_incluye: draft.included.split('\n').map(value => value.trim()).filter(Boolean), contacto_whatsapp: draft.phone.trim(),
    };
    if (editor === 'edit' && currentPlace) {
      updateExperience(currentPlace.id, changes);
      setNotice('Los cambios de tu experiencia se guardaron en este navegador.');
    } else {
      const id = `place-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
      const slug = draft.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const place: Place = {
        id, slug: `${slug}-${id.slice(-6)}`, titulo: '', comunidad_nombre: '', region: draft.region,
        provincia: '', canton_parroquia: '', descripcion_corta: '', historia_ancestral: '', datos_curiosos: [],
        clima: 'Consulta con el negocio', altitud: 'Por confirmar', mejor_epoca: 'Consulta disponibilidad con el negocio',
        precio_base_pp: 0, duracion_dias: 1, cupos_disponibles_dia: 1, nivel_aventura: draft.adventure,
        imagenes: [], etiquetas: ['Experiencia local'], que_incluye: [], que_no_incluye: [],
        recomendaciones_eco: ['Respeta los senderos, recoge tus residuos y pide permiso antes de fotografiar a otras personas.'],
        sellos: { bueno: 0, bonito: 0, barato: 0, seguro: false, votos_totales: 0, verificado_gad: false },
        es_destacado: false, contacto_whatsapp: '', telefono_llamadas: draft.phone.trim(), preguntas_frecuentes: [],
        cooperativa_pago: { nombre_banco: '', tipo_cuenta: '', numero_cuenta: '', titular: '' }, reviews: [],
        ...changes,
      };
      publishExperience(place);
      setNotice('Tu experiencia se publicó en el catálogo de este navegador. Puedes verla en el espacio de wambras.');
    }
    setEditor(null);
  };

  const exportRequests = () => {
    if (!businessRequests.length) return;
    const safeCell = (value: string | number) => {
      const content = String(value);
      return `"${(/^[=+\-@\t\r]/.test(content) ? `'${content}` : content).replace(/"/g, '""')}"`;
    };
    const lines = [
      ['Referencia', 'Experiencia', 'Visitante', 'Correo', 'Fecha', 'Personas', 'Valor estimado USD', 'Estado de solicitud', 'Pago de demostración', 'Referencia de prueba'],
      ...businessRequests.map(request => [request.codigo_voucher, request.lugar_titulo, request.turista_nombre, request.turista_email, request.fecha_tour, request.cantidad_personas, request.precio_total, statusLabels[request.estado], request.pago_demo?.estado || 'Sin simulación', request.pago_demo?.referencia || '']),
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.map(line => line.map(safeCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `chulla-vida-solicitudes-${currentBusinessId}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Se descargaron las solicitudes de este negocio en formato CSV.');
  };

  const requestRow = (request: Reservation) => (
    <article className="host-request" key={request.id}>
      <div className="host-request-avatar" aria-hidden="true">{request.turista_nombre.trim().charAt(0).toUpperCase() || 'W'}</div>
      <div className="host-request-main"><h3>{request.turista_nombre}</h3><p>{request.lugar_titulo}</p><div className="host-request-meta"><span><CalendarDays size={14} />{formatDate(request.fecha_tour, languageMetadata[language].tag)}</span><span><Users size={14} />{request.cantidad_personas} {t(request.cantidad_personas === 1 ? 'persona' : 'personas')}</span><span>{currency(request.precio_total)} {t("estimados")}</span></div>{request.pago_demo && <p className="host-demo-payment"><CreditCard size={14} />{t("Pago de demostración:")}{request.pago_demo.estado === 'aprobado' ? 'aprobado' : 'pendiente'} · {request.pago_demo.referencia}</p>}{section === 'requests' && request.turista_email && <p className="host-request-email">{request.turista_email}</p>}</div>
      <div className="host-request-end"><span className={`host-request-status host-status-${request.estado}`}>{t(statusLabels[request.estado])}</span>{section === 'requests' && (request.estado === 'pendiente' || request.estado === 'confirmado') && <div className="host-request-actions">{request.estado === 'pendiente' && <button type="button" className="button button-primary host-small-button" onClick={() => { setReservationStatus(request.id, 'confirmado'); setNotice(`Solicitud de ${request.turista_nombre} confirmada en este navegador.`); }}><Check size={15} />{t("Aceptar")}</button>}<button type="button" className="host-text-button host-danger" onClick={() => setCancelCandidate(request.id)}>{t("Cancelar")}</button></div>}</div>
      {cancelCandidate === request.id && <div className="host-cancel-confirm"><p>{t("¿Cancelar la solicitud de")}{request.turista_nombre}?</p><button type="button" className="button button-secondary host-small-button" onClick={() => setCancelCandidate(null)}>{t("Conservar solicitud")}</button><button type="button" className="button host-cancel-button host-small-button" onClick={() => { cancelReservation(request.id); setCancelCandidate(null); setNotice('Solicitud cancelada en este navegador.'); }}>{t("Sí, cancelar")}</button></div>}
    </article>
  );

  const sections: { id: Section; label: string; icon: typeof Store }[] = [
    { id: 'overview', label: 'Resumen', icon: Store }, { id: 'experiences', label: 'Experiencias', icon: MapPin },
    { id: 'requests', label: 'Solicitudes', icon: ClipboardList }, { id: 'wallet', label: 'Cobros y retiros', icon: CreditCard }, { id: 'business', label: 'Mi negocio', icon: Settings2 },
  ];

  return (
    <div className="host-portal">
      <header className="host-page-header"><div><h1>{t("Tu lugar, nuevas conexiones.")}</h1><p>{t("Comparte lo que haces y recibe a quienes quieren conocerlo.")}</p></div><button type="button" className="button button-primary" onClick={openPublication}><Plus size={18} />{t("Publicar experiencia")}</button></header>
      <div className="host-workspace"><Store size={18} aria-hidden="true" /><label htmlFor="host-business-select">{t("Negocio de demostración")}</label><select id="host-business-select" value={currentBusinessId} onChange={event => { setCurrentBusinessId(event.target.value); setEditor(null); setNotice(''); setCancelCandidate(null); }}>{!currentPlace && <option value="">{t("Selecciona una experiencia")}</option>}{places.map(place => <option key={place.id} value={place.id}>{place.comunidad_nombre} · {place.titulo}</option>)}</select></div>
      <nav className="host-subnav" aria-label={t("Gestión del negocio")}>{sections.map(item => <button type="button" key={item.id} aria-current={section === item.id ? 'page' : undefined} onClick={() => changeSection(item.id)}><item.icon size={17} />{walletText(language, item.label, t)}{item.id === 'requests' && pendingRequests.length > 0 && <span className="host-count">{pendingRequests.length}</span>}</button>)}</nav>
      {notice && <div className="host-notice" role="status"><CheckCheck size={18} /><span>{t(notice)}</span><button type="button" className="icon-button" aria-label={t("Cerrar aviso")} onClick={() => setNotice('')}><X size={16} /></button></div>}
      {editor && <ExperienceForm key={`${editor}-${currentBusinessId}`} place={editor === 'edit' ? currentPlace : undefined} onSave={saveExperience} onCancel={() => setEditor(null)} />}
      {!editor && section === 'wallet' && <BusinessWallet key={currentBusinessId} />}

      {!editor && section === 'overview' && <>
        <section className="host-welcome"><div className="host-welcome-copy"><h2>{t("Detrás de cada viaje,")}<br />{t("hay alguien como tú.")}</h2><p>{t("Tu experiencia es el punto de encuentro. Mantén tus precios y cupos al día para ayudar a los wambras a elegir su próxima ruta.")}</p><button type="button" className="host-link-button" onClick={() => changeSection('experiences')}>{t("Gestionar mi experiencia")}<ArrowRight size={17} /></button></div><div className="host-welcome-image"><img src={currentPlace?.imagenes[0] || fallbackImage(currentPlace?.region)} onError={event => imageFallback(event, currentPlace?.region)} alt={t("Paisaje que invita a descubrir Ecuador")} /><span><MapPin size={15} />{currentPlace ? `${currentPlace.provincia}, ${currentPlace.region}` : 'Hecho en Ecuador'}</span></div></section>
        <div className="host-summary" aria-label={t("Resumen de las solicitudes de este negocio")}><div><span>{t("Por responder")}</span><strong>{pendingRequests.length}</strong></div><div><span>{t("Solicitudes confirmadas")}</span><strong>{confirmedRequests.length}</strong></div><div><span>{t("Personas en solicitudes activas")}</span><strong>{visitors}</strong></div><div><span>{t("Valor estimado · sin cobros")}</span><strong>{currency(estimatedValue)}</strong></div></div>
        <section className="host-content-section"><div className="host-section-heading"><div><h2>{t("Solicitudes recientes")}</h2><p>{t("Solo las solicitudes de la experiencia seleccionada.")}</p></div><button type="button" className="host-link-button" onClick={() => changeSection('requests')}>{t("Ver todas")}<ChevronRight size={17} /></button></div>{businessRequests.length ? <div className="host-request-list">{businessRequests.slice(0, 3).map(requestRow)}</div> : <div className="host-empty"><div className="host-empty-icon"><CalendarDays size={28} /></div><h3>{t("Aquí empieza tu próxima visita.")}</h3><p>{t("Cuando un wambra solicite esta experiencia, encontrarás aquí la fecha, el grupo y los detalles para responder.")}</p><button type="button" className="button button-secondary" onClick={() => changeSection('experiences')}>{t("Revisar mi experiencia")}<ArrowRight size={16} /></button></div>}</section>
        <div className="host-demo-note"><CircleHelp size={18} /><p>{t("Este es un espacio de demostración. Las experiencias y solicitudes se guardan en este navegador. Confirmar una solicitud no realiza cobros ni envía mensajes.")}</p></div>
      </>}

      {!editor && section === 'experiences' && <section className="host-content-section"><div className="host-section-heading"><div><h2>{t("Una experiencia que merece contarse.")}</h2><p>{t("Revisa tu publicación y mantén los detalles claros para tus visitantes.")}</p></div></div>{currentPlace ? <article className="host-experience"><div className="host-experience-image"><img src={currentPlace.imagenes[0] || fallbackImage(currentPlace.region)} alt={currentPlace.titulo} onError={event => imageFallback(event, currentPlace.region)} /><span className="host-catalog-label">{t("En el catálogo local")}</span></div><div className="host-experience-copy"><p className="host-location"><MapPin size={15} />{currentPlace.provincia} · {currentPlace.region}</p><h3>{currentPlace.titulo}</h3><p>{currentPlace.descripcion_corta}</p><dl className="host-experience-details"><div><dt>{t("Por persona")}</dt><dd>{currency(currentPlace.precio_base_pp)}</dd></div><div><dt>{t("Duración")}</dt><dd>{currentPlace.duracion_dias} {t(currentPlace.duracion_dias === 1 ? 'día' : 'días')}</dd></div><div><dt>{t("Cupos por día")}</dt><dd>{currentPlace.cupos_disponibles_dia} {t("personas")}</dd></div></dl><button type="button" className="button button-secondary" onClick={() => setEditor('edit')}><Pencil size={16} />{t("Editar detalles, precio y cupos")}</button></div></article> : <div className="host-empty"><ImagePlus size={30} /><h3>{t("Tu primera experiencia comienza aquí.")}</h3><p>{t("Agrega una propuesta con una descripción, precio, cupos y ubicación para que los wambras puedan descubrirla.")}</p><button type="button" className="button button-primary" onClick={openPublication}><Plus size={17} />{t("Crear experiencia")}</button></div>}<div className="host-editorial-note"><CircleHelp size={20} /><div><h3>{t("Precios claros, mejores encuentros.")}</h3><p>{t("Indica qué está incluido y el tamaño del grupo que puedes recibir. La publicación aparecerá en el catálogo de este navegador.")}</p></div></div></section>}

      {!editor && section === 'requests' && <section className="host-content-section"><div className="host-section-heading"><div><h2>{t("Organiza tus próximas visitas.")}</h2><p>{t("Acepta o cancela solicitudes. El estado se actualiza en el espacio del viajero.")}</p></div><button type="button" className="button button-secondary" onClick={exportRequests} disabled={!businessRequests.length}><ArrowDownToLine size={17} />{t("Exportar CSV")}</button></div><div className="host-request-filters" aria-label={t("Filtrar solicitudes")}>{([{ id: 'all', label: 'Todas' }, { id: 'pendiente', label: 'Por responder' }, { id: 'confirmado', label: 'Confirmadas' }, { id: 'cancelado', label: 'Canceladas' }] as { id: RequestFilter; label: string }[]).map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{t(item.label)}<span>{item.id === 'all' ? businessRequests.length : businessRequests.filter(request => request.estado === item.id).length}</span></button>)}</div>{visibleRequests.length ? <div className="host-request-list">{visibleRequests.map(requestRow)}</div> : <div className="host-empty"><div className="host-empty-icon"><Clock3 size={28} /></div><h3>{t(filter === 'all' ? 'Todavía no hay solicitudes.' : 'No hay solicitudes en este estado.')}</h3><p>{t(filter === 'all' ? 'Las nuevas solicitudes de esta experiencia aparecerán aquí. Puedes probar el recorrido desde el espacio de wambras.' : 'Elige otro filtro para revisar el resto de las visitas.')}</p>{filter !== 'all' && <button type="button" className="button button-secondary" onClick={() => setFilter('all')}>{t("Ver todas las solicitudes")}</button>}</div>}<p className="host-requests-footnote">{t("Los importes son estimados. No se han procesado pagos ni avisos externos.")}</p></section>}

      {!editor && section === 'business' && <section className="host-content-section"><div className="host-section-heading"><div><h2>{t("La información de tu negocio.")}</h2><p>{t("Un punto de encuentro claro y un contacto facilitan el primer paso.")}</p></div><span className="host-local-badge"><Store size={14} />{t("Perfil local")}</span></div>{currentPlace ? <BusinessForm key={currentPlace.id} place={currentPlace} onSave={changes => { updateExperience(currentPlace.id, changes); setNotice('Los datos de tu negocio se guardaron en este navegador.'); }} /> : <div className="host-empty"><Store size={30} /><h3>{t("Presenta tu negocio.")}</h3><p>{t("Publica tu primera experiencia para agregar la información de tu negocio.")}</p><button type="button" className="button button-primary" onClick={openPublication}><Plus size={17} />{t("Publicar experiencia")}</button></div>}<div className="host-demo-note"><CircleHelp size={18} /><p>{t("El selector permite recorrer negocios de ejemplo. Esta demostración no incluye cuentas privadas ni verificación de identidad.")}</p></div></section>}
    </div>
  );
};
