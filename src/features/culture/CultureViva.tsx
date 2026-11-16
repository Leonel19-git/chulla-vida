import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import { CULTURAL_EVENTS, getCultureCards, getThisMonthCards, monthName } from '../../domain/culture';
import { CultureCarousel } from './CultureCarousel';

import { useT } from '../../i18n/v3';
import { SpanishContentNote } from '../../i18n/v3/SpanishContentNote';
const REGIONS: (RegionId | 'all')[] = ['all', 'sierra', 'costa', 'amazonia', 'galapagos'];
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export interface CultureVivaProps {
  now?: Date;
  online?: boolean;
  onOpenExperience?: (experienceId: string) => void;
}

/** Cultura Viva: «Este mes» arriba y todas las fiestas como cartas, con filtros por mes y región. */
export function CultureViva({ now: nowProp, online = true, onOpenExperience }: CultureVivaProps) {
  const t = useT();
  const [now] = useState(() => nowProp ?? new Date());
  const [month, setMonth] = useState<number | null>(null);
  const [region, setRegion] = useState<RegionId | 'all'>('all');
  const thisMonth = useMemo(() => getThisMonthCards(now), [now]);
  const cards = useMemo(() => getCultureCards({ month, region }), [month, region]);

  return (
    <section className="cvc-page" aria-labelledby="cvc-title">
      <header className="cvc-head">
        <h1 id="cvc-title">{t("Cultura Viva")}</h1>
        <p>{t("{count} fiestas del Ecuador. Toca una carta para girarla.", { count: CULTURAL_EVENTS.length })}</p>
      </header>

      {!online && <p className="cvc-offline" role="status">{t("Sin conexión: las fotos pueden no cargar.")}</p>}

      {thisMonth.cards.length > 0 && (
        <section className="cvc-section cvc-this-month" aria-labelledby="cvc-month-title">
          <h2 id="cvc-month-title"><Sparkles size={20} aria-hidden="true" />{t("Este mes ·")}{' '}{monthName(thisMonth.month)}</h2>
          <CultureCarousel featured cards={thisMonth.cards} now={now} label={t("Fiestas de {v}", { v: monthName(thisMonth.month) })} onOpenExperience={onOpenExperience} />
        </section>
      )}

      <section className="cvc-section" aria-labelledby="cvc-all-title">
        <h2 id="cvc-all-title">{t("Todas las fiestas")}</h2><SpanishContentNote text="Descripciones de las fiestas en español" />
        <div className="cvc-filters">
          <div className="cvc-chip-row" role="group" aria-label={t("Filtrar por mes")}>
            <button type="button" className="cvc-filter" aria-pressed={month === null} onClick={() => setMonth(null)}>{t("Todo el año")}</button>
            {MONTHS.map(value => (
              <button key={value} type="button" className="cvc-filter" aria-pressed={month === value} aria-label={capital(monthName(value))} onClick={() => setMonth(month === value ? null : value)}>
                {capital(monthName(value).slice(0, 3))}
              </button>
            ))}
          </div>
          <div className="cvc-chip-row" role="group" aria-label={t("Filtrar por región")}>
            {REGIONS.map(value => (
              <button key={value} type="button" className="cvc-filter" data-region-tone={value === 'all' ? undefined : value} aria-pressed={region === value} onClick={() => setRegion(value)}>
                {value === 'all' ? t("Todas") : REGION_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
        <p className="cvc-count" aria-live="polite">{cards.length === 1 ? '1 fiesta' : t("{length} fiestas", { length: cards.length })}</p>
        {cards.length ? (
          <CultureCarousel key={`${month}-${region}`} cards={cards} now={now} label={t("Todas las fiestas")} onOpenExperience={onOpenExperience} />
        ) : (
          <p className="cvc-empty">{t("Nada con esos filtros. Prueba otro mes o región.")}</p>
        )}
        <p className="cvc-note">{t("Fechas orientativas: confírmalas con quien organiza antes de ir.")}</p>
      </section>
    </section>
  );
}
