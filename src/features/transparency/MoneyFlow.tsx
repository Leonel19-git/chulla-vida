import { useId, useMemo, useState } from 'react';
import { HandCoins, Info } from 'lucide-react';
import type { Experience } from '../../domain/catalog';
import {
  agreementFor, computeDistribution, exampleAgreement, formatPercent, formatUsd, LINE_KEYS, LINE_LABELS,
  NEUTRAL_WEIGHTS, PENDING_AGREEMENT_TEXT, usdToCents, type LineKey,
} from '../../domain/transparency';
import './money-flow.css';

const COLORS: Record<LineKey, string> = {
  community: '#1f7a4d', local_providers: '#0e8aa0', operating_costs: '#b87002',
  platform_fee: '#012960', processor_fee: '#6b6f7a', taxes: '#c61534',
};

/** «¿Cómo se distribuye tu dinero?» — muestra el estado real y, aparte, un explorador ilustrativo. */
export function MoneyFlow({ experience }: { experience: Experience }) {
  const agreement = agreementFor(experience.id);
  const startUsd = experience.price.currency === 'USD' && experience.price.min ? experience.price.min : 49;
  const real = useMemo(() => { const cents = usdToCents(startUsd); return cents ? computeDistribution(cents, agreement) : null; }, [agreement, startUsd]);
  const [amount, setAmount] = useState(String(startUsd));
  const [weights, setWeights] = useState<Record<LineKey, number>>({ ...NEUTRAL_WEIGHTS });
  const baseId = useId();
  const cents = usdToCents(Number(amount.replace(',', '.')));
  const example = exampleAgreement(weights);
  const result = cents && example ? computeDistribution(cents, example, { allowExample: true }) : null;

  return <section className="money-flow" aria-labelledby={`${baseId}-title`}>
    <h3 id={`${baseId}-title`}><HandCoins size={19} />¿Cómo se distribuye tu dinero?</h3>
    {real?.status === 'ok'
      ? <DistributionBars lines={real.lines} total={real.totalCents} caption={`Convenio «${real.agreementName}»`} />
      : <p className="money-flow-pending"><Info size={16} /><span><strong>{PENDING_AGREEMENT_TEXT}.</strong> Chulla Vida aún no tiene un convenio de reparto firmado con la comunidad o el anfitrión de esta ficha, así que no mostramos porcentajes.</span></p>}
    <details className="money-flow-example">
      <summary>Explorar cómo funcionaría (ejemplo ilustrativo)</summary>
      <p className="money-flow-warning">Ejemplo ilustrativo — no es un convenio real. Tú eliges las cifras para entender cómo se lee un reparto: el total siempre cuadra al centavo y no hay doble conteo.</p>
      <label className="field-label" htmlFor={`${baseId}-amount`}>Monto cobrado (USD)</label>
      <input id={`${baseId}-amount`} className="field money-flow-amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
      <div className="money-flow-sliders">{LINE_KEYS.map(key => <label key={key}><span><i style={{ background: COLORS[key] }} />{LINE_LABELS[key]}</span>
        <input type="range" min={0} max={50} value={weights[key]} onChange={event => setWeights(previous => ({ ...previous, [key]: Number(event.target.value) }))} aria-valuetext={`peso ${weights[key]}`} /></label>)}</div>
      {result?.status === 'ok' ? <DistributionBars lines={result.lines} total={result.totalCents} caption={result.residueCents ? `Redondeo de ${formatUsd(result.residueCents)} asignado a ${LINE_LABELS[result.residueLine].toLowerCase()}.` : 'Sin residuo de redondeo.'} />
        : <p role="status">Escribe un monto mayor que cero y deja al menos un control por encima de cero.</p>}
    </details>
  </section>;
}

function DistributionBars({ lines, total, caption }: { lines: { key: LineKey; label: string; bps: number; cents: number }[]; total: number; caption: string }) {
  const visible = lines.filter(line => line.cents > 0);
  return <figure className="money-flow-figure">
    <div className="money-flow-bar" aria-hidden="true">{visible.map(line => <span key={line.key} style={{ flexGrow: line.cents, background: COLORS[line.key] }} />)}</div>
    <table><caption className="sr-only">Distribución de {formatUsd(total)}</caption><tbody>
      {lines.map(line => <tr key={line.key}><th scope="row"><i style={{ background: COLORS[line.key] }} />{line.label}</th><td>{formatPercent(line.bps)}</td><td>{formatUsd(line.cents)}</td></tr>)}
    </tbody><tfoot><tr><th scope="row">Total cobrado</th><td>100 %</td><td>{formatUsd(lines.reduce((sum, line) => sum + line.cents, 0))}</td></tr></tfoot></table>
    <figcaption>{caption}</figcaption>
  </figure>;
}
