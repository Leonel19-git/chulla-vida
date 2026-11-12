import { Check, Compass, Leaf, Mountain, Waves } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { regionalSceneSvg } from '../../lib/offline-route';
import type { Region } from '../../types';

const regions: { name: Region; icon: typeof Mountain }[] = [
  { name: 'Sierra', icon: Mountain },
  { name: 'Costa', icon: Waves },
  { name: 'Amazonía', icon: Leaf },
  { name: 'Galápagos', icon: Compass },
];

/** Regional artwork is trusted static SVG shared with the downloadable route. */
export function RegionalSpotlight({ region }: { region: string }) {
  const { setSelectedRegion, t } = useApp();
  return <section className="regional-spotlight" aria-label={t('Filtrar por región')}>
    <div className="regional-choices" role="group" aria-label={t('Regiones de Ecuador')}>
      {regions.map(({ name, icon: Icon }) => <button key={name} data-region={name} className="regional-choice" onClick={() => setSelectedRegion(name)} aria-pressed={region === name}>
        <svg viewBox="0 0 680 285" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g dangerouslySetInnerHTML={{ __html: regionalSceneSvg(name) }} /></svg>
        <span className="regional-choice-label"><Icon size={18} /><strong>{t(name)}</strong></span>
        <span className="regional-choice-check" aria-hidden="true">{region === name ? <Check size={14} /> : null}</span>
      </button>)}
    </div>
    <button className="regional-all" aria-pressed={region === 'Todas'} onClick={() => setSelectedRegion('Todas')}><Compass size={16} />{t('Todo Ecuador')}{region === 'Todas' && <Check size={15} />}</button>
  </section>;
}
