import { useEffect, useId, useRef, useState } from 'react';
import './animated-logo.css';

type AnimatedLogoProps = {
  variant?: 'intro' | 'compact';
  paused?: boolean;
  forceMotion?: boolean;
};

/**
 * The supplied artwork is reused, untouched, in five registered pieces.
 * The clip boundaries run through the white seams of the original emblem.
 */
export function AnimatedLogo({ variant = 'intro', paused = false, forceMotion = false }: AnimatedLogoProps) {
  const id = useId().replace(/:/g, '');
  const root = useRef<SVGSVGElement>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setMotionAllowed(forceMotion || !preference.matches);
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    updatePreference();
    updateVisibility();
    preference.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updateVisibility);

    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer?.observe(element);

    // A compact logo inherits keyboard interaction from its enclosing home button.
    const focusTarget = element.closest('button, a, [tabindex]');
    const onFocus = () => setFocused(true);
    const onBlur = (event: Event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (!(next instanceof Node) || !focusTarget?.contains(next)) setFocused(false);
    };
    focusTarget?.addEventListener('focusin', onFocus);
    focusTarget?.addEventListener('focusout', onBlur);

    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updateVisibility);
      focusTarget?.removeEventListener('focusin', onFocus);
      focusTarget?.removeEventListener('focusout', onBlur);
    };
  }, [forceMotion]);

  const moving = motionAllowed && onScreen && pageVisible && !paused && (variant === 'intro' || hovered || focused);
  const clip = (name: string) => `url(#${id}-${name})`;
  const artwork = '/chulla-vida-logo.png';
  const imageProps = { href: artwork, x: 0, y: 0, width: 1254, height: 1254 };

  return <svg
    ref={root}
    className={`animated-logo animated-logo--${variant}`}
    viewBox="50 100 1150 1060"
    width="1150"
    height="1060"
    role="img"
    aria-label="CHULLA VIDA · Turismo sostenible · Ecuador"
    focusable="false"
    data-animated={motionAllowed ? 'true' : 'false'}
    data-moving={moving ? 'true' : 'false'}
    data-user-motion={forceMotion ? 'true' : 'false'}
    onPointerEnter={() => setHovered(true)}
    onPointerLeave={() => setHovered(false)}
  >
    <defs>
      <clipPath id={`${id}-mountains`}><path d="M300 100H950V270H820L627 410 430 270H300Z" /></clipPath>
      <clipPath id={`${id}-coast`}><path d="M300 270H430L627 410 430 582H300Z" /></clipPath>
      <clipPath id={`${id}-forest`}><path d="M820 270H950V582H820L627 410Z" /></clipPath>
      <clipPath id={`${id}-land`}><path d="M300 582H430L627 410 820 582H950V675H300Z" /></clipPath>
      <clipPath id={`${id}-sun`}><circle cx="627" cy="392" r="111" /></clipPath>
      <clipPath id={`${id}-wordmark`}><path d="M50 645H300V675H950V645H1200V1160H50Z" /></clipPath>
      <mask id={`${id}-outside-sun`} x="0" y="0" width="1254" height="1254" maskUnits="userSpaceOnUse">
        <rect width="1254" height="1254" fill="white" />
        <circle cx="627" cy="392" r="111" fill="black" />
      </mask>
    </defs>
    <g className="brand-logo-piece brand-logo-mountains"><image {...imageProps} clipPath={clip('mountains')} mask={clip('outside-sun')} /></g>
    <g className="brand-logo-piece brand-logo-coast"><image {...imageProps} clipPath={clip('coast')} mask={clip('outside-sun')} /></g>
    <g className="brand-logo-piece brand-logo-forest"><image {...imageProps} clipPath={clip('forest')} mask={clip('outside-sun')} /></g>
    <g className="brand-logo-piece brand-logo-land"><image {...imageProps} clipPath={clip('land')} mask={clip('outside-sun')} /></g>
    <g className="brand-logo-piece brand-logo-sun-arrival"><image {...imageProps} className="brand-logo-sun" clipPath={clip('sun')} /></g>
    <g className="brand-logo-wordmark">
      <image {...imageProps} clipPath={clip('wordmark')} />
      {/* The supplied raster misspells its tagline; this band redraws that one line over it. */}
      <rect x="90" y="924" width="1095" height="56" fill="#fefdfb" />
      <text className="brand-logo-tagline" x="636.5" y="968" textAnchor="middle" textLength="1004" lengthAdjust="spacing">TURISMO SOSTENIBLE Y CONSCIENTE</text>
    </g>
  </svg>;
}
