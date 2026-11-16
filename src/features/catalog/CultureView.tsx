import { CultureViva } from '../culture/CultureViva';
import { useCatalog } from './CatalogContext';
import './culture.css';

/** Vista «Cultura Viva»: carrusel de cartas (ver src/features/culture). */
export function CultureView() {
  const { online, select } = useCatalog();
  return <CultureViva online={online} onOpenExperience={id => select(id)} />;
}
