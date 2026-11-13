import { useEffect, useState } from 'react';
import { Download, ExternalLink, Trash2, WifiOff } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { REGION_LABELS } from '../../domain/catalog';
import { clearOfflineLibrary, deleteOfflineExperience, readOfflineLibrary, type OfflineLibrary } from './library';
import { supportsOfflineStartup } from './registration';
import './offline.css';

export function DownloadsPanel({ onClose, onOpenExperience, onChanged }: { onClose: () => void; onOpenExperience: (id: string) => void; onChanged?: () => void }) {
  const [library, setLibrary] = useState<OfflineLibrary | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const refresh = async () => { try { setError(''); setLibrary(await readOfflineLibrary()); } catch { setError('No pudimos leer tus descargas. Revisa los permisos del navegador y vuelve a intentar.'); } };
  useEffect(() => { let mounted = true; void readOfflineLibrary().then(value => { if (mounted) setLibrary(value); }).catch(() => { if (mounted) setError('No pudimos leer tus descargas. Revisa los permisos del navegador y vuelve a intentar.'); });
    const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { mounted = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const remove = async (id?: string) => {
    setPending(true); setError('');
    try { if (id) await deleteOfflineExperience(id); else await clearOfflineLibrary(); await refresh(); onChanged?.(); setNotice(id ? 'Ficha eliminada de tus descargas.' : 'Se eliminaron todas las fichas descargadas.'); }
    catch { setError('No se pudo borrar la descarga. Vuelve a intentar.'); }
    finally { setPending(false); }
  };
  return <Dialog title="Tus descargas para el viaje" onClose={onClose} wide><div className="dialog-content offline-library">
    <p className="offline-library-status"><WifiOff size={18} />{online ? 'El navegador indica conexión disponible.' : 'El navegador está sin conexión.'}</p>
    <p>Descarga una ficha desde su detalle para llevar su descripción, precio de referencia, condiciones e información cultural en este dispositivo. Los datos descargados no se actualizan solos.</p>
    <div className="offline-library-scope"><strong>{supportsOfflineStartup() ? 'Apertura sin conexión compatible con este navegador' : 'Biblioteca local en este navegador'}</strong><p>{supportsOfflineStartup() ? 'Requiere una visita con conexión y que el navegador haya terminado de guardar la aplicación. Prueba la apertura antes de salir; el navegador puede borrar almacenamiento.' : 'Esta vista de desarrollo guarda las fichas. La apertura de la web sin conexión requiere la versión de producción, HTTPS y soporte del navegador.'}</p><p>Clima actual, IA remota, pagos, disponibilidad y confirmaciones requieren internet. No descargamos cuentas, conversaciones ni transacciones.</p></div>
    {error && <div role="alert" className="offline-library-error"><p>{error}</p><button className="button button-secondary" onClick={() => void refresh()}>Volver a intentar</button></div>}
    {!library && !error && <p role="status">Leyendo descargas…</p>}
    {library && <><div className="offline-library-summary"><strong>{library.experiences.length} fichas · {(library.bytes / 1024).toFixed(1)} KB de texto</strong>{library.downloadedAt && <span>Última descarga: {new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(library.downloadedAt))}</span>}</div>
      {library.discardedRecords > 0 && <p role="status">Se omitieron {library.discardedRecords} descargas dañadas. Puedes borrarlas con «Borrar todas» y descargarlas otra vez.</p>}
      {library.experiences.length ? <ul className="offline-library-list">{library.experiences.map(experience => <li key={experience.id}><div><h3>{experience.title}</h3><p>{REGION_LABELS[experience.localizedRegion]} · {experience.province}</p><small>Versión {experience.contentVersion} · Fuente {experience.sourceCheckedAt}</small></div><div><button className="button button-secondary" onClick={() => { onClose(); onOpenExperience(experience.id); }}>Leer ficha<ExternalLink size={16} /></button><button className="icon-button" disabled={pending} aria-label={`Borrar descarga de ${experience.title}`} onClick={() => void remove(experience.id)}><Trash2 size={18} /></button></div></li>)}</ul> : <div className="offline-library-empty"><Download size={32} /><h3>Tu mochila todavía está vacía.</h3><p>Explora una experiencia y pulsa «Descargar ficha» para llevarla contigo.</p></div>}
      {(library.experiences.length > 0 || library.discardedRecords > 0) && <button className="button button-secondary" disabled={pending} onClick={() => void remove()}><Trash2 size={16} />Borrar todas las descargas</button>}
    </>}
    <p role="status">{notice}</p>
  </div></Dialog>;
}
