import { useApp } from '../../context/AppContext';
import { LanguageSelector } from './LanguageSelector';
import { kichwaReviewNotice } from '../../i18n/kichwa';
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { ArrowRight, Pause, Play, PlayCircle } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';

/** Videos de la intro, hechos con scripts/make-video-ffmpeg.mjs a partir de fotos reales (sin texto incrustado). */
export const INTRO_SOURCES = {
  /** H.264 vertical 720×1280: celular en vertical (iPhone y Android). */
  portrait: '/video/chulla-vida-intro-720x1280.mp4',
  /** H.264 High 1920×1080: Safari/iPhone y el resto de navegadores con H.264. */
  mp4: '/video/chulla-vida-intro-1080.mp4',
  /** VP9 1920×1080: navegadores sin H.264. */
  webm: '/video/chulla-vida-intro-1080.webm',
} as const;
export const INTRO_VIDEO = INTRO_SOURCES.mp4;
export const INTRO_POSTER = '/video/chulla-vida-intro-poster.webp';
export const INTRO_POSTER_PORTRAIT = '/video/chulla-vida-intro-poster-portrait.webp';
export const INTRO_CUES_URL = '/video/intro-cues.json';
/** Celular o tablet en vertical: usa el encuadre vertical (el sujeto no queda cortado). */
export const PORTRAIT_MEDIA = '(max-width: 900px) and (orientation: portrait)';

export type IntroCue = {
  start: number;
  end: number;
  place: string;
  region: string;
  province: string;
  credit: { author: string; license: string; licenseUrl?: string | null; source?: string };
};
export type IntroCues = { duration: number; closingStart: number; shots: IntroCue[] };

/** Valida el JSON de tomas; si algo no cuadra, la intro sigue sin títulos (nunca con datos rotos). */
export function parseIntroCues(data: unknown): IntroCues | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Partial<IntroCues>;
  if (typeof value.duration !== 'number' || typeof value.closingStart !== 'number' || !Array.isArray(value.shots) || value.shots.length === 0) return null;
  const shots = value.shots.filter((shot): shot is IntroCue => Boolean(shot) && typeof shot.start === 'number' && typeof shot.end === 'number' && shot.end > shot.start
    && typeof shot.place === 'string' && typeof shot.region === 'string' && typeof shot.province === 'string'
    && Boolean(shot.credit) && typeof shot.credit.author === 'string' && typeof shot.credit.license === 'string');
  if (shots.length !== value.shots.length) return null;
  return { duration: value.duration, closingStart: value.closingStart, shots };
}

/** Índice de la toma que se ve en el segundo `time`; -1 en el cierre azul (o sin datos). */
export function cueIndexAt(cues: IntroCues | null, time: number): number {
  if (!cues || !Number.isFinite(time)) return -1;
  if (time >= cues.closingStart) return -1;
  for (let i = cues.shots.length - 1; i >= 0; i--) if (time >= cues.shots[i].start) return i;
  return 0;
}

/** Avance (0–1) de cada segmento de la barra de progreso. */
export function shotProgress(cues: IntroCues | null, time: number): number[] {
  if (!cues) return [];
  return cues.shots.map(shot => Math.min(1, Math.max(0, (time - shot.start) / (shot.end - shot.start))));
}

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/**
 * Intro de marca de la primera visita (y con «Ver intro»): video a pantalla completa con fotos reales,
 * títulos nítidos en HTML sincronizados con cada toma y una barra inferior compacta que no tapa el video.
 * Con movimiento reducido no arranca sola: póster con el título de la primera toma y botón «Ver video».
 */
export function BrandIntro({ onClose }: { onClose: () => void }) {
  const { t, language } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef(onClose);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [reduced] = useState(reducedMotion);
  const [wantsVideo, setWantsVideo] = useState(() => !reducedMotion());
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  // Algunos navegadores dicen poder con H.264 y luego no lo decodifican: entonces se prueba solo el WebM.
  const [webmOnly, setWebmOnly] = useState(false);
  const [time, setTime] = useState(0);
  const [cues, setCues] = useState<IntroCues | null>(null);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    let alive = true;
    try {
      void fetch(INTRO_CUES_URL).then(response => response.ok ? response.json() : null).then(data => { if (alive) setCues(parseIntroCues(data)); }).catch(() => {});
    } catch { /* sin red: la intro sigue sin títulos */ }
    return () => { alive = false; };
  }, []);

  const dismiss = useCallback(() => {
    if (exitTimer.current) return;
    setLeaving(true);
    videoRef.current?.pause();
    exitTimer.current = setTimeout(() => closeRef.current(), reducedMotion() ? 0 : 260);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog?.setAttribute('open', '');
    enterRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = null;
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  // Pausa el video si la pestaña se oculta y lo retoma al volver (solo si la persona no lo pausó).
  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video || !wantsVideo) return;
      if (document.visibilityState === 'hidden') video.pause();
      else void video.play()?.catch(() => setPlaying(false));
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [wantsVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !wantsVideo || failed) return;
    // iOS exige muted como propiedad (no solo atributo) para reproducir en línea sin gesto.
    video.muted = true;
    video.defaultMuted = true;
    const attempt = video.play?.();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => setPlaying(false));
  }, [wantsVideo, failed, webmOnly]);

  // Sincronía fina de títulos: timeupdate llega cada ~250 ms (en Safari a veces más); con el video en marcha
  // se lee el tiempo en cada fotograma (requestVideoFrameCallback o requestAnimationFrame), redondeado a 0,1 s.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing || reduced) return;
    type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (id: number) => void };
    const node = video as FrameVideo;
    let id = 0;
    let usingFrames = false;
    const tick = () => {
      setTime(Math.round(node.currentTime * 10) / 10);
      usingFrames = typeof node.requestVideoFrameCallback === 'function';
      id = usingFrames ? node.requestVideoFrameCallback!(tick) : requestAnimationFrame(tick);
    };
    tick();
    return () => { if (usingFrames) node.cancelVideoFrameCallback?.(id); else cancelAnimationFrame(id); };
  }, [playing, reduced, webmOnly]);

  const onVideoError =(event: SyntheticEvent<HTMLVideoElement>) => {
    if (!webmOnly && /\.mp4$/i.test(event.currentTarget.currentSrc)) setWebmOnly(true);
    else setFailed(true);
  };

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { setWantsVideo(false); video.pause(); return; }
    setWantsVideo(true);
    if (video.preload === 'none') video.preload = 'auto';
    void video.play()?.catch(() => setPlaying(false));
  };

  const showVideo = !failed;
  // Con movimiento reducido y sin video en marcha, título estático de la primera toma (la del póster).
  const index = reduced && !playing ? (cues ? 0 : -1) : cueIndexAt(cues, time);
  const cue = index >= 0 ? cues?.shots[index] : undefined;
  const outro = Boolean(cues) && index === -1 && !(reduced && !playing);
  const progress = shotProgress(cues, reduced && !playing ? 0 : time);
  const playLabel = playing ? t('Pausar video') : reduced && !wantsVideo ? t('Ver video') : t('Reproducir video');

  return <dialog ref={dialogRef} className={`brand-intro cvi ${outro ? 'is-outro' : ''} ${reduced ? 'is-reduced' : ''} ${leaving ? 'is-leaving' : ''} ${language.startsWith('ki') ? 'intro-kichwa' : ''}`} aria-labelledby="intro-title" aria-describedby="intro-description" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className="cvi-stage">
      {showVideo
        ? <video key={webmOnly ? 'webm' : 'all'} ref={videoRef} className="cv-intro-video cvi-video" poster={INTRO_POSTER} muted playsInline loop preload={reduced ? 'none' : 'auto'} autoPlay={!reduced} aria-hidden="true" tabIndex={-1} data-user-motion="true" disablePictureInPicture disableRemotePlayback
            onPlay={() => setPlaying(true)} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={onVideoError}
            onTimeUpdate={event => setTime(event.currentTarget.currentTime)}>
            {!webmOnly && <source src={INTRO_SOURCES.portrait} type="video/mp4" media={PORTRAIT_MEDIA} />}
            {!webmOnly && <source src={INTRO_SOURCES.mp4} type='video/mp4; codecs="avc1.640028"' />}
            {/* Si ninguna fuente sirve, el error llega a la última <source>, no al <video>. */}
            <source src={INTRO_SOURCES.webm} type='video/webm; codecs="vp9"' onError={() => setFailed(true)} />
          </video>
        : <picture><source media={PORTRAIT_MEDIA} srcSet={INTRO_POSTER_PORTRAIT} /><img className="cv-intro-video cvi-video" src={INTRO_POSTER} alt="" /></picture>}
      <div className="cvi-shade" aria-hidden="true" />
    </div>

    <div className="cvi-top"><LanguageSelector intro /></div>

    {cue && <div className="cvi-cue" key={index} aria-hidden={!reduced}>
      <p className="cvi-place">{cue.place}</p>
      <p className="cvi-chip"><span>{cue.region}</span><span aria-hidden="true">·</span><span>{cue.province}</span></p>
      <p className="cvi-photo-credit">{t('Foto')}: {cue.credit.author} · {cue.credit.license}</p>
    </div>}
    {outro && <div className="cvi-outro" aria-hidden="true"><p className="cvi-wordmark">CHULLA VIDA</p><p>Sierra · Costa · Amazonía · Galápagos</p></div>}

    <div className="cvi-bar">
      {progress.length > 0 && <div className="cvi-progress" aria-hidden="true">{progress.map((value, i) => <span key={i}><i style={{ transform: `scaleX(${value})` }} /></span>)}</div>}
      <div className="cvi-bar-row">
        <div className="cvi-brand">
          <div className="cvi-logo"><AnimatedLogo variant="compact" /></div>
          <div className="cvi-copy">
            <h1 id="intro-title">{t('Descubre el Ecuador que se vive')}</h1>
            <p id="intro-description">{t('Sierra, Costa, Amazonía y Galápagos en fotos reales. Arma tu plan con gente de aquí.')}</p>
            {(language === 'ki' || language === 'ki-amz') && <p className="intro-language-lexicon" role="status">{kichwaReviewNotice}</p>}
            {['en', 'fr', 'pt', 'zh'].includes(language) && <p className="intro-language-scope">{{ en: 'Translated interface · Local stories remain in Spanish.', fr: 'Interface traduite · Récits locaux en espagnol.', pt: 'Interface traduzida · Relatos locais em espanhol.', zh: '界面已翻译 · 当地故事保留西班牙语。' }[language as 'en' | 'fr' | 'pt' | 'zh']}</p>}
          </div>
        </div>
        <div className="cvi-actions">
          <button ref={enterRef} className="cvi-enter" onClick={dismiss} aria-label={t('Entrar a CHULLA VIDA')}>{t('Entrar')}<ArrowRight size={19} aria-hidden="true" /></button>
          {showVideo && <button className="cvi-ghost cvi-play" onClick={toggleVideo} aria-label={playLabel}>
            {playing ? <Pause size={18} aria-hidden="true" /> : reduced && !wantsVideo ? <PlayCircle size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            <span>{playLabel}</span>
          </button>}
          <button className="cvi-ghost cvi-skip" onClick={dismiss}>{t('Saltar')}</button>
        </div>
      </div>
      <div className="cvi-foot">
        {reduced && !playing && showVideo && <p className="cvi-note">{t('Tienes activado el movimiento reducido: el video no arranca solo.')}</p>}
        <p className="cvi-credit">{t('Video original con fotos reales de Wikimedia Commons.')} <a href="/video/CREDITS.md" target="_blank" rel="noreferrer">{t('Créditos')}</a></p>
      </div>
    </div>
  </dialog>;
}
