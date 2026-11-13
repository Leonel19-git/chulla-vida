import { useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { culturalEvents, filterCulturalEvents, eventStatus } from '../../domain/culture';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import './culture.css';
import { useCatalog } from './CatalogContext';

export function CultureView() {
  const { online } = useCatalog();
  const [region, setRegion] = useState<RegionId | 'all'>('all');
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const events = online ? filterCulturalEvents({ region, ...(month ? { month: +month } : {}), query }) : [];
  return <section className="culture-view"><div className="page-heading"><h1>Cultura Viva</h1><p>Fiestas, tradiciones y encuentros. Primero escuchar, después participar.</p></div><div className="culture-filters"><label>Región<select className="field" value={region} onChange={event => setRegion(event.target.value as RegionId | 'all')}><option value="all">Todas las regiones</option>{Object.entries(REGION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Mes habitual<select className="field" value={month} onChange={event => setMonth(event.target.value)}><option value="">Cualquier mes</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{new Intl.DateTimeFormat('es-EC', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1)))}</option>)}</select></label><label>Buscar<input className="field" value={query} onChange={event => setQuery(event.target.value)} placeholder="Fiesta, comunidad o provincia" /></label></div><p className="culture-notice">{culturalEvents.length} referencias culturales. Fechas orientativas salvo ediciones fechadas con fuente citada. Confirma vigencia y participación con sus organizadores.</p><div aria-live="polite">{events.map(event => <article key={event.id} className="culture-row"><CalendarDays size={28} aria-hidden="true" /><div><p className="place-location"><MapPin size={14} />{event.provinces.join(', ')} · {REGION_LABELS[event.region]}</p><h2>{event.name}</h2><p>{event.description}</p><p className="culture-date">{event.dateLabel} · {eventStatus(event, new Date()).label}</p><details><summary>Cómo participar con respeto</summary><ul>{event.protocols.map(protocol => <li key={protocol}>{protocol}</li>)}</ul>{event.sensitive && <p>La participación y la documentación dependen del consentimiento de la comunidad; no se presenta como espectáculo público.</p>}<p>Referencia editorial: {event.lastCheckedAt}. Confirma la edición y las condiciones con sus organizadores.</p>{event.officialUrl && <a href={event.officialUrl} target="_blank" rel="noreferrer">Consultar fuente de la agenda</a>}</details></div></article>)}{events.length === 0 && <p className="empty-state">No hay referencias para esos filtros. Algunas celebraciones siguen calendarios comunitarios sin mes fijo.</p>}</div></section>;
}
