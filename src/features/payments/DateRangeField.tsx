import { useRef } from 'react';
import { ArrowRight, CalendarCheck, CalendarDays, Moon, Sun } from 'lucide-react';
import { rangeSummary, shortDay, suggestEnd } from '../../domain/payments/travel';
import './travel-fields.css';

import { useT } from '../../i18n/v3';
export interface DateRange { start: string; end: string }

/**
 * Fecha de inicio y fecha de fin con el selector nativo del teléfono.
 * Al elegir el inicio sugiere el fin según los días de la experiencia; si la persona cambió el fin a mano, se respeta
 * mientras siga siendo válido.
 */
export function DateRangeField({ value, onChange, minStart = '', durationDays, showDuration = true, labels = { start: 'Inicio', end: 'Fin' } }: { value: DateRange; onChange: (value: DateRange) => void; minStart?: string; durationDays: number | null; showDuration?: boolean; labels?: { start: string; end: string } }) {
  const t = useT();
  const touchedEnd = useRef(false);
  const summary = rangeSummary(value.start, value.end);
  const changeStart = (start: string) => {
    const keep = touchedEnd.current && value.end && start && value.end >= start;
    onChange({ start, end: keep ? value.end : suggestEnd(start, durationDays) });
  };
  return <fieldset className="tf-dates">
    <legend>{t("Fechas")}{showDuration && durationDays && durationDays > 1 ? <small>{' '}{t("· experiencia de")}{' '}{durationDays}{' '}{t("días")}</small> : null}</legend>
    <div className="tf-dates-grid">
      <label className="tf-date"><span><Sun size={16} aria-hidden="true" />{labels.start}</span><input className="field" type="date" min={minStart || undefined} value={value.start} onChange={event => changeStart(event.target.value)} /></label>
      <ArrowRight className="tf-dates-arrow" size={18} aria-hidden="true" />
      <label className="tf-date"><span><Moon size={16} aria-hidden="true" />{labels.end}</span><input className="field" type="date" min={value.start || minStart || undefined} value={value.end} onChange={event => { touchedEnd.current = true; onChange({ start: value.start, end: event.target.value }); }} /></label>
    </div>
    <p className="tf-range" aria-live="polite" data-ready={summary ? true : undefined}>
      {summary ? <><CalendarCheck size={18} aria-hidden="true" /><span>{shortDay(value.start)} → {shortDay(value.end)}</span><strong>{summary.label}</strong></>
        : <><CalendarDays size={18} aria-hidden="true" /><span>{t("Elige inicio y fin")}</span></>}
    </p>
  </fieldset>;
}
