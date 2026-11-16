import { useEffect, useId, useState, type ReactNode } from 'react';
import { Baby, Minus, Plus, User } from 'lucide-react';
import { clampParty, partySize, type Party } from '../../domain/payments/travel';
import './travel-fields.css';

import { useT } from '../../i18n/v3';
/** Un contador −/+ grande y táctil. Se puede escribir; si queda vacío, al salir vuelve al último valor válido. */
function Counter({ label, hint, icon, value, min, max, onChange }: { label: string; hint: string; icon: ReactNode; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    if (!digits) return;
    const next = Math.min(max, Math.max(min, Number(digits)));
    if (next !== value) onChange(next);
    setDraft(String(next));
  };
  return <div className="tf-counter">
    <span className="tf-counter-icon" aria-hidden="true">{icon}</span>
    <label htmlFor={id} className="tf-counter-label">{label}<small>{hint}</small></label>
    <div className="tf-counter-controls">
      <button type="button" className="tf-step" aria-label={t("Quitar {v}", { v: label.toLowerCase() })} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={20} /></button>
      <input id={id} className="tf-counter-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={2} value={draft}
        aria-describedby={`${id}-range`}
        onChange={event => { const text = event.target.value.replace(/[^\d]/g, '').slice(0, 2); setDraft(text); if (text) commit(text); }}
        onBlur={() => setDraft(String(value))} />
      <button type="button" className="tf-step" aria-label={t("Añadir {v}", { v: label.toLowerCase() })} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={20} /></button>
    </div>
    <span id={`${id}-range`} className="sr-only">{t("Entre {min} y {max}", { min, max })}</span>
  </div>;
}

/**
 * Personas que viajan: adultos (mínimo 1) y niños (opcional). El total nunca pasa la capacidad.
 * Llama a `onChange` en cada cambio para que el total se actualice al instante.
 */
export function PeopleStepper({ value, capacity, onChange, allowChildren = true, fixedNote }: { value: Party; capacity: number; onChange: (value: Party) => void; allowChildren?: boolean; fixedNote?: string }) {
  const t = useT();
  const set = (patch: Partial<Party>) => onChange(clampParty({ ...value, ...patch }, capacity));
  const total = partySize(value);
  return <fieldset className="tf-people">
    <legend><span>{t("Personas")}</span><output aria-live="polite">{t("{total} de {capacity} máx.", { total, capacity })}</output></legend>
    <Counter label={t("Adultos")} hint={t("13 años o más")} icon={<User size={20} />} value={value.adults} min={1} max={capacity - value.children} onChange={adults => set({ adults })} />
    {allowChildren && <Counter label={t("Niños")} hint={t("Opcional")} icon={<Baby size={20} />} value={value.children} min={0} max={Math.max(0, capacity - value.adults)} onChange={children => set({ children })} />}
    {fixedNote && <p className="tf-note">{fixedNote}</p>}
  </fieldset>;
}
