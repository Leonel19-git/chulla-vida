import type { CSSProperties } from 'react';
import { MapPin, Mountain, Shell, Trees, Waves } from 'lucide-react';
import type { Language } from '../../types';
import { regionalSceneSvg, routeRegionTheme, type OfflineStop } from '../../lib/offline-route';
import { translateOffline } from '../../i18n/offline';

const regionIcons = { Sierra: Mountain, Costa: Waves, Amazonía: Trees, Galápagos: Shell };

export function RegionalRouteMap({ stops, active, origin, language, onSelect, touring = false }: {
  stops: OfflineStop[]; active: number; origin: string; language: Language; onSelect: (index: number) => void; touring?: boolean;
}) {
  const t = (literal: string, variables?: Record<string, string | number>) => translateOffline(language, literal, variables);
  const region = stops[active]?.region || 'Sierra';
  const theme = routeRegionTheme(region);
  const Icon = regionIcons[region as keyof typeof regionIcons] || Mountain;
  const regions = [...new Set(stops.map(stop => stop.region))];
  const nodeX = (index: number) => 82 + ((index + 1) * 500 / Math.max(1, stops.length));
  const nodeY = (index: number) => index % 2 ? 108 : 190;
  const points = ['82,108', ...stops.map((_, index) => `${nodeX(index)},${nodeY(index)}`)].join(' ');

  return <div className={`regional-route-map scene-${theme.key} ${touring ? 'is-touring' : ''}`} style={{ '--scene-accent': theme.accent, '--scene-base': theme.base } as CSSProperties}>
    <div className="regional-map-heading"><span><Icon size={19} /><strong>{t(region)}</strong></span><span>{t(theme.detail)}</span></div>
    <svg className="regional-map-art" viewBox="0 0 680 285" role="group" aria-label={t('Ruta esquemática desde {origin}', { origin })}>
      <g key={region} className="regional-map-landscape" aria-hidden="true" dangerouslySetInnerHTML={{ __html: regionalSceneSvg(region) }} />
      <polyline className="regional-trail-under" points={points} />
      <polyline className="regional-trail" points={points} />
      <g aria-hidden="true"><circle className="regional-origin" cx="82" cy="108" r="18" /><path d="m75 108 5 5 10-11" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><rect x="50" y="134" width="64" height="24" rx="12" fill="#fffdf1" /><text className="regional-origin-label" x="82" y="151" textAnchor="middle">{t('Salida')}</text></g>
      {stops.map((stop, index) => <g key={stop.id} role="button" tabIndex={0} aria-label={t('Parada {number}: {title}', { number: index + 1, title: stop.title })} aria-pressed={active === index} className={`regional-map-node ${active === index ? 'selected' : ''}`} style={{ '--node-color': routeRegionTheme(stop.region).accent } as CSSProperties} onClick={() => onSelect(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(index); } }}>
        <circle className="regional-node-halo" cx={nodeX(index)} cy={nodeY(index)} r="35" />
        <circle className="regional-node-core" cx={nodeX(index)} cy={nodeY(index)} r="25" />
        <text x={nodeX(index)} y={nodeY(index) + 7} textAnchor="middle">{index + 1}</text>
      </g>)}
    </svg>
    <div className="regional-map-disclaimer"><MapPin size={13} /><span>{t('Esquema de ruta · sin navegación GPS')}</span></div>
    <div className="regional-map-legend" role="group" aria-label={t('Tu ruta por regiones')}>{regions.map(name => {
      const RegionIcon = regionIcons[name as keyof typeof regionIcons] || Mountain;
      return <button key={name} className={name === region ? 'active' : ''} style={{ '--legend-color': routeRegionTheme(name).accent } as CSSProperties} aria-pressed={name === region} onClick={() => onSelect(stops.findIndex(stop => stop.region === name))}><RegionIcon size={15} />{t(name)}</button>;
    })}<small>{t('Toca una parada')}</small></div>
  </div>;
}
