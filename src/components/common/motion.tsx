import { useEffect, useRef, useState, type RefObject } from 'react';

/** true cuando el sistema pide menos movimiento (o no se puede consultar). */
export function prefersReducedMotion(): boolean {
  try { return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}
const canAnimate = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function' && !prefersReducedMotion();

/**
 * Entrada escalonada al hacer scroll: los hijos con `data-reveal` aparecen cuando entran en pantalla.
 * Solo oculta algo si el navegador puede revelarlo (IntersectionObserver y sin movimiento reducido);
 * sin eso, todo se ve desde el principio. Vigila también los nodos que se añaden después (filtros).
 */
export function useReveal<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !canAnimate()) return;
    root.classList.add('cv-reveal-on');
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); io.unobserve(entry.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    const watch = (scope: ParentNode) => scope.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)').forEach(node => io.observe(node));
    watch(root);
    const mo = typeof MutationObserver === 'function' ? new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches('[data-reveal]:not(.is-revealed)')) io.observe(node);
      watch(node);
    }))) : null;
    mo?.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo?.disconnect(); root.classList.remove('cv-reveal-on'); };
  }, [ref]);
}

/** Número que sube hasta su valor al aparecer. El valor real siempre está disponible para lectores de pantalla. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(() => canAnimate() ? 0 : value);
  useEffect(() => {
    const node = ref.current;
    if (!node || !canAnimate()) { setShown(value); return; }
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [value, duration]);
  return <span ref={ref} className="cv-count"><span aria-hidden="true">{shown}</span><span className="sr-only">{value}</span></span>;
}
