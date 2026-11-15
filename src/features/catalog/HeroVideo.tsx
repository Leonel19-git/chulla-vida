import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './hero-video.css';

export const HERO_VIDEO = '/video/chulla-vida-hero.webm';
export const HERO_POSTER = '/video/chulla-vida-hero-poster.webp';

function shouldAutoplay() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return !connection?.saveData;
  } catch { return false; }
}

/**
 * Fondo en video del hero (bucle sin textos con fotos reales). Archivo aparte, fuera del código inicial:
 * el `src` se asigna después de la carga, se pausa fuera de pantalla o con la pestaña oculta, y nunca
 * arranca solo con movimiento reducido o ahorro de datos. Debajo queda siempre la foto del hero.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [allowed] = useState(shouldAutoplay);
  const [userPaused, setUserPaused] = useState(false);
  const [src, setSrc] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);

  // Carga perezosa: el video se pide cuando la página ya terminó lo importante.
  useEffect(() => {
    if (!allowed) return;
    let idle: number | undefined;
    const start = () => setSrc(HERO_VIDEO);
    const schedule = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
      if (w.requestIdleCallback) idle = w.requestIdleCallback(start, { timeout: 2500 });
      else idle = window.setTimeout(start, 1200);
    };
    if (document.readyState === 'complete') schedule(); else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idle !== undefined) { if (w.cancelIdleCallback) w.cancelIdleCallback(idle); window.clearTimeout(idle); }
    };
  }, [allowed]);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    io.observe(node);
    return () => io.disconnect();
  }, [src]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !src) return;
    const sync = () => {
      const shouldPlay = visible && !userPaused && document.visibilityState === 'visible';
      if (shouldPlay && node.paused) { node.muted = true; void node.play()?.catch(() => setPlaying(false)); }
      if (!shouldPlay && !node.paused) node.pause();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [src, visible, userPaused]);

  if (!allowed) return null;
  return <>
    <video ref={ref} className={`vivo-hero-video ${playing ? 'is-playing' : ''}`} src={src} poster={HERO_POSTER} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1}
      onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} />
    {src && <button type="button" className="vivo-hero-video-toggle" onClick={() => setUserPaused(value => !value)} aria-label={userPaused ? 'Reproducir el video de fondo' : 'Pausar el video de fondo'}>
      {userPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </button>}
  </>;
}
