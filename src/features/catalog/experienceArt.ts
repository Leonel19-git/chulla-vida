import type { Experience, RegionId } from '../../domain/catalog';

/**
 * Ilustración original por ficha. Sustituye la fotografía regional repetida:
 * cada ficha obtiene un paisaje distinto, determinista por su id, con la paleta de su región.
 * No representa el lugar real; la interfaz lo rotula como ilustración.
 */
interface Palette { sky: [string, string]; far: string; mid: string; near: string; accent: string; water: string; sun: string }

const PALETTES: Record<RegionId, Palette[]> = {
  sierra: [
    { sky: ['#bfe3f2', '#f7ecd2'], far: '#7d8fb8', mid: '#2f5a8a', near: '#3f6b3a', accent: '#c96a3c', water: '#4cc6c0', sun: '#fed65a' },
    { sky: ['#f6d9b8', '#fbefe0'], far: '#b6896c', mid: '#8a4f37', near: '#5b7a3c', accent: '#012960', water: '#5ab7c9', sun: '#ffc93c' },
    { sky: ['#cde7e2', '#f3efe5'], far: '#9fb39c', mid: '#5e7f55', near: '#2f4a2c', accent: '#c61534', water: '#3fa6b5', sun: '#fed65a' },
  ],
  costa: [
    { sky: ['#9fdcef', '#fff4dc'], far: '#7fb7a7', mid: '#3a8f84', near: '#e9c98f', accent: '#c61534', water: '#16a3b4', sun: '#ffcf4a' },
    { sky: ['#ffd7b0', '#fff2df'], far: '#e3a77a', mid: '#2e7f8e', near: '#efd3a0', accent: '#012960', water: '#0e8aa0', sun: '#ff9f43' },
  ],
  amazonia: [
    { sky: ['#cfeed8', '#f2f7e6'], far: '#6fa978', mid: '#2f7a4b', near: '#174d2e', accent: '#fed65a', water: '#3fb1a5', sun: '#ffe27a' },
    { sky: ['#e2f0c8', '#f7f3df'], far: '#88b56a', mid: '#3e7f3a', near: '#1f5530', accent: '#c61534', water: '#5fa778', sun: '#fed65a' },
  ],
  galapagos: [
    { sky: ['#a9dcf5', '#eaf7fb'], far: '#5c6b78', mid: '#33404b', near: '#d9c08f', accent: '#c61534', water: '#1a7fc2', sun: '#fed65a' },
    { sky: ['#ffe2c2', '#eef8fb'], far: '#7a6b66', mid: '#3b3534', near: '#e2cda2', accent: '#012960', water: '#1490b8', sun: '#ffb347' },
  ],
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
}
const round = (n: number) => Math.round(n * 10) / 10;

function ridge(r: () => number, base: number, amp: number, peaks: number, w = 640, h = 400): string {
  const step = w / peaks;
  let d = `M0 ${h} L0 ${round(base - r() * amp * 0.4)}`;
  for (let i = 0; i < peaks; i += 1) {
    const x1 = i * step + step * (0.3 + r() * 0.3);
    const y1 = base - amp * (0.45 + r() * 0.55);
    const x2 = (i + 1) * step;
    const y2 = base - r() * amp * 0.35;
    d += ` Q${round(x1)} ${round(y1)} ${round(x2)} ${round(y2)}`;
  }
  return `${d} L${w} ${h} Z`;
}

function trees(r: () => number, color: string, count: number, baseY: number): string {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const x = round(r() * 640); const s = 18 + r() * 34; const y = baseY + r() * 40;
    out += `<path d="M${x} ${round(y - s * 1.6)} L${round(x - s * 0.55)} ${round(y)} L${round(x + s * 0.55)} ${round(y)} Z" fill="${color}" opacity="${round(0.75 + r() * 0.25)}"/>`;
  }
  return out;
}

export function experienceArtSvg(id: string, region: RegionId): string {
  const seed = hash(id);
  const r = rng(seed);
  const options = PALETTES[region];
  const p = options[seed % options.length];
  const sunX = round(90 + r() * 460); const sunY = round(70 + r() * 60); const sunR = round(26 + r() * 18);
  const g = `g${seed.toString(36)}`;
  const parts: string[] = [
    `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>`,
    `<rect width="640" height="400" fill="url(#${g})"/>`,
    `<circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${p.sun}"/>`,
    `<circle cx="${sunX}" cy="${sunY}" r="${round(sunR + 14)}" fill="none" stroke="${p.sun}" stroke-width="3" stroke-dasharray="4 10" opacity=".7"/>`,
  ];
  if (region === 'sierra') {
    parts.push(`<path d="${ridge(r, 250, 170, 3)}" fill="${p.far}"/>`);
    const peakX = round(160 + r() * 320);
    parts.push(`<path d="M${peakX - 150} 300 L${peakX} ${round(90 + r() * 40)} L${peakX + 160} 300 Z" fill="${p.mid}"/>`);
    parts.push(`<path d="M${peakX - 44} ${round(150 + r() * 10)} L${peakX} ${round(100 + r() * 20)} L${peakX + 48} ${round(152 + r() * 10)} L${peakX + 18} 140 L${peakX - 8} 158 Z" fill="#fff" opacity=".92"/>`);
    if (r() > 0.45) parts.push(`<ellipse cx="${round(120 + r() * 400)}" cy="318" rx="${round(70 + r() * 60)}" ry="16" fill="${p.water}"/>`);
    for (let i = 0; i < 4; i += 1) parts.push(`<path d="M0 ${300 + i * 26} C 200 ${285 + i * 26 - r() * 20} 420 ${315 + i * 26} 640 ${296 + i * 26}" stroke="${i % 2 ? p.accent : p.near}" stroke-width="${10 + i * 2}" fill="none" opacity=".55"/>`);
    parts.push(`<path d="${ridge(r, 345, 40, 4)}" fill="${p.near}"/>`);
  } else if (region === 'costa') {
    parts.push(`<path d="${ridge(r, 240, 60, 2)}" fill="${p.far}" opacity=".8"/>`);
    parts.push(`<rect y="245" width="640" height="155" fill="${p.water}"/>`);
    for (let i = 0; i < 5; i += 1) parts.push(`<path d="M${round(r() * 200 - 60)} ${262 + i * 18} q 40 -10 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0" stroke="#fff" stroke-width="3" fill="none" opacity="${round(0.35 + r() * 0.4)}"/>`);
    parts.push(`<path d="M0 400 L0 ${round(330 + r() * 20)} C 200 ${round(300 + r() * 30)} 380 ${round(345 + r() * 20)} 640 ${round(315 + r() * 25)} L640 400 Z" fill="${p.near}"/>`);
    const palmX = round(60 + r() * 500);
    parts.push(`<path d="M${palmX} 360 C ${palmX + 6} 320 ${palmX + 2} 290 ${palmX + 16} 250" stroke="#6b4a2b" stroke-width="7" fill="none"/>`);
    for (let a = 0; a < 5; a += 1) { const dx = -60 + a * 30; parts.push(`<path d="M${palmX + 16} 250 q ${dx / 2} -22 ${dx} ${round(4 + r() * 16)}" stroke="${p.mid}" stroke-width="9" fill="none" stroke-linecap="round"/>`); }
  } else if (region === 'amazonia') {
    parts.push(`<path d="${ridge(r, 210, 70, 5)}" fill="${p.far}"/>`);
    parts.push(trees(r, p.mid, 16, 230));
    const riverStart = round(200 + r() * 240);
    parts.push(`<path d="M${riverStart} 255 C ${riverStart - 120} 300 ${riverStart + 140} 330 ${round(r() * 640)} 400 L ${round(r() * 640) + 120} 400 C ${riverStart + 220} 330 ${riverStart - 40} 300 ${riverStart + 30} 255 Z" fill="${p.water}"/>`);
    parts.push(trees(r, p.near, 12, 330));
  } else {
    parts.push(`<rect y="230" width="640" height="170" fill="${p.water}"/>`);
    const islands = 2 + Math.floor(r() * 2);
    for (let i = 0; i < islands; i += 1) {
      const cx = round(80 + r() * 480); const w = round(90 + r() * 140); const h = round(50 + r() * 80);
      parts.push(`<path d="M${round(cx - w)} 240 Q ${cx} ${round(240 - h * 2)} ${round(cx + w)} 240 Z" fill="${i % 2 ? p.far : p.mid}"/>`);
    }
    for (let i = 0; i < 4; i += 1) parts.push(`<path d="M0 ${272 + i * 24} q 80 -8 160 0 t 160 0 t 160 0 t 160 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".4"/>`);
    const tx = round(120 + r() * 380);
    parts.push(`<g transform="translate(${tx} 345)"><ellipse rx="34" ry="21" fill="#4d6b4f"/><path d="M-22 -8 L22 -8 M-26 4 L26 4 M-12 -18 L-12 18 M12 -18 L12 18" stroke="#2f4a33" stroke-width="2.5"/><circle cx="40" cy="-3" r="9" fill="#6c8d6c"/></g>`);
    parts.push(`<path d="M0 400 L0 370 C 160 352 320 380 640 362 L640 400 Z" fill="${p.near}"/>`);
  }
  // Banda textil discreta: rombos simples, sin reproducir diseños de una comunidad concreta.
  let band = `<rect y="384" width="640" height="16" fill="${p.accent}"/>`;
  for (let x = 8; x < 640; x += 24) band += `<path d="M${x} 392 l6 -5 l6 5 l-6 5 Z" fill="${p.sun}"/>`;
  parts.push(band);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice">${parts.join('')}</svg>`;
}

const cache = new Map<string, string>();
export function experienceArt(experience: Pick<Experience, 'id' | 'localizedRegion'>): string {
  const key = `${experience.id}|${experience.localizedRegion}`;
  let value = cache.get(key);
  if (!value) { value = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(experienceArtSvg(experience.id, experience.localizedRegion))}`; cache.set(key, value); }
  return value;
}

export interface ExperienceVisual {
  src: string;
  /** srcset 640w/1280w solo cuando existe la versión grande. */
  srcSet?: string;
  alt: string;
  /** «Autor · licencia», para el pie de foto y el title de la tarjeta. */
  credit: string | null;
  /** Página de la obra original (Wikimedia Commons u otra), si se registró. */
  sourceUrl?: string;
  photo: boolean;
}

/**
 * Las fotos por ficha se guardan como /images/places/<id>-640.webp y <id>-1280.webp (siempre en par).
 * Si el registro trae `srcLarge`, manda ese valor; si no, solo se deduce la versión grande
 * para esa carpeta, nunca para imágenes regionales que no tienen par de 1280 px.
 */
export function largePhotoFor(media: { src: string; srcLarge?: unknown }): string | undefined {
  if (typeof media.srcLarge === 'string' && media.srcLarge.startsWith('/images/')) return media.srcLarge;
  if (/^\/images\/places\/[a-z0-9-]+-640\.webp$/.test(media.src)) return media.src.replace(/-640\.webp$/, '-1280.webp');
  return undefined;
}

/** Fotografía solo si muestra de verdad el lugar; si no, ilustración propia de la ficha. */
export function experienceVisual(experience: Experience): ExperienceVisual {
  const media = experience.media.find(item => item.depictsThisPlace) as (Experience['media'][number] & { srcLarge?: unknown; pageUrl?: unknown }) | undefined;
  if (media) {
    const large = largePhotoFor(media);
    return {
      src: media.src,
      ...(large ? { srcSet: `${media.src} 640w, ${large} 1280w` } : {}),
      alt: media.alt,
      credit: media.credit ? `${media.credit} · ${media.license}` : null,
      ...(typeof media.pageUrl === 'string' && /^https:\/\//.test(media.pageUrl) ? { sourceUrl: media.pageUrl } : {}),
      photo: true,
    };
  }
  return { src: experienceArt(experience), alt: `Ilustración original de ${experience.title}; no es una fotografía del lugar`, credit: null, photo: false };
}
