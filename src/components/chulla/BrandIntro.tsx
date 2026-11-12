import { useApp } from '../../context/AppContext';
import { LanguageSelector } from './LanguageSelector';
import { kichwaReviewNotice } from '../../i18n/kichwa';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Leaf, MapPin, Mountain, PauseCircle, PlayCircle, RotateCcw, Users, Waves } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';

const regions = [
  { name: 'Sierra', icon: Mountain, image: '/images/hero.jpg', caption: 'Un plan entre montañas.', location: 'Quilotoa · Cotopaxi' },
  { name: 'Costa', icon: Waves, image: '/images/coast.jpg', caption: 'Un respiro en la Costa.', location: 'Agua Blanca · Manabí' },
  { name: 'Amazonía', icon: Leaf, image: '/images/forest.jpg', caption: 'Conecta con el bosque.', location: 'Bosque · Imagen de referencia' },
];

/** A visible, user-dismissed welcome. The original logo remains unaltered. */
export function BrandIntro({ onClose }: { onClose: () => void }) {
  const { t, language } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [logoTake, setLogoTake] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [forceMotion, setForceMotion] = useState(false);
  const [region, setRegion] = useState(0);
  closeRef.current = onClose;
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(preference.matches); setForceMotion(false); };
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  const dismiss = useCallback(() => {
    if (exitTimer.current) return;
    setLeaving(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    exitTimer.current = setTimeout(() => closeRef.current(), reduced ? 0 : 260);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    skipRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = null;
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialogRef} className={`brand-intro brand-intro-room ${language.startsWith('ki') ? 'intro-kichwa' : ''} ${leaving ? 'is-leaving' : ''}`} aria-labelledby="intro-title" aria-describedby="intro-description" onCancel={e => { e.preventDefault(); dismiss(); }}>
    <LanguageSelector intro /><button ref={skipRef} className="intro-skip" onClick={dismiss}>{t("Saltar intro")}<ArrowRight size={17} /></button>
    <div className="intro-scene"><img key={region} src={regions[region].image} alt={regions[region].location} fetchPriority="high" /><div className="intro-scene-shade" /><p>{t(regions[region].caption)}<br /><span>{t("¿Te apuntas?")}</span></p><span><MapPin size={14} />{regions[region].location}</span><div className="intro-region-picker" role="group" aria-label={t("Explora las regiones")}>{regions.map(({ name, icon: Icon }, index) => <button key={t(name)} onClick={() => setRegion(index)} aria-pressed={region === index}><Icon size={21} /><span>{t(name)}</span></button>)}</div></div>
    <div className="intro-content">
      <div className="intro-logo"><AnimatedLogo key={logoTake} paused={paused} forceMotion={forceMotion} /></div>
      <h1 id="intro-title">{t("Tu gente.")}<br />{t("Tu país. Tu plan.")}</h1>
      <p id="intro-description">{t("Junta a tus panas. Lo bueno está por descubrir.")}</p>
      {(language === 'ki' || language === 'ki-amz') && <p className="intro-language-lexicon" role="status">{kichwaReviewNotice}</p>}
      {['en', 'fr', 'pt', 'zh'].includes(language) && <p className="intro-language-scope">{{ en: 'Translated interface · Local stories remain in Spanish.', fr: 'Interface traduite · Récits locaux en espagnol.', pt: 'Interface traduzida · Relatos locais em espanhol.', zh: '界面已翻译 · 当地故事保留西班牙语。' }[language as 'en' | 'fr' | 'pt' | 'zh']}</p>}
      <div className="intro-woven" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <button className="button button-primary intro-enter" onClick={dismiss} aria-label={t("Entrar a CHULLA VIDA")}>{t("¡De ley, vamos!")}<ArrowRight size={18} /></button>
      <div className="intro-motion-controls" role="group" aria-label={t("Animación del logo")}><button onClick={() => { if (reducedMotion && !forceMotion) { setForceMotion(true); setPaused(false); } else setPaused(value => !value); }} aria-pressed={paused}>{paused || (reducedMotion && !forceMotion) ? <PlayCircle size={16} /> : <PauseCircle size={16} />}{t(reducedMotion && !forceMotion ? 'Reproducir animación' : paused ? 'Animar logo' : 'Pausar logo')}</button><button onClick={() => { if (reducedMotion) setForceMotion(true); setPaused(false); setLogoTake(value => value + 1); }}><RotateCcw size={15} />{t("Repetir animación")}</button></div>
      {reducedMotion && !forceMotion && <p className="intro-motion-preference">{t("Movimiento reducido activado. Puedes reproducir el logo si lo deseas.")}</p>}
    </div>
  </dialog>;
}
