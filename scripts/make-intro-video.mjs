#!/usr/bin/env node
/**
 * Genera el video de intro de CHULLA VIDA a partir de fotos reales del catálogo.
 *
 * Procedimiento
 * 1. Levanta Vite en un puerto libre (nunca el 5173) para servir
 *    scripts/make-intro-video.html, las fotos de public/images/places y las fuentes.
 * 2. Abre la página con Playwright (Chromium sin ventana) a 1280×720.
 * 3. Modo por defecto («frames»): pide cada fotograma con window.cvFrameJpeg(t) a 30 fps
 *    y lo envía al ffmpeg que instala Playwright (`npx playwright install ffmpeg`), que lo
 *    codifica en VP9/WebM sin audio. Es determinista: no pierde fotogramas aunque la máquina
 *    vaya lenta.
 *    Modo «--realtime»: reproduce la animación y la graba con recordVideo de Playwright
 *    (VP8, ~1 Mbps). Sirve si el ffmpeg local no tiene VP9; la calidad es menor.
 * 4. Escribe:
 *    public/video/chulla-vida-intro.webm         intro con nombres de lugar, región y logo (~16 s)
 *    public/video/chulla-vida-intro-poster.webp  fotograma de la intro (Quilotoa)
 *    public/video/chulla-vida-hero.webm          bucle sin textos, 960 px, para el fondo del hero
 *    public/video/chulla-vida-hero-poster.webp   primer fotograma del bucle
 *    (los pósteres salen del canvas en WebP; no hace falta PIL).
 *
 * Uso:  node scripts/make-intro-video.mjs [--realtime] [--port 5291]
 * Requisitos: dependencias del proyecto instaladas y Chromium + ffmpeg de Playwright.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'video');
const args = process.argv.slice(2);
const realtime = args.includes('--realtime');
const portArg = args.indexOf('--port');
const port = portArg >= 0 ? Number(args[portArg + 1]) : 5291;
const FPS = 30;

function findFfmpeg() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.platform === 'win32' ? join(homedir(), 'AppData', 'Local', 'ms-playwright') : process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright'));
  if (!existsSync(base)) return null;
  for (const dir of readdirSync(base).filter(name => name.startsWith('ffmpeg')).sort().reverse()) {
    for (const exe of ['ffmpeg-win64.exe', 'ffmpeg-linux', 'ffmpeg-mac', 'ffmpeg']) if (existsSync(join(base, dir, exe))) return join(base, dir, exe);
  }
  return null;
}

async function encodeFrames(page, file, ffmpeg, { crf = 38, width = 1280 } = {}) {
  const duration = await page.evaluate(() => window.cvDuration);
  const frames = Math.round(duration * FPS);
  const encoder = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
    ...(width !== 1280 ? ['-vf', `scale=${width}:-2`] : []), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => encoder.on('close', code => code === 0 ? ok() : fail(new Error(`ffmpeg terminó con código ${code}`))));
  for (let i = 0; i < frames; i++) {
    const data = await page.evaluate(t => window.cvFrameJpeg(t, 0.9), i / FPS);
    const chunk = Buffer.from(data.split(',')[1], 'base64');
    if (!encoder.stdin.write(chunk)) await new Promise(ok => encoder.stdin.once('drain', ok));
    if (i % FPS === 0) process.stdout.write(`\r  ${file.split(/[\\/]/).pop()}: ${Math.round((i / frames) * 100)} %`);
  }
  encoder.stdin.end();
  await done;
  process.stdout.write(`\r  ${file.split(/[\\/]/).pop()}: 100 %\n`);
}

async function poster(page, t, file) {
  const data = await page.evaluate(async time => { await window.cvRenderFrame(time); return document.querySelector('canvas').toDataURL('image/webp', 0.8); }, t);
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
}

async function recordRealtime(browser, url, file) {
  const tmp = join(outDir, '.rec');
  rmSync(tmp, { recursive: true, force: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  await page.goto(url.replace('record=1', 'live=1'));
  await page.evaluate(() => window.cvReady);
  const duration = await page.evaluate(() => window.cvDuration);
  await page.waitForTimeout(duration * 1000 + 200);
  const video = page.video();
  await context.close();
  renameSync(await video.path(), file);
  rmSync(tmp, { recursive: true, force: true });
}

mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } });
await server.listen();
const base = `http://localhost:${port}/scripts/make-intro-video.html`;
const browser = await chromium.launch();
try {
  const ffmpeg = findFfmpeg();
  if (!realtime && !ffmpeg) throw new Error('No encontré el ffmpeg de Playwright. Ejecuta `npx playwright install ffmpeg` o usa --realtime.');
  for (const variant of [
    { name: 'chulla-vida-intro', query: '?record=1', posterAt: 1.1, crf: 38, width: 1280 },
    // El fondo del hero va más liviano: 960 px de ancho y más compresión (queda bajo textos y sombra).
    { name: 'chulla-vida-hero', query: '?record=1&clean=1', posterAt: 0.2, crf: 44, width: 960 },
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(base + variant.query);
    await page.evaluate(() => window.cvReady);
    const file = join(outDir, `${variant.name}.webm`);
    if (realtime) await recordRealtime(browser, base + variant.query, file);
    else await encodeFrames(page, file, ffmpeg, variant);
    await poster(page, variant.posterAt, join(outDir, `${variant.name}-poster.webp`));
    await page.close();
    console.log(`  ${variant.name}.webm: ${(statSync(file).size / 1024 / 1024).toFixed(2)} MB`);
  }
} finally {
  await browser.close();
  await server.close();
}
