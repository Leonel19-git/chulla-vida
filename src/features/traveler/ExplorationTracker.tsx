import { useEffect } from 'react';
import { useCatalog } from '../catalog/CatalogContext';
import { EXPERIENCE_OPENED, recordExploration } from './exploration';

/**
 * Se monta una vez dentro de CatalogProvider (sin interfaz). Cada vez que se abre una ficha del catálogo
 * la marca como «Explorado virtualmente» en el Pasaporte Guambra.
 */
export function PassportExplorationTracker() {
  const { selected, records } = useCatalog();
  useEffect(() => {
    if (selected) recordExploration(selected, records.map(record => record.id));
  }, [selected, records]);
  useEffect(() => {
    const handle = (event: Event) => {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id === 'string') recordExploration(id, records.map(record => record.id));
    };
    window.addEventListener(EXPERIENCE_OPENED, handle);
    return () => window.removeEventListener(EXPERIENCE_OPENED, handle);
  }, [records]);
  return null;
}
