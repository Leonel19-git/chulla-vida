import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileDown, Luggage, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { REGION_LABELS, type Experience } from '../../domain/catalog';
import { clearOfflineLibrary, deleteOfflineExperience, readOfflineLibrary, type OfflineLibrary } from './library';
import { supportsOfflineStartup } from './registration';
import './offline.css';

import { useT, tr } from '../../i18n/v3';
export function DownloadsPanel({ onClose, onOpenExperience, onChanged }: { onClose: () => void; onOpenExperience: (id: string) => void; onChanged?: () => void }) {
  const t = useT();
  const [library, setLibrary] = useState<OfflineLibrary | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const refresh = async () => { try { setError(''); setLibrary(await readOfflineLibrary()); } catch { setError(t("No pudimos leer tus descargas. Revisa los permisos del navegador y vuelve a intentar.")); } };
  useEffect(() => { let mounted = true; void readOfflineLibrary().then(value => { if (mounted) setLibrary(value); }).catch(() => { if (mounted) setError(tr("No pudimos leer tus descargas. Revisa los permisos del navegador y vuelve a intentar.")); });
    const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { mounted = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const remove = async (id?: string) => {
    setPending(true); setError('');
    try { if (id) await deleteOfflineExperience(id); else await clearOfflineLibrary(); await refresh(); onChanged?.(); setNotice(id ? t("Ficha eliminada de tus descargas.") : t("Se eliminaron todas las fichas descargadas.")); }
    catch { setError(t("No se pudo borrar la descarga. Vuelve a intentar.")); }
    finally { setPending(false); }
  };
  const downloadTrip = async () => {
    setPending(true); setError('');
    try { const { downloadTripFile } = await import('./experienceFile'); setNotice((await downloadTripFile(library?.experiences ?? [])).message); }
    catch { setError(t("No se pudo descargar tu viaje. Revisa el espacio del dispositivo y vuelve a intentar.")); }
    finally { setPending(false); }
  };
  const downloadOne = async (experience: Experience) => {
    setPending(true); setError('');
    try { const { downloadExperienceFile } = await import('./experienceFile'); setNotice((await downloadExperienceFile(experience)).message); }
    catch { setError(t("No se pudo descargar el archivo. Vuelve a intentar.")); }
    finally { setPending(false); }
  };
  return <Dialog title={t("Tus descargas para el viaje")} onClose={onClose} wide><div className="dialog-content offline-library">
    <p className={`offline-library-status ${online ? 'is-online' : 'is-offline'}`}>{online ? <Wifi size={18} aria-hidden="true" /> : <WifiOff size={18} aria-hidden="true" />}{online ? t("Tienes conexión: buen momento para bajar tus fichas.") : t("Estás sin conexión: aquí tienes lo que guardaste.")}</p>
    <section className="offline-trip" aria-labelledby="offline-trip-title">
      <Luggage size={30} aria-hidden="true" />
      <div><h3 id="offline-trip-title">{t("Tu viaje en un solo archivo")}</h3><p>{t("Baja un HTML con tu itinerario de «Mi viaje» y todas tus fichas, con fotos. Se abre sin internet y lo puedes imprimir como PDF.")}</p></div>
      <button className="button button-primary" disabled={pending} onClick={() => void downloadTrip()}><FileDown size={18} />{t("Descargar mi viaje")}</button>
    </section>
    <p>{t("Toca «Descargar ficha» en cualquier ficha y queda aquí.")}</p>
    <div className="offline-library-scope"><strong>{supportsOfflineStartup() ? t("Esta web también abre sin conexión") : t("Biblioteca local en este navegador")}</strong><details className="offline-library-more"><summary>{t("Ver más")}</summary><p>{supportsOfflineStartup() ? t("Después de una visita con internet, CHULLA VIDA se guarda en el navegador y vuelve a abrir sin señal. Pruébalo antes de salir: el navegador puede borrar datos si falta espacio.") : t("Esta vista de desarrollo guarda las fichas. La apertura de la web sin conexión funciona en la versión publicada con HTTPS.")}</p><p>{t("Desde el detalle de una ficha, «Descargar ficha» baja su archivo a tu dispositivo y la guarda aquí. Los datos guardados no se actualizan solos.")}</p><p>{t("Clima actual, IA remota, pagos, disponibilidad y confirmaciones necesitan internet. No descargamos cuentas, conversaciones ni transacciones.")}</p></details></div>
    {error && <div role="alert" className="offline-library-error"><p>{error}</p><button className="button button-secondary" onClick={() => void refresh()}>{t("Volver a intentar")}</button></div>}
    {!library && !error && <p role="status">{t("Leyendo descargas…")}</p>}
    {library && <><div className="offline-library-summary"><strong>{library.experiences.length} {library.experiences.length === 1 ? 'ficha' : 'fichas'} · {(library.bytes / 1024).toFixed(1)}{' '}{t("KB de texto")}</strong>{library.downloadedAt && <span>{t("Última descarga:")}{' '}{new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(library.downloadedAt))}</span>}</div>
      {library.discardedRecords > 0 && <p role="status">{t("Se omitieron")}{' '}{library.discardedRecords}{' '}{t("descargas dañadas. Puedes borrarlas con «Borrar todas» y descargarlas otra vez.")}</p>}
      {library.experiences.length ? <ul className="offline-library-list">{library.experiences.map(experience => <li key={experience.id}>
        {experience.media[0] && <img className="offline-library-thumb" src={experience.media[0].src} alt="" loading="lazy" width={88} height={66} />}
        <div><h3>{experience.title}</h3><p>{REGION_LABELS[experience.localizedRegion]} · {experience.province}</p><small>{t("Versión")}{' '}{experience.contentVersion}{' '}{t("· Fuente")}{' '}{experience.sourceCheckedAt}</small></div>
        <div><button className="button button-secondary" onClick={() => { onClose(); onOpenExperience(experience.id); }}>{t("Leer ficha")}<ExternalLink size={16} /></button><button className="icon-button" disabled={pending} aria-label={t("Bajar archivo de {title}", { title: experience.title })} onClick={() => void downloadOne(experience)}><Download size={18} /></button><button className="icon-button" disabled={pending} aria-label={t("Borrar descarga de {title}", { title: experience.title })} onClick={() => void remove(experience.id)}><Trash2 size={18} /></button></div>
      </li>)}</ul> : <div className="offline-library-empty"><Download size={32} /><h3>{t("Tu mochila todavía está vacía.")}</h3><p>{t("Explora una experiencia y pulsa «Descargar ficha» para llevarla contigo. Igual puedes bajar tu itinerario de «Mi viaje».")}</p></div>}
      {(library.experiences.length > 0 || library.discardedRecords > 0) && <button className="button button-secondary" disabled={pending} onClick={() => void remove()}><Trash2 size={16} />{t("Borrar todas las descargas")}</button>}
    </>}
    <p role="status" className="offline-library-notice">{notice}</p>
  </div></Dialog>;
}
