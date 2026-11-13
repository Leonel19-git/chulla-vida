import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { experiences, type Experience } from '../../domain/catalog';
import { isStringArray, readStoredValue, writeStoredValue } from '../../lib/storage';

const Context = createContext<{ saved: string[]; toggle: (id: string) => void; selected: string | null; select: (id: string | null) => void; records: Experience[]; online: boolean } | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState(() => readStoredValue('catalog-saved', [], isStringArray));
  const [selected, select] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [downloaded, setDownloaded] = useState<Experience[]>([]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const read = async () => { try { const module = await import('../offline/library'); const library = await module.readOfflineLibrary(); setDownloaded(library.experiences); } catch { setDownloaded([]); } };
    void read(); window.addEventListener('online', update); window.addEventListener('offline', update); window.addEventListener('cv3:library', read);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('cv3:library', read); };
  }, []);
  useEffect(() => { writeStoredValue('catalog-saved', saved); }, [saved]);
  const toggle = (id: string) => {
    if (!experiences.some(experience => experience.id === id)) return;
    setSaved(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  };
  return <Context.Provider value={{ saved, toggle, selected, select, records: online ? experiences : downloaded, online }}>{children}</Context.Provider>;
}
export function useCatalog() { const value = useContext(Context); if (!value) throw new Error('Falta CatalogProvider'); return value; }
