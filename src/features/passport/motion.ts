import { useEffect, useState } from 'react';

/** Celular y tableta vertical: una página por pantalla. Desde 900 px, libro abierto a doble página. */
export const PASSPORT_PHONE_QUERY = '(max-width: 899.98px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useMediaQuery(query: string): boolean {
  const read = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [query]);
  return matches;
}

/**
 * Resorte críticamente amortiguado (sin rebote) sembrado con la velocidad del gesto, en px/ms.
 * Se puede interrumpir: la función devuelta lo detiene donde va. Sin requestAnimationFrame termina al instante.
 */
export function springTo(from: number, to: number, velocity: number, onFrame: (value: number) => void, onDone: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') { onFrame(to); onDone(); return () => {}; }
  const omega = 0.021; // rad/ms ≈ 320 ms hasta asentarse, como «pasar página» del álbum
  const x0 = from - to;
  const b = velocity + omega * x0;
  const start = performance.now();
  let frame = 0;
  const step = () => {
    const t = performance.now() - start;
    const decay = Math.exp(-omega * t);
    const value = to + (x0 + b * t) * decay;
    const speed = (velocity - omega * b * t) * decay;
    if ((Math.abs(value - to) < 0.5 && Math.abs(speed) < 0.02) || t > 900) { onFrame(to); onDone(); return; }
    onFrame(value);
    frame = window.requestAnimationFrame(step);
  };
  frame = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frame);
}

/** Velocidad (px/ms) de las últimas muestras del dedo. Con menos de 8 ms de historia no se adivina: 0. */
export function releaseVelocity(samples: readonly (readonly [x: number, time: number])[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1]!;
  const first = samples.find(sample => last[1] - sample[1] <= 100) ?? samples[0]!;
  const elapsed = last[1] - first[1];
  if (elapsed < 8) return 0;
  return Math.max(-3, Math.min(3, (last[0] - first[0]) / elapsed));
}

/** Brillo foil: el ángulo del degradado cónico sigue al puntero. Solo toca los elementos con brillo de `root`. */
export function foilFollowPointer(root: ParentNode, x: number, y: number) {
  for (const element of root.querySelectorAll<HTMLElement>('.pg-foil')) {
    const box = element.getBoundingClientRect();
    if (!box.width) continue;
    const angle = Math.atan2(y - (box.top + box.height / 2), x - (box.left + box.width / 2)) * (180 / Math.PI) + 90;
    element.style.setProperty('--foil-angle', `${Math.round(angle)}deg`);
  }
}
/** En celular el brillo se mueve con el desplazamiento o el deslizamiento de la hoja. */
export function foilShift(root: ParentNode | null | undefined, amount: number) {
  if (!root) return;
  for (const element of root.querySelectorAll<HTMLElement>('.pg-foil')) element.style.setProperty('--foil-angle', `${Math.round(205 + amount)}deg`);
}
