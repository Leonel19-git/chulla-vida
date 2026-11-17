import { useState } from 'react';
import { BadgeCheck, ClipboardList, ExternalLink, FileLock2, ShieldCheck, UserRound } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { supabaseConfiguration } from '../../lib/supabase';
import { roleStore } from '../roles/role';
import { useT, msg } from '../../i18n/v3';
import './host-hub.css';

export type HostFigure = 'establecimiento' | 'operador' | 'guia' | 'asociacion' | 'representante' | 'otro';
const OFFICIAL_REGISTRY_URL = 'https://servicios.turismo.gob.ec/registro-de-actividades-turisticas/';

/** Documentación orientativa por figura. La lista final la aprueba el responsable legal (ver docs/VERIFICACION_COMERCIANTES.md). */
export const DOCS_BY_FIGURE: Record<HostFigure, { label: string; documents: string[]; officialRegistry: 'cuando_aplique' | 'normalmente' }> = {
  establecimiento: { label: msg('Establecimiento (alojamiento, restaurante, cafetería)'), documents: [msg('RUC o RISE del negocio, si corresponde'), msg('Documento de identidad de la persona responsable'), msg('Fotos propias del lugar y permiso para publicarlas')], officialRegistry: 'normalmente' },
  operador: { label: msg('Operador turístico o agencia'), documents: [msg('RUC de la empresa'), msg('Nombramiento o poder de quien la representa'), msg('Pólizas o medidas de seguridad de las actividades')], officialRegistry: 'normalmente' },
  guia: { label: msg('Guía'), documents: [msg('Documento de identidad'), msg('Credencial o licencia de guía cuando la actividad o el área protegida lo exige')], officialRegistry: 'cuando_aplique' },
  asociacion: { label: msg('Asociación o centro de turismo comunitario'), documents: [msg('Acta o documento que reconoce a la organización'), msg('Constancia de quién la representa (asamblea, mandato)'), msg('Acuerdo de la comunidad para usar su nombre, relatos e imágenes')], officialRegistry: 'cuando_aplique' },
  representante: { label: msg('Representante autorizado de una comunidad'), documents: [msg('Documento de identidad'), msg('Mandato o autorización de la comunidad'), msg('Contacto de una segunda persona de la organización para confirmar')], officialRegistry: 'cuando_aplique' },
  otro: { label: msg('Otro emprendimiento'), documents: [msg('Cuéntanos qué haces; el equipo te dirá qué documentos corresponden a tu actividad')], officialRegistry: 'cuando_aplique' },
};

const STEPS = [
  msg('Crea tu cuenta y confirma tu correo.'),
  msg('Registra tu negocio y sube los documentos que correspondan.'),
  msg('Una persona revisa tu solicitud y puede pedir cambios.'),
  msg('Consulta la decisión desde tu panel. La revisión no activa cobros.'),
];

const DEMO_KEY = 'chullavida:v3:host-demo-requests';
interface DemoRequest { id: string; figure: HostFigure; name: string; createdAt: string; status: 'en_revision' }
function readDemo(): DemoRequest[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); return Array.isArray(value) ? value.filter((item): item is DemoRequest => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && item.name.length <= 120 && item.status === 'en_revision' && typeof item.figure === 'string' && Object.hasOwn(DOCS_BY_FIGURE, item.figure))).slice(0, 20) : []; }
  catch { return []; }
}

export function HostHub({ onClose }: { onClose: () => void }) {
  const t = useT();
  const configured = supabaseConfiguration().available;
  const [figure, setFigure] = useState<HostFigure>('asociacion');
  const [name, setName] = useState('');
  const [demo, setDemo] = useState<DemoRequest[]>(readDemo);
  const [notice, setNotice] = useState('');
  const info = DOCS_BY_FIGURE[figure];

  const submitDemo = () => {
    const clean = name.trim().slice(0, 120);
    if (!clean) { setNotice(msg('Escribe el nombre de tu emprendimiento o comunidad.')); return; }
    const next = [{ id: `demo-${Date.now().toString(36)}`, figure, name: clean, createdAt: new Date().toISOString(), status: 'en_revision' as const }, ...demo].slice(0, 20);
    setDemo(next);
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)); } catch { /* solo en memoria */ }
    setName('');
    setNotice(msg('Solicitud de demostración guardada en este dispositivo. Queda «en revisión»: nunca se aprueba sola.'));
  };

  return <Dialog title={t('Anfitriones y comunidades')} onClose={onClose} wide>
    <div className="dialog-content host-hub">
      <p className="host-hub-lead">{t('Registra tu negocio o comunidad. Prepara tus experiencias y solicita revisión.')}</p>
      <details className="host-hub-more"><summary><ClipboardList size={18} />{t('Cómo funciona la revisión')}</summary><ol className="host-hub-steps">{STEPS.map(step => <li key={step}>{t(step)}</li>)}</ol></details>
      <details className="host-hub-more host-hub-badges"><summary><BadgeCheck size={18} />{t('Dos distintivos, separados')}</summary>
        <div><strong><ShieldCheck size={16} />{t('Identidad y documentación revisadas por Chulla Vida')}</strong><p>{t('Una persona del equipo revisó tu identidad, tu representación y tus documentos. No es un aval del Gobierno.')}</p></div>
        <div><strong><BadgeCheck size={16} />{t('Registro turístico oficial verificado')}</strong><p>{t('Solo cuando existe evidencia de tu registro en el portal del Ministerio de Turismo y tu actividad lo requiere.')}</p></div>
      </details>
      <section aria-labelledby="hh-figure"><h3 id="hh-figure"><UserRound size={18} />{t('¿Qué te vamos a pedir?')}</h3>
        <label className="field-label" htmlFor="hh-figure-select">{t('Tu figura')}</label>
        <select id="hh-figure-select" className="field" value={figure} onChange={event => setFigure(event.target.value as HostFigure)}>{(Object.keys(DOCS_BY_FIGURE) as HostFigure[]).map(key => <option key={key} value={key}>{t(DOCS_BY_FIGURE[key].label)}</option>)}</select>
        <ul className="host-hub-docs">{info.documents.map(doc => <li key={doc}><FileLock2 size={15} />{t(doc)}</li>)}</ul>
        <p className="host-hub-note">{info.officialRegistry === 'normalmente' ? t('Esta figura normalmente requiere registro turístico.') : t('El registro turístico se pide solo cuando tu actividad lo requiere.')} {t('Consulta el')} <a href={OFFICIAL_REGISTRY_URL} target="_blank" rel="noreferrer">{t('portal oficial de registro de actividades turísticas')}<ExternalLink size={13} /></a>.</p>
      </section>
      <section aria-labelledby="hh-send" className="host-hub-send"><h3 id="hh-send">{t('Enviar tu solicitud')}</h3>
        {configured
          ? <><p>{t('Tu solicitud y tus documentos quedan en un espacio privado.')}</p><button className="button button-primary" onClick={() => { roleStore.requestHost(); onClose(); window.dispatchEvent(new Event('cv3:account')); }}>{t('Ir a mi cuenta y solicitar revisión')}</button></>
          : <><p className="host-hub-demo-label">{t('Modo demostración en este dispositivo: el servidor de cuentas aún no está configurado. Nada se envía a nadie y no se suben documentos.')}</p>
            <label className="field-label" htmlFor="hh-name">{t('Nombre del emprendimiento o comunidad')}</label>
            <input id="hh-name" className="field" value={name} onChange={event => setName(event.target.value)} maxLength={120} />
            <button className="button button-primary" onClick={submitDemo}>{t('Guardar solicitud de demostración')}</button></>}
        <p role="status" className="host-hub-status">{t(notice)}</p>
        {demo.length > 0 && <ul className="host-hub-queue" aria-label={t('Solicitudes de demostración')}>{demo.map(item => <li key={item.id}><strong>{item.name}</strong><span>{t(DOCS_BY_FIGURE[item.figure].label)}</span><em>{t('En revisión · demostración')}</em></li>)}</ul>}
      </section>
      <p className="host-hub-note">{t('Puedes preparar borradores. Las reservas requieren una oferta aprobada y los cobros configurados.')} <button className="host-hub-link" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:legal')); }}>{t('Acuerdo para anfitriones (borrador)')}</button>.</p>
    </div>
  </Dialog>;
}
