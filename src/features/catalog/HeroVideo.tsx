import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './hero-video.css';

import { useT } from '../../i18n/v3';
/** Bucle sin textos para el fondo del hero (scripts/make-video-ffmpeg.mjs, fotos reales de Wikimedia Commons). */
export const HERO_SOURCES = {
  /** H.264 vertical 720×1280 para celular en vertical. */
  portrait: '/video/chulla-vida-hero-720x1280.mp4',
  /** H.264 High 1920×1080: nítido en pantallas grandes; lo usa Safari/iPhone y casi todos. */
  mp4: '/video/chulla-vida-hero-1080.mp4',
  /** VP9 1920×1080 para navegadores sin H.264. */
  webm: '/video/chulla-vida-hero-1080.webm',
} as const;
export const HERO_VIDEO = HERO_SOURCES.mp4;
export const HERO_POSTER = '/video/chulla-vida-hero-poster.webp';
const PORTRAIT_MEDIA = '(max-width: 760px) and (orientation: portrait)';

function shouldAutoplay() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return !connection?.saveData;
  } catch { return false; }
}

/**
 * Fondo en video del hero (bucle sin costura). Las <source> se agregan después de la carga de la página
 * (requestIdleCallback), se pausa fuera de pantalla o con la pestaña oculta, y nunca arranca solo con
 * movimiento reducido o ahorro de datos. Debajo queda siempre la foto del hero.
 */
export function HeroVideo() {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const [allowed] = useState(shouldAutoplay);
  const [userPaused, setUserPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  // Si el navegador dice poder con H.264 pero no lo decodifica, se queda solo con el WebM.
  const [webmOnly, setWebmOnly] = useState(false);

  // Carga perezosa: el video se pide cuando la página ya terminó lo importante.
  useEffect(() => {
    if (!allowed) return;
    let idle: number | undefined;
    // Mientras la intro está abierta el hero no compite por la red: espera a que se cierre.
    const introOpen = () => Boolean(document.querySelector('dialog.cvi[open]'));
    const afterIntro = () => schedule();
    const start = () => {
      if (introOpen()) window.addEventListener('cv3:intro-closed', afterIntro, { once: true });
      else setLoaded(true);
    };
    const schedule = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number };
      if (w.requestIdleCallback) idle = w.requestIdleCallback(start, { timeout: 2500 });
      else idle = window.setTimeout(start, 1200);
    };
    if (document.readyState === 'complete') schedule(); else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      window.removeEventListener('cv3:intro-closed', afterIntro);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idle !== undefined) { if (w.cancelIdleCallback) w.cancelIdleCallback(idle); window.clearTimeout(idle); }
    };
  }, [allowed]);

  // Al agregar las <source> hay que pedir load(): el elemento ya existía sin fuentes.
  useEffect(() => {
    const node = ref.current;
    if (!node || !loaded) return;
    node.muted = true;
    node.defaultMuted = true;
    try { node.load(); } catch { /* jsdom */ }
  }, [loaded, webmOnly]);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    io.observe(node);
    return () => io.disconnect();
  }, [loaded, webmOnly]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !loaded || failed) return;
    const sync = () => {
      const shouldPlay = visible && !userPaused && document.visibilityState === 'visible';
      if (shouldPlay && node.paused) { node.muted = true; void node.play()?.catch(() => setPlaying(false)); }
      if (!shouldPlay && !node.paused) node.pause();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [loaded, visible, userPaused, failed, webmOnly]);

  if (!allowed || failed) return null;
  return <>
    <video key={webmOnly ? 'webm' : 'all'} ref={ref} className={`vivo-hero-video ${playing ? 'is-playing' : ''}`} poster={HERO_POSTER} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1} disablePictureInPicture
      onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={event => { if (!webmOnly && /\.mp4$/i.test(event.currentTarget.currentSrc)) setWebmOnly(true); else setFailed(true); }}>
      {loaded && <>
        {!webmOnly && <source src={HERO_SOURCES.portrait} type="video/mp4" media={PORTRAIT_MEDIA} />}
        {!webmOnly && <source src={HERO_SOURCES.mp4} type='video/mp4; codecs="avc1.640028"' />}
        <source src={HERO_SOURCES.webm} type='video/webm; codecs="vp9"' onError={() => setFailed(true)} />
      </>}
    </video>
    {loaded && <button type="button" className="vivo-hero-video-toggle" onClick={() => setUserPaused(value => !value)} aria-label={userPaused ? t("Reproducir el video de fondo") : t("Pausar el video de fondo")}>
      {userPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </button>}
  </>;
}
