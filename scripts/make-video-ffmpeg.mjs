#!/usr/bin/env node
/**
 * Videos de CHULLA VIDA hechos con ffmpeg directamente desde las fotos reales del catálogo
 * (public/images/places/*-1280.webp, Wikimedia Commons). Sustituye a scripts/make-intro-video.mjs,
 * que grababa un canvas a 1280×720 con textos incrustados y salía borroso.
 *
 * Qué hace
 * - Cada toma: la foto se escala con lanczos a 3× el tamaño de salida, se recorta al encuadre y
 *   se le aplica Ken Burns suave con zoompan (el escalado grande evita el temblor de píxel entero).
 *   Después un unsharp leve. SIN texto en el video: los títulos van en HTML (intro-cues.json).
 * - Las tomas se encadenan con xfade (fundido) y la intro cierra con 2 s de azul marino de marca.
 * - Dos encuadres: horizontal 1920×1080 (escritorio) y vertical 720×1280 (celular en vertical),
 *   cada uno con su punto de interés para que el sujeto no quede cortado.
 *
 * Salidas (public/video/)
 *   chulla-vida-intro-1080.mp4       H.264 High, yuv420p, CRF 20, preset slow, +faststart, sin audio
 *   chulla-vida-intro-1080.webm      VP9, CRF 32, b:v 0, row-mt
 *   chulla-vida-intro-720x1280.mp4   H.264 vertical para celular
 *   chulla-vida-intro-poster.webp    póster horizontal (y -portrait.webp, vertical)
 *   intro-cues.json                  tiempos, lugar, región, provincia y crédito de cada toma
 *   chulla-vida-hero-1080.mp4/.webm, chulla-vida-hero-720x1280.mp4, chulla-vida-hero-poster.webp
 *     bucle sin costura para el fondo de la portada (otras fotos y otros recortes)
 *
 * Uso: node scripts/make-video-ffmpeg.mjs [--only intro|hero] [--fast]
 *   --fast  baja la calidad (preset veryfast) para probar encuadres rápido; no publicar así.
 * Requisitos: dependencias instaladas (ffmpeg-static trae libx264, libvpx-vp9 y libwebp).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const places = join(root, 'public', 'images', 'places');
const outDir = join(root, 'public', 'video');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const fast = args.includes('--fast');
const FPS = 30;
const NAVY = '0x011a40';
const credits = new Map(JSON.parse(readFileSync(join(root, 'scripts', 'place-images.json'), 'utf8')).map(item => [item.id, item]));

/**
 * Toma: foto, datos para el título HTML y movimiento.
 * z: zoom inicial→final. land/port: punto de interés [x, y] (0–1) al inicio y al final, por encuadre.
 */
const INTRO = [
  { id: 'gen-02-quilotoa-shalala', place: 'Laguna del Quilotoa', region: 'Sierra', province: 'Cotopaxi', z: [1.0, 1.1], land: [[0.5, 0.62], [0.5, 0.66]], port: [[0.3, 0.6], [0.4, 0.62]] },
  { id: 'gen-09-parque-nacional-cotopaxi', place: 'Volcán Cotopaxi', region: 'Sierra', province: 'Cotopaxi', z: [1.12, 1.0], land: [[0.48, 0.35], [0.5, 0.45]], port: [[0.5, 0.42], [0.5, 0.48]] },
  { id: 'gen-07-banos-de-agua-santa', place: 'Pailón del Diablo', region: 'Sierra', province: 'Tungurahua', z: [1.0, 1.12], land: [[0.55, 0.5], [0.6, 0.55]], port: [[0.62, 0.5], [0.66, 0.55]] },
  { id: 'costa-01-raices-de-manabi', place: 'Laguna de Agua Blanca', region: 'Costa', province: 'Manabí', z: [1.1, 1.0], land: [[0.4, 0.5], [0.6, 0.5]], port: [[0.35, 0.5], [0.55, 0.5]] },
  { id: 'costa-03-pacifico-activo', place: 'Playa de Salinas', region: 'Costa', province: 'Santa Elena', z: [1.0, 1.1], land: [[0.55, 0.5], [0.65, 0.55]], port: [[0.62, 0.5], [0.72, 0.55]] },
  { id: 'amz-01-reserva-cuyabeno', place: 'Laguna Grande de Cuyabeno', region: 'Amazonía', province: 'Sucumbíos', z: [1.12, 1.0], land: [[0.6, 0.6], [0.55, 0.55]], port: [[0.68, 0.6], [0.62, 0.55]] },
  { id: 'gal-04-kicker-rock-tour-360', place: 'León Dormido (Kicker Rock)', region: 'Galápagos', province: 'San Cristóbal, Galápagos', z: [1.0, 1.1], land: [[0.62, 0.6], [0.66, 0.62]], port: [[0.82, 0.6], [0.86, 0.62]] },
  { id: 'gal-01-bartolome-bahia-sullivan', place: 'Isla Bartolomé', region: 'Galápagos', province: 'Galápagos', z: [1.1, 1.0], land: [[0.45, 0.55], [0.55, 0.6]], port: [[0.3, 0.6], [0.36, 0.62]] },
];
const HERO = [
  { id: 'gen-09-parque-nacional-cotopaxi', z: [1.0, 1.08], land: [[0.5, 0.4], [0.5, 0.45]], port: [[0.48, 0.45], [0.52, 0.45]] },
  { id: 'gal-04-kicker-rock-tour-360', z: [1.08, 1.0], land: [[0.6, 0.55], [0.66, 0.6]], port: [[0.72, 0.6], [0.66, 0.6]] },
  { id: 'amz-10-laguna-anango', z: [1.0, 1.08], land: [[0.4, 0.5], [0.5, 0.55]], port: [[0.4, 0.5], [0.5, 0.55]] },
  { id: 'costa-03-pacifico-activo', z: [1.08, 1.0], land: [[0.7, 0.5], [0.6, 0.5]], port: [[0.7, 0.5], [0.6, 0.5]] },
  { id: 'gen-02-quilotoa-shalala', z: [1.0, 1.08], land: [[0.4, 0.6], [0.55, 0.62]], port: [[0.25, 0.6], [0.4, 0.62]] },
];

const FRAMES = { land: { w: 1920, h: 1080 }, port: { w: 720, h: 1280 } };

function run(argv, label) {
  const started = Date.now();
  process.stdout.write(`  ${label}… `);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`ffmpeg falló en ${label} (código ${result.status})`);
  console.log(`${((Date.now() - started) / 1000).toFixed(0)} s`);
}

const lerp = (a, b, k) => `(${a}+(${b - a})*${k})`;

/** Filtro de una toma: escala grande con lanczos, recorte al formato de salida y zoompan. */
function shotFilter(input, shot, frame, seconds, label) {
  const { w, h } = FRAMES[frame];
  const big = { w: w * 3, h: h * 3 };
  const [[fx0, fy0], [fx1, fy1]] = shot[frame];
  const frames = Math.round(seconds * FPS);
  // Progreso 0→1 con salida suave (sin arranque brusco entre tomas).
  const k = `(1-pow(1-on/${frames - 1},1.6))`;
  const zoom = lerp(shot.z[0], shot.z[1], k);
  const fx = lerp(fx0, fx1, k);
  const fy = lerp(fy0, fy1, k);
  // Primero cubre el lienzo grande (increase) y recorta centrado en el punto de interés.
  const cover = `scale=${big.w}:${big.h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${big.w}:${big.h}:(iw-${big.w})*${fx0}:(ih-${big.h})*${fy0}`;
  const pan = `zoompan=z='${zoom}':x='(iw-iw/zoom)*${fx}':y='(ih-ih/zoom)*${fy}':d=${frames}:s=${w}x${h}:fps=${FPS}`;
  return `[${input}:v]${cover},${pan},unsharp=5:5:0.35:5:5:0,setsar=1,format=yuv420p[${label}]`;
}

/**
 * Cadena completa: tomas de `seconds` (más el fundido), xfade entre ellas y, si `closing`,
 * un cierre azul marino. Devuelve el filtergraph, la etiqueta final y los tiempos de cada toma.
 */
function chain(shots, frame, { seconds, fade, closing = 0, loop = false }) {
  const parts = [];
  const list = loop ? [...shots, shots[0]] : shots;
  list.forEach((shot, i) => parts.push(shotFilter(i, shot, frame, seconds + fade, `s${i}`)));
  let last = 's0';
  let length = seconds + fade;
  const cues = [{ start: 0 }];
  for (let i = 1; i < list.length; i++) {
    const offset = +(i * seconds).toFixed(3);
    parts.push(`[${last}][s${i}]xfade=transition=fade:duration=${fade}:offset=${offset}[x${i}]`);
    last = `x${i}`;
    length = offset + seconds + fade;
    cues.push({ start: +(offset + fade / 2).toFixed(2) });
  }
  if (closing) {
    const { w, h } = FRAMES[frame];
    const offset = +(list.length * seconds).toFixed(3);
    parts.push(`color=c=${NAVY}:s=${w}x${h}:r=${FPS}:d=${closing + fade},format=yuv420p,setsar=1[navy]`);
    parts.push(`[${last}][navy]xfade=transition=fade:duration=${fade}:offset=${offset}[xc]`);
    last = 'xc';
    length = offset + closing + fade;
  }
  if (loop) {
    // La última toma repite la primera: desde `fade` hasta `fade + periodo` el video es periódico,
    // así que ese tramo hace bucle sin salto.
    const period = shots.length * seconds;
    parts.push(`[${last}]trim=start=${fade}:duration=${period},setpts=PTS-STARTPTS[loop]`);
    last = 'loop';
    length = period;
  }
  return { graph: parts.join(';'), out: last, length, cues };
}

function inputs(shots, loop) {
  return (loop ? [...shots, shots[0]] : shots).flatMap(shot => ['-i', join(places, `${shot.id}-1280.webp`)]);
}

const x264 = (crf, extra = []) => ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', fast ? 'veryfast' : 'slow', '-crf', String(crf), '-tune', 'film', ...extra, '-movflags', '+faststart', '-an'];
const vp9 = crf => ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', fast ? '5' : '2', '-tile-columns', '2', '-pix_fmt', 'yuv420p', '-an'];

function render(name, shots, options) {
  const { landCrf, webmCrf, portCrf, posterAt, maxrate } = options;
  const loop = Boolean(options.loop);
  const land = chain(shots, 'land', options);
  const port = chain(shots, 'port', options);
  // Tope de bitrate para que CRF no se dispare en los fundidos (VBV de 2 s).
  const cap = rate => ['-maxrate', rate, '-bufsize', `${parseFloat(rate) * 2}M`];
  const mp4 = join(outDir, `${name}-1080.mp4`);
  const webm = join(outDir, `${name}-1080.webm`);
  const vertical = join(outDir, `${name}-720x1280.mp4`);
  run([...inputs(shots, loop), '-filter_complex', `${land.graph};[${land.out}]split=2[a][b]`,
    '-map', '[a]', ...x264(landCrf, cap(maxrate.land)), '-r', String(FPS), mp4,
    '-map', '[b]', ...vp9(webmCrf), '-r', String(FPS), webm], `${name} 1920×1080 (mp4 + webm)`);
  run([...inputs(shots, loop), '-filter_complex', port.graph, '-map', `[${port.out}]`, ...x264(portCrf, cap(maxrate.port)), '-r', String(FPS), vertical], `${name} 720×1280 vertical`);
  run(['-ss', String(posterAt), '-i', mp4, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '84', '-compression_level', '6', join(outDir, `${name}-poster.webp`)], `${name} póster`);
  run(['-ss', String(posterAt), '-i', vertical, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', join(outDir, `${name}-poster-portrait.webp`)], `${name} póster vertical`);
  for (const file of [mp4, webm, vertical]) console.log(`    ${file.split(/[\\/]/).pop()}: ${(statSync(file).size / 1024 / 1024).toFixed(2)} MB`);
  return land;
}

if (!only || only === 'intro') {
  console.log('Intro:');
  const SECONDS = 2.5, FADE = 0.6, CLOSING = 2;
  const land = render('chulla-vida-intro', INTRO, { seconds: SECONDS, fade: FADE, closing: CLOSING, landCrf: 23, webmCrf: 47, portCrf: 24, posterAt: 1.2, maxrate: { land: '1.6M', port: '0.8M' } });
  const shots = INTRO.map((shot, i) => {
    const credit = credits.get(shot.id);
    if (!credit) throw new Error(`Falta el crédito de ${shot.id} en scripts/place-images.json`);
    const end = i + 1 < INTRO.length ? land.cues[i + 1].start : +(INTRO.length * SECONDS + FADE / 2).toFixed(2);
    return {
      start: land.cues[i].start, end, place: shot.place, region: shot.region, province: shot.province, photo: shot.id,
      credit: { author: credit.author, license: credit.license, licenseUrl: credit.licenseUrl ?? null, source: credit.pageUrl },
    };
  });
  const cues = {
    generatedBy: 'scripts/make-video-ffmpeg.mjs',
    duration: +land.length.toFixed(2),
    closingStart: shots.at(-1).end,
    shots,
  };
  writeFileSync(join(outDir, 'intro-cues.json'), JSON.stringify(cues, null, 2) + '\n');
  console.log(`    intro-cues.json: ${shots.length} tomas, ${cues.duration} s`);
}
if (!only || only === 'hero') {
  console.log('Hero:');
  render('chulla-vida-hero', HERO, { seconds: 3, fade: 0.8, loop: true, landCrf: 26, webmCrf: 50, portCrf: 27, posterAt: 0.1, maxrate: { land: '1.1M', port: '0.55M' } });
}
