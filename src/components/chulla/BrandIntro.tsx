import { useApp } from '../../context/AppContext';
import { LanguageSelector } from './LanguageSelector';
import { kichwaReviewNotice } from '../../i18n/kichwa';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play, PlayCircle } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import './brand-intro.css';

export const INTRO_VIDEO = '/video/chulla-vida-intro.webm';
export const INTRO_POSTER = '/video/chulla-vida-intro-poster.webp';
/** Segundo en que el video pasa de las fotos al cierre con logo (ver scripts/make-intro-video.html). */
const OUTRO_AT = 14;

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/**
 * Intro de marca de la primera visita: video original a pantalla completa con fotos reales,
 * el logo animado encima y dos salidas claras («Entrar» y «Saltar»).
 * Con movimiento reducido no arranca sola: muestra el póster y un botón «Ver video».
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
  const [outro, setOutro] = useState(false);
  useEffect(() => { closeRef.current = onClose; });

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
    video.muted = true;
    const attempt = video.play?.();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => setPlaying(false));
  }, [wantsVideo, failed]);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!wantsVideo || video.paused) { setWantsVideo(true); void video.play()?.catch(() => setPlaying(false)); }
    else { setWantsVideo(false); video.pause(); }
  };

  const showVideo = !failed;
  return <dialog ref={dialogRef} className={`brand-intro cv-intro ${outro ? 'is-outro' : ''} ${leaving ? 'is-leaving' : ''} ${language.startsWith('ki') ? 'intro-kichwa' : ''}`} aria-labelledby="intro-title" aria-describedby="intro-description" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className="cv-intro-screen">
      {showVideo
        ? <video ref={videoRef} className="cv-intro-video" src={INTRO_VIDEO} poster={INTRO_POSTER} muted playsInline loop preload={reduced ? 'none' : 'auto'} autoPlay={!reduced} aria-hidden="true" tabIndex={-1} data-user-motion="true"
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}
            onTimeUpdate={event => setOutro(event.currentTarget.currentTime >= OUTRO_AT)} />
        : <img className="cv-intro-video" src={INTRO_POSTER} alt="" />}
      <div className="cv-intro-shade" aria-hidden="true" />
    </div>
    <div className="cv-intro-top"><LanguageSelector intro /><button className="cv-intro-skip" onClick={dismiss}>{t('Saltar')}<ArrowRight size={17} /></button></div>
    <div className="cv-intro-panel">
      <div className="cv-intro-logo"><AnimatedLogo /></div>
      <div className="cv-intro-copy">
        <h1 id="intro-title">{t('Descubre el Ecuador que se vive')}</h1>
        <p id="intro-description">{t('Sierra, Costa, Amazonía y Galápagos en fotos reales. Arma tu plan con gente de aquí.')}</p>
        {(language === 'ki' || language === 'ki-amz') && <p className="intro-language-lexicon" role="status">{kichwaReviewNotice}</p>}
        {['en', 'fr', 'pt', 'zh'].includes(language) && <p className="intro-language-scope">{{ en: 'Translated interface · Local stories remain in Spanish.', fr: 'Interface traduite · Récits locaux en espagnol.', pt: 'Interface traduzida · Relatos locais em espanhol.', zh: '界面已翻译 · 当地故事保留西班牙语。' }[language as 'en' | 'fr' | 'pt' | 'zh']}</p>}
      </div>
      <div className="cv-intro-actions">
        <button ref={enterRef} className="cv-intro-enter" onClick={dismiss} aria-label={t('Entrar a CHULLA VIDA')}>{t('Entrar')}<ArrowRight size={19} /></button>
        {showVideo && <button className="cv-intro-play" onClick={toggleVideo}>
          {playing ? <><Pause size={17} />{t('Pausar video')}</> : reduced && !wantsVideo ? <><PlayCircle size={17} />{t('Ver video')}</> : <><Play size={17} />{t('Reproducir video')}</>}
        </button>}
      </div>
      {reduced && !playing && showVideo && <p className="cv-intro-note">{t('Tienes activado el movimiento reducido: el video no arranca solo.')}</p>}
      <p className="cv-intro-credit">{t('Video original con fotos de Wikimedia Commons.')} <a href="/video/CREDITS.md" target="_blank" rel="noreferrer">{t('Créditos')}</a></p>
    </div>
  </dialog>;
}
