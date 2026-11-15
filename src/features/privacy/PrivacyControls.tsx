import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Check, Lock, Scale, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import {
  CONSENT_CATEGORIES, CONSENT_LEVELS, CONSENT_POLICY_VERSION, levelCategories, levelFor,
  type ConsentCategories, type ConsentLevel, type OptionalCategory,
} from '../../domain/consent';
import { useConsent } from './ConsentContext';
import { PRIVACY_RIGHTS_EVENT } from '../privacy-rights/documents';
import './privacy.css';

const RightsRequestForm = lazy(() => import('../privacy-rights/RightsRequestForm').then(module => ({ default: module.RightsRequestForm })));
const ICONS = { private: Lock, balanced: Scale, custom: SlidersHorizontal } as const;

/** Banner de primera visita, editor «Privacidad y cookies» y formulario de derechos (evento `cv3:privacy-rights`). */
export function PrivacyControls() {
  const { preferences, editing, close, notice } = useConsent();
  const [rights, setRights] = useState(false);
  // El aviso se muestra al guardar y se oculta solo a los 6 s; la clave es la fecha de la elección guardada.
  const [hiddenFor, setHiddenFor] = useState<string | undefined>();
  const toastKey = preferences?.updatedAt ?? notice;
  const toast = notice && hiddenFor !== toastKey ? notice : '';
  useEffect(() => {
    const openRights = () => setRights(true);
    window.addEventListener(PRIVACY_RIGHTS_EVENT, openRights);
    return () => window.removeEventListener(PRIVACY_RIGHTS_EVENT, openRights);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setHiddenFor(toastKey), 6000);
    return () => window.clearTimeout(timer);
  }, [notice, toastKey]);
  return <>
    {!preferences && !editing && <ConsentBanner />}
    {editing && <PrivacyEditor onClose={close} />}
    {rights && <Suspense fallback={<p className="privacy-toast is-visible" role="status">Abriendo el formulario…</p>}><RightsRequestForm onClose={() => setRights(false)} /></Suspense>}
    <p className={`privacy-toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">{toast}</p>
  </>;
}

function LevelCards({ selected, onSelect, name }: { selected: ConsentLevel | null; onSelect: (level: ConsentLevel) => void; name: string }) {
  return <div className="consent-levels" role="radiogroup" aria-label="Nivel de acceso a tus datos">
    {CONSENT_LEVELS.map(level => {
      const Icon = ICONS[level.id];
      const checked = selected === level.id;
      return <label key={level.id} className={`consent-level consent-level-${level.id} ${checked ? 'is-selected' : ''}`}>
        <input type="radio" name={name} value={level.id} checked={checked} onChange={() => onSelect(level.id)} />
        <span className="consent-level-head"><span className="consent-level-icon" aria-hidden="true"><Icon size={20} /></span><strong>{level.title}</strong><span className="consent-level-check" aria-hidden="true"><Check size={16} /></span></span>
        <span className="consent-level-tagline">{level.tagline}</span>
        <span className="consent-level-detail"><b>Se guarda:</b> {level.stores}</span>
        <span className="consent-level-detail"><b>Se comparte:</b> {level.shares}</span>
      </label>;
    })}
  </div>;
}

/**
 * Banner compacto de primera visita: una barra inferior con texto breve, los tres niveles como segmentos
 * de igual peso y «Guardar mi elección». Lo que guarda y comparte cada nivel va en un desplegable.
 * Publica su alto en --cv-consent-h para que el botón de MIJIN se sitúe encima y nunca quede tapado.
 */
function ConsentBanner() {
  const { choose, open } = useConsent();
  const [selected, setSelected] = useState<ConsentLevel | null>(null);
  const [hint, setHint] = useState('');
  const titleId = useId();
  const hintId = useId();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    const root = document.documentElement;
    if (!node) return;
    const publish = () => root.style.setProperty('--cv-consent-h', `${Math.ceil(node.getBoundingClientRect().height)}px`);
    publish();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
    observer?.observe(node);
    window.addEventListener('resize', publish);
    return () => { observer?.disconnect(); window.removeEventListener('resize', publish); root.style.removeProperty('--cv-consent-h'); };
  }, []);
  const select = (level: ConsentLevel) => { setSelected(level); setHint(''); if (level === 'custom') open(); };
  const save = () => {
    if (!selected) { setHint('Elige uno de los tres niveles para continuar.'); return; }
    if (selected === 'custom') { open(); return; }
    choose(selected, undefined, 'banner');
  };
  const chosen = CONSENT_LEVELS.find(level => level.id === selected);
  return <section ref={ref} className="privacy-banner consent-banner consent-bar" role="region" aria-labelledby={titleId} data-tour="privacy-banner">
    <div className="consent-bar-intro">
      <span className="consent-banner-badge" aria-hidden="true"><ShieldCheck size={20} /></span>
      <div>
        <h2 id={titleId}>Tus datos son tuyos</h2>
        <p>Elige qué guardamos en tu dispositivo y qué se comparte. Sin analítica ni publicidad. <button type="button" className="privacy-link" onClick={() => window.dispatchEvent(new Event('cv3:legal'))}>Política de cookies</button></p>
      </div>
    </div>
    <div className="consent-segments" role="radiogroup" aria-label="Nivel de acceso a tus datos" aria-describedby={hintId}>
      {CONSENT_LEVELS.map(level => {
        const Icon = ICONS[level.id];
        const checked = selected === level.id;
        return <label key={level.id} className={`consent-segment ${checked ? 'is-selected' : ''}`}>
          <input type="radio" name="consent-banner-level" value={level.id} checked={checked} onChange={() => select(level.id)} />
          <Icon size={17} aria-hidden="true" /><strong>{level.title}</strong><span className="sr-only">. {level.tagline}</span>
        </label>;
      })}
    </div>
    <button type="button" className="button consent-save" onClick={save}>{selected === 'custom' ? 'Elegir mis categorías' : 'Guardar mi elección'}</button>
    <p id={hintId} className={`consent-hint ${hint ? 'is-error' : ''}`} aria-live="polite">{hint || (chosen ? chosen.tagline : '')}</p>
    <details className="consent-details">
      <summary>¿Qué incluye cada nivel?</summary>
      <dl>{CONSENT_LEVELS.map(level => <div key={level.id}><dt>{level.title}</dt><dd>{level.tagline}</dd><dd><b>Se guarda:</b> {level.stores}</dd><dd><b>Se comparte:</b> {level.shares}</dd></div>)}</dl>
    </details>
  </section>;
}

function PrivacyEditor({ onClose }: { onClose: () => void }) {
  const { preferences, choose, revoke } = useConsent();
  // Al personalizar desde cero no se premarca nada: el editor parte del estado guardado o de Privado.
  const [categories, setCategories] = useState<ConsentCategories>(() => preferences ? levelCategories('custom', preferences) : levelCategories('private'));
  const [level, setLevel] = useState<ConsentLevel>(() => preferences?.level ?? 'custom');
  // Privado y Equilibrado fijan sus categorías; Personalizado conserva lo que ya marcaste en el editor.
  const selectLevel = (next: ConsentLevel) => { setLevel(next); if (next !== 'custom') setCategories(levelCategories(next)); };
  // Si tu combinación coincide con un preajuste, se muestra con su nombre: así nunca hay dos rótulos para lo mismo.
  const toggle = (key: OptionalCategory, value: boolean) => { const next = { ...categories, [key]: value }; setCategories(next); setLevel(levelFor(next)); };
  const saved = preferences ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(preferences.updatedAt)) : '';
  return <Dialog title="Privacidad y cookies" onClose={onClose} wide><div className="dialog-content privacy-editor">
    <p className="privacy-editor-lead">Decide qué guardamos y qué se comparte. Puedes cambiarlo o retirarlo cuando quieras; las funciones necesarias siguen funcionando igual. Los permisos de micrófono, ubicación y notificaciones se piden aparte, solo cuando usas cada función.</p>
    {preferences && <p className="privacy-current"><ShieldCheck size={18} aria-hidden="true" /><span>Tu elección actual: <strong>{CONSENT_LEVELS.find(item => item.id === preferences.level)?.title}</strong> · guardada el {saved} · política {preferences.policyVersion}</span></p>}
    <LevelCards selected={level} onSelect={selectLevel} name="consent-editor-level" />
    <fieldset className="consent-categories">
      <legend>Categorías</legend>
      {CONSENT_CATEGORIES.map(category => {
        const fixed = category.id === 'essential';
        const off = !category.connected;
        const checked = fixed ? true : off ? false : categories[category.id as OptionalCategory];
        return <label key={category.id} className={`consent-category ${off ? 'is-off' : ''}`}>
          <span className="consent-switch"><input type="checkbox" role="switch" checked={checked} disabled={fixed || off} aria-describedby={`consent-${category.id}-desc`} onChange={event => toggle(category.id as OptionalCategory, event.target.checked)} /><span aria-hidden="true" /></span>
          <span className="consent-category-text">
            <strong>{category.title} {fixed && <em className="consent-tag">Siempre activas</em>}{off && <em className="consent-tag consent-tag-off">No conectada</em>}</strong>
            <span id={`consent-${category.id}-desc`}>{category.summary}</span>
            <span><b>Se guarda:</b> {category.stores}</span>
            <span><b>Se comparte:</b> {category.shares}</span>
          </span>
        </label>;
      })}
    </fieldset>
    <p className="privacy-editor-more">¿Quieres saber más o ejercer tus derechos? <button type="button" className="privacy-link" onClick={() => { onClose(); window.dispatchEvent(new Event(PRIVACY_RIGHTS_EVENT)); }}>Abre el formulario de derechos</button> · <button type="button" className="privacy-link" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:legal')); }}>documentos de privacidad</button>. Versión de la política de cookies: {CONSENT_POLICY_VERSION}.</p>
    <div className="dialog-actions">
      <button type="button" className="button button-secondary" onClick={revoke}>Retirar permisos opcionales</button>
      <button type="button" className="button button-primary" onClick={() => choose('custom', level === 'custom' ? categories : levelCategories(level))}>Guardar mi elección</button>
    </div>
  </div></Dialog>;
}
