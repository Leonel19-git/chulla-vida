import type { Language, OnboardingPreferences, Place } from '../types';
import { getPlaceTotal, matchesPreferences, rankPlaces } from './recommendations';
import { offlineDocumentLanguage, offlineLocale, translateOffline } from '../i18n/offline';

export const OFFLINE_ROUTE_KEY = 'chullavida:offline-route:v1';

export const ROUTE_REGION_THEMES = {
  Sierra: { key: 'sierra', accent: '#173d67', water: '#078e98', base: '#f1e6c8', detail: 'Cumbres y terrazas' },
  Costa: { key: 'costa', accent: '#087d92', water: '#0b9fa8', base: '#e3f2ed', detail: 'Olas y arena' },
  Amazonía: { key: 'amazonia', accent: '#276443', water: '#0b8e9a', base: '#e1ecd3', detail: 'Río y selva' },
  Galápagos: { key: 'galapagos', accent: '#15536f', water: '#079daa', base: '#dceee9', detail: 'Islas y lava' },
} as const;
export function routeRegionTheme(region: string) {
  return ROUTE_REGION_THEMES[region as keyof typeof ROUTE_REGION_THEMES] || ROUTE_REGION_THEMES.Sierra;
}

// Original, schematic landscape artwork. Constants only: never interpolate user
// strings here. Both React and the standalone HTML reuse the same 680 × 285 SVG.
const REGION_SCENES: Record<string, string> = {
  Sierra: `<rect width="680" height="285" fill="#f1e6c8"/><circle cx="515" cy="61" r="29" fill="#f8bd23"/><path d="M0 210 111 70 190 150 313 22 462 195 556 88 680 218V285H0Z" fill="#597d83"/><path d="m236 109 77-87 80 94-47-21-23 14-20-29-26 31-18-10Z" fill="#fffbeb"/><path d="M-30 240 114 121 266 253 380 117 537 253 640 164 720 240V285H-30Z" fill="#173d67"/><path d="M0 285V242l102-42 108 28 66 57Zm287 0 93-66 122-15 178 46v35Z" fill="#9da96f"/><path d="m0 259 105-40 109 26m-214 29 110-39 123 28m115 22 60-45 117-17 155 44m-312 18 48-30 113-18 151 43" fill="none" stroke="#f2df9d" stroke-width="3"/><path d="m43 50 12-5 13 5m9 6 10-4 11 4" fill="none" stroke="#173d67" stroke-width="2" stroke-linecap="round"/>`,
  Costa: `<rect width="680" height="285" fill="#e3f2ed"/><circle cx="523" cy="58" r="30" fill="#f7bd26"/><path d="M0 148q110-25 230 5t230-2 220 0v134H0Z" fill="#40b4b7"/><path d="M0 192q125-24 244-3t224-3 212 0v99H0Z" fill="#0a8195"/><path d="M0 239q100-33 245-7t260-4 175 4v53H0Z" fill="#efd08a"/><g fill="none" stroke="#e7faf3" stroke-width="3" opacity=".9"><path d="M35 172q35-12 70 0m48 25q43-12 86 0m75-24q44-12 88 0m51 31q47-12 94 0m47-25q30-9 60 0"/><path d="M20 223q54-12 108 0m170-8q46-9 92 0m168 14q40-10 80 0"/></g><path d="M74 245q16-48 5-102" fill="none" stroke="#6c653e" stroke-width="8" stroke-linecap="round"/><path d="M79 150q-38-36-66 0 36-6 66 0m0 0q-11-61 32-63-19 26-32 63m0 0q44-40 70 1-39-10-70-1m0 0q-41-15-42-46 29 15 42 46" fill="#39764d"/><path d="m582 91 13-5 13 5m12-13 10-5 12 5" fill="none" stroke="#173d67" stroke-width="2" stroke-linecap="round"/>`,
  Amazonía: `<rect width="680" height="285" fill="#e1ecd3"/><circle cx="501" cy="53" r="29" fill="#edc248"/><path d="M0 128q65-82 127 0 62-106 131 0 56-77 125 0 62-94 128 0 77-94 169 0v157H0Z" fill="#80a16a"/><path d="M0 181q59-66 131 0 60-75 137 0 58-69 125 0 61-87 143 0 74-69 144 0v104H0Z" fill="#3d7a4e"/><path d="M312 135c-131 34 92 49-8 76-76 21-140 35-129 74h206c-73-52 135-52 42-90-99-40-52-48-53-60Z" fill="#bfe4cf"/><path d="M326 137c-112 37 111 46 3 80-90 28-125 33-100 68h108c-23-48 145-54 62-88-87-36-47-49-47-60Z" fill="#16a3a7"/><g fill="#245c3f"><path d="M0 285V103q19-64 63-7 42-49 68 9v180Z"/><path d="M542 285V128q29-54 64-13 38-57 74-1v171Z"/></g><g fill="none" stroke="#588258" stroke-width="4"><path d="m30 285 9-112m45 112-6-136m520 136-4-113m49 113 5-137"/></g><path d="m414 89 13-6 14 6m-252-34 9-4 9 4" fill="none" stroke="#214c3c" stroke-width="2" stroke-linecap="round"/>`,
  Galápagos: `<rect width="680" height="285" fill="#dceee9"/><circle cx="515" cy="54" r="28" fill="#f7bb24"/><path d="M0 128q120-18 240 1t230 0 210 0v156H0Z" fill="#36acb2"/><path d="M0 210q121-23 236 0t244 0 200-2v77H0Z" fill="#0b7890"/><path d="m87 165 65-75 31 12 65 63-62 20-69-1Zm267 61 66-79 30 7 77 79-100 14Zm169-64 47-61 23 9 48 55-74 15Z" fill="#6e7751"/><path d="m116 161 38-45 38 47-23-9-17 6-16-8Zm268 61 38-48 42 49-30-12-15 9-14-7Zm158-61 31-39 29 39-29-10Z" fill="#384e50"/><path d="m152 92 30 11-11 13-18-9-16 2Z" fill="#d46243"/><g fill="none" stroke="#b7e7dd" stroke-width="3"><path d="M34 199q33-9 66 0m160-52q32-8 64 0m-134 86q39-10 78 0m274-27q42-10 84 0m-134 58q42-9 84 0"/></g><g fill="#244852"><ellipse cx="305" cy="260" rx="19" ry="9"/><circle cx="326" cy="258" r="5"/><path d="m292 267-8 7 13-2m15-4 8 6-1-9"/></g><path d="m389 52 12-5 14 5m12-8 10-4 11 4" fill="none" stroke="#173d67" stroke-width="2" stroke-linecap="round"/>`,
};
export const regionalSceneSvg = (region: string): string => REGION_SCENES[region] || REGION_SCENES.Sierra;

export interface OfflineStop {
  id: string;
  title: string;
  province: string;
  locality: string;
  region: string;
  days: number;
  startDay: number;
  pricePerPerson: number;
  total: number;
  level: string;
  climate: string;
  altitude: string;
  phone: string;
  includes: string[];
  excludes: string[];
  eco: string[];
}

export interface OfflineRouteSnapshot {
  version: 1;
  createdAt: string;
  origin: string;
  people: number;
  days: number;
  budget: number;
  total: number;
  remaining: number;
  interests: string[];
  stops: OfflineStop[];
}

const roundMoney = (n: number) => Math.round(n * 100) / 100;
const cleanText = (value: string, limit = 240) => value.trim().slice(0, limit);
const cleanList = (values: string[]) => values.slice(0, 12).map(value => cleanText(value, 500));

/** Prices cover each complete experience. A route never spends the group budget twice. */
export function buildOfflineRoute(places: Place[], preferences: OnboardingPreferences, now = new Date()): OfflineRouteSnapshot {
  let budget = preferences.presupuesto_max;
  let days = preferences.dias_disponibles;
  let startDay = 1;
  const stops: OfflineStop[] = [];
  for (const place of rankPlaces(places, preferences)) {
    const cost = getPlaceTotal(place, preferences);
    if (!matchesPreferences(place, preferences) || place.duracion_dias > days || cost > budget) continue;
    stops.push({
      id: place.id, title: cleanText(place.titulo.split(':')[0]), province: cleanText(place.provincia),
      locality: cleanText(place.canton_parroquia), region: place.region,
      days: place.duracion_dias, startDay, pricePerPerson: place.precio_base_pp, total: cost,
      level: place.nivel_aventura, climate: cleanText(place.clima), altitude: cleanText(place.altitud),
      phone: cleanText(place.telefono_llamadas, 60), includes: cleanList(place.que_incluye),
      excludes: cleanList(place.que_no_incluye), eco: cleanList(place.recomendaciones_eco),
    });
    budget = roundMoney(budget - cost);
    days -= place.duracion_dias;
    startDay += place.duracion_dias;
    if (stops.length >= 3) break;
  }
  return {
    version: 1, createdAt: now.toISOString(), origin: cleanText(preferences.origen || 'Ecuador'),
    people: preferences.cantidad_personas, days: preferences.dias_disponibles,
    budget: preferences.presupuesto_max, total: roundMoney(preferences.presupuesto_max - budget),
    remaining: budget, interests: cleanList(preferences.pasiones), stops,
  };
}

const text = (value: unknown, max = 500): value is string => typeof value === 'string' && value.length <= max;
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number => number(value, min, max) && Number.isInteger(value);
const list = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 12 && value.every(item => text(item));

export function validateOfflineRoute(value: unknown): value is OfflineRouteSnapshot {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (r.version !== 1 || !text(r.createdAt, 40) || Number.isNaN(Date.parse(r.createdAt)) || !text(r.origin, 240)
    || !integer(r.people, 1, 100) || !integer(r.days, 1, 14) || !number(r.budget, 0, 100000)
    || !number(r.total, 0, 100000) || !number(r.remaining, 0, 100000) || !list(r.interests)
    || !Array.isArray(r.stops) || r.stops.length < 1 || r.stops.length > 3) return false;
  let nextDay = 1;
  let total = 0;
  const ids = new Set<string>();
  for (const value of r.stops) {
    if (!value || typeof value !== 'object') return false;
    const stop = value as Record<string, unknown>;
    if (!text(stop.id, 240) || !stop.id || ids.has(stop.id) || !text(stop.title, 240) || !stop.title
      || !text(stop.province, 240) || !text(stop.locality, 240) || !text(stop.region, 240)
      || !integer(stop.days, 1, 14) || !integer(stop.startDay, 1, 14) || stop.startDay !== nextDay
      || !number(stop.pricePerPerson, 0, 100000) || !number(stop.total, 0, 100000)
      || Math.abs(roundMoney(stop.pricePerPerson * r.people) - stop.total) > .01
      || !text(stop.level, 240) || !text(stop.climate, 240) || !text(stop.altitude, 240) || !text(stop.phone, 60)
      || !list(stop.includes) || !list(stop.excludes) || !list(stop.eco)) return false;
    ids.add(stop.id);
    nextDay += stop.days;
    total = roundMoney(total + stop.total);
  }
  return nextDay - 1 <= r.days && Math.abs(total - r.total) < .01
    && Math.abs(roundMoney(r.total + r.remaining) - r.budget) < .01;
}

export function readOfflineRoute(): OfflineRouteSnapshot | null {
  try {
    const raw = localStorage.getItem(OFFLINE_ROUTE_KEY);
    if (!raw || raw.length > 100000) return null;
    const parsed: unknown = JSON.parse(raw);
    return validateOfflineRoute(parsed) ? parsed : null;
  } catch { return null; }
}

export function saveOfflineRoute(route: OfflineRouteSnapshot): boolean {
  if (!validateOfflineRoute(route)) return false;
  try { localStorage.setItem(OFFLINE_ROUTE_KEY, JSON.stringify(route)); return true; }
  catch { return false; }
}

export const escapeRouteHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const cash = (value: number) => '$' + value.toFixed(value % 1 ? 2 : 0);

export const routeDay = (stop: OfflineStop, language: Language = 'es') => stop.days === 1
  ? translateOffline(language, 'Día {day}', { day: stop.startDay })
  : translateOffline(language, 'Días {from}–{to}', { from: stop.startDay, to: stop.startDay + stop.days - 1 });

/** A complete document: no scripts, external images, fonts or network requests. */
export function offlineRouteHtml(route: OfflineRouteSnapshot, language: Language = 'es'): string {
  if (!validateOfflineRoute(route)) throw new Error('La ruta no es válida. Vuelve a guardarla.');
  const e = escapeRouteHtml;
  const t = (literal: string, variables?: Record<string, string | number>) => translateOffline(language, literal, variables);
  const ht = (literal: string, variables?: Record<string, string | number>) => e(t(literal, variables));
  const stops = route.stops.map((stop, index) => {
    const theme = routeRegionTheme(stop.region);
    const items = (values: string[]) => values.map(item => `<li>${e(t(item))}</li>`).join('');
    return `<section id="parada-${index + 1}" class="stop" style="--accent:${theme.accent}"><div class="stop-heading"><span class="stop-number">${index + 1}</span><div><h2>${e(stop.title)}</h2><p>${e(stop.province)} · ${e(stop.locality)}</p></div></div><div class="stop-scene"><svg viewBox="0 0 680 285" role="img" aria-label="${ht(theme.detail)}">${regionalSceneSvg(stop.region)}</svg><span>${ht(stop.region)} · ${ht(theme.detail)}</span></div><div class="facts"><span>${e(routeDay(stop, language))}</span><span>${e(t(stop.level))}</span><span>${cash(stop.pricePerPerson)} / ${ht('por persona')}</span><span>${cash(stop.total)} / ${ht('el grupo')}</span></div><details open><summary>${ht('Qué incluye')}</summary><ul>${items(stop.includes)}</ul></details>${stop.excludes.length ? `<details><summary>${ht('Gastos aparte')}</summary><ul>${items(stop.excludes)}</ul></details>` : ''}<details><summary>${ht('Ve pilas')}</summary><p>${e(t(stop.climate))} · ${e(stop.altitude)}</p><ul>${items(stop.eco)}</ul></details>${stop.phone ? `<p class="contact">${ht('Contacto anotado')}: ${e(stop.phone)}</p>` : ''}</section>`;
  }).join('');
  const first = route.stops[0];
  const theme = routeRegionTheme(first.region);
  const count = route.stops.length;
  const x = (index: number) => 82 + ((index + 1) * 500 / count);
  const y = (index: number) => index % 2 ? 108 : 190;
  const nodes = route.stops.map((stop, index) => `<a href="#parada-${index + 1}" aria-label="${ht('Parada {number}: {title}', { number: index + 1, title: stop.title })}"><circle cx="${x(index)}" cy="${y(index)}" r="27" fill="${routeRegionTheme(stop.region).accent}" stroke="#fffdf0" stroke-width="4"/><text x="${x(index)}" y="${y(index) + 7}" fill="white" text-anchor="middle" font-size="21" font-weight="750">${index + 1}</text></a>`).join('');
  const points = ['82,108', ...route.stops.map((_, index) => `${x(index)},${y(index)}`)].join(' ');
  const legend = [...new Set(route.stops.map(stop => stop.region))].map(region => `<a class="legend" style="--accent:${routeRegionTheme(region).accent}" href="#parada-${route.stops.findIndex(stop => stop.region === region) + 1}"><i></i>${ht(region)}</a>`).join('');
  const date = new Date(route.createdAt).toLocaleString(offlineLocale(language), { timeZone: 'America/Guayaquil', dateStyle: 'medium', timeStyle: 'short' });
  return `<!doctype html><html lang="${e(offlineDocumentLanguage(language))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${ht('Mi ruta sin conexión')} · CHULLA VIDA</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f8f3e6;color:#10385f;font:16px/1.65 system-ui,sans-serif}main{max-width:820px;margin:0 auto;padding:32px 22px}h1{font:700 clamp(30px,5vw,44px)/1.15 Georgia,serif;margin:18px 0}h2{font-size:22px;line-height:1.3;margin:0 0 7px}p{margin:7px 0 18px}.brand{font-weight:800;letter-spacing:.1em}.brand:after{content:"";display:block;width:80px;height:4px;background:#edb52d;margin-top:8px}.status{display:inline-flex;background:#e3eee0;color:#31583d;border-radius:6px;padding:5px 12px;font-size:13px}.trip{font-size:14px;margin-top:17px;color:#50665b}.facts{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.facts span{background:#e9eee3;border-radius:5px;padding:6px 10px;font-size:13px}.map{border:1px solid #d3ded4;background:#fffdf2;border-radius:20px 20px 10px 10px;overflow:hidden}.map svg{display:block;width:100%;height:auto}.map-heading{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:13px 17px;color:${theme.accent};font-size:15px;font-weight:700}.map-heading small{font-size:12px;font-weight:400;color:#50665b}.map-note{display:block;padding:11px 16px 5px;color:#50665b;font-size:11px}.legend-row{display:flex;gap:15px;flex-wrap:wrap;padding:7px 16px 15px}.legend{color:var(--accent);font-size:12px;font-weight:650;text-decoration:none;display:inline-flex;gap:6px;align-items:center}.legend i{height:9px;width:9px;border-radius:3px;background:var(--accent)}.stop{scroll-margin-top:20px;border-bottom:1px solid #cbd4c9;padding:29px 0}.stop-heading{display:flex;gap:12px;align-items:flex-start}.stop-number{display:flex;align-items:center;justify-content:center;flex-shrink:0;height:33px;width:33px;border-radius:50%;background:var(--accent);color:white;font-weight:750}.stop p{font-size:14px;color:#50665b}.stop-scene{position:relative;overflow:hidden;border-radius:11px;height:116px;background:#e7eee4}.stop-scene svg{width:100%;height:100%;object-fit:cover;display:block}.stop-scene span{position:absolute;bottom:9px;left:12px;background:#fffdf1;padding:3px 8px;border-radius:4px;font-size:11px;color:var(--accent)}details{padding:10px 0}summary{cursor:pointer;font-weight:650;color:#245344;font-size:14px}li{font-size:14px;margin:6px 0}ul{padding-left:20px}.total{background:#10385f;color:white;border-radius:12px;padding:20px;margin-top:24px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.total strong{display:block;font-size:25px}.total span{font-size:13px}.note{font-size:13px;color:#50665b;margin-top:18px}footer{margin-top:24px;font-size:12px;color:#50665b}a:focus-visible,summary:focus-visible{outline:3px solid #c3324c;outline-offset:4px}a:hover circle{fill:#c3324c}.contact{margin-top:14px!important}@media(max-width:500px){main{padding:23px 17px}.map-heading{padding:12px;font-size:14px}.map-heading small{font-size:11px}.map svg{min-height:160px}.stop-scene{height:105px}.stop-scene svg{min-height:0}h2{font-size:20px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{body{background:white}main{padding:12px}.stop{break-inside:avoid}details{display:block}details>*{display:block!important}.map{max-height:340px}.map svg{max-height:210px}summary{list-style:none}}
</style></head><body><main><div class="brand">CHULLA VIDA</div><h1>${ht('Tu ruta, aunque se vaya la señal.')}</h1><span class="status">${ht('Archivo disponible sin internet')}</span><p class="trip">${ht('Desde {origin} · {people} personas · hasta {days} días', { origin: route.origin, people: route.people, days: route.days })}</p><div class="facts"><span>${ht('Presupuesto del grupo')}: ${cash(route.budget)}</span></div><div class="map"><div class="map-heading"><span>${ht(first.region)}</span><small>${ht(theme.detail)}</small></div><svg viewBox="0 0 680 285" role="group" aria-label="${ht('Ruta esquemática desde {origin}', { origin: route.origin })}">${regionalSceneSvg(first.region)}<polyline points="${points}" fill="none" stroke="#fffdf0" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points}" fill="none" stroke="#c3324c" stroke-width="3.5" stroke-dasharray="7 7" stroke-linecap="round"/><circle cx="82" cy="108" r="18" fill="#10385f" stroke="#fffdf0" stroke-width="3"/><path d="m75 108 5 5 10-11" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="50" y="134" width="64" height="24" rx="12" fill="#fffdf1"/><text x="82" y="151" text-anchor="middle" fill="#10385f" font-size="13" font-weight="700">${ht('Salida')}</text>${nodes}</svg><small class="map-note">${ht('Esquema de ruta · sin navegación GPS')} · ${ht('Toca una parada')}</small><div class="legend-row">${legend}</div></div>${stops}<div class="total"><div><span>${ht('Experiencias')} / ${route.people}</span><strong>${cash(route.total)}</strong></div><div><span>${ht('Para traslados y otros gastos')}</span><strong>${cash(route.remaining)}</strong></div></div><p class="note">${ht('Ruta orientativa: confirma traslados, acceso y disponibilidad antes de salir. No calcula distancias ni tiempos por carretera.')}</p><footer>${ht('Guardada el {date}', { date })}. ${ht('Los precios son una instantánea y pueden cambiar. Este archivo no confirma reservas ni sirve como comprobante de pago.')}</footer></main></body></html>`;
}

