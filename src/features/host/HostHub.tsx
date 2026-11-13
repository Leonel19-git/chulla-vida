import { useState } from 'react';
import { BadgeCheck, ClipboardList, ExternalLink, FileLock2, ShieldCheck, UserRound } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { supabaseConfiguration } from '../../lib/supabase';
import './host-hub.css';

export type HostFigure = 'establecimiento' | 'operador' | 'guia' | 'asociacion' | 'representante' | 'otro';
const OFFICIAL_REGISTRY_URL = 'https://servicios.turismo.gob.ec/registro-de-actividades-turisticas/';

/** Documentación orientativa por figura. La lista final la aprueba el responsable legal (ver docs/VERIFICACION_COMERCIANTES.md). */
export const DOCS_BY_FIGURE: Record<HostFigure, { label: string; documents: string[]; officialRegistry: 'cuando_aplique' | 'normalmente' }> = {
  establecimiento: { label: 'Establecimiento (alojamiento, restaurante, cafetería)', documents: ['RUC o RISE del negocio, si corresponde', 'Documento de identidad de la persona responsable', 'Fotos propias del lugar y permiso para publicarlas'], officialRegistry: 'normalmente' },
  operador: { label: 'Operador turístico o agencia', documents: ['RUC de la empresa', 'Nombramiento o poder de quien la representa', 'Pólizas o medidas de seguridad de las actividades'], officialRegistry: 'normalmente' },
  guia: { label: 'Guía', documents: ['Documento de identidad', 'Credencial o licencia de guía cuando la actividad o el área protegida lo exige'], officialRegistry: 'cuando_aplique' },
  asociacion: { label: 'Asociación o centro de turismo comunitario', documents: ['Acta o documento que reconoce a la organización', 'Constancia de quién la representa (asamblea, mandato)', 'Acuerdo de la comunidad para usar su nombre, relatos e imágenes'], officialRegistry: 'cuando_aplique' },
  representante: { label: 'Representante autorizado de una comunidad', documents: ['Documento de identidad', 'Mandato o autorización de la comunidad', 'Contacto de una segunda persona de la organización para confirmar'], officialRegistry: 'cuando_aplique' },
  otro: { label: 'Otro emprendimiento', documents: ['Cuéntanos qué haces; el equipo te dirá qué documentos corresponden a tu actividad'], officialRegistry: 'cuando_aplique' },
};

const STEPS = [
  'Crea tu cuenta y confirma tu correo.',
  'Elige tu figura: no a todos se les pide lo mismo.',
  'Completa tus datos públicos y un contacto autorizado.',
  'Sube tus documentos a un espacio privado; solo tú y el equipo revisor los ven.',
  'Una persona revisa con una lista de control. Puede pedirte que corrijas algo.',
  'Si tu actividad lo requiere, se consulta el registro turístico oficial aparte.',
  'Recibes el distintivo que corresponda, con fecha y revisión periódica.',
  'Puedes apelar una decisión; los reportes y la revalidación protegen a todos.',
];

const DEMO_KEY = 'chullavida:v3:host-demo-requests';
interface DemoRequest { id: string; figure: HostFigure; name: string; createdAt: string; status: 'en_revision' }
function readDemo(): DemoRequest[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); return Array.isArray(value) ? value.filter((item): item is DemoRequest => Boolean(item && typeof item.id === 'string' && item.status === 'en_revision' && item.figure in DOCS_BY_FIGURE)).slice(0, 20) : []; }
  catch { return []; }
}

export function HostHub({ onClose }: { onClose: () => void }) {
  const configured = supabaseConfiguration().available;
  const [figure, setFigure] = useState<HostFigure>('asociacion');
  const [name, setName] = useState('');
  const [demo, setDemo] = useState<DemoRequest[]>(readDemo);
  const [notice, setNotice] = useState('');
  const info = DOCS_BY_FIGURE[figure];

  const submitDemo = () => {
    const clean = name.trim().slice(0, 120);
    if (!clean) { setNotice('Escribe el nombre de tu emprendimiento o comunidad.'); return; }
    const next = [{ id: `demo-${Date.now().toString(36)}`, figure, name: clean, createdAt: new Date().toISOString(), status: 'en_revision' as const }, ...demo].slice(0, 20);
    setDemo(next);
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)); } catch { /* solo en memoria */ }
    setName('');
    setNotice('Solicitud de demostración guardada en este dispositivo. Queda «en revisión»: nunca se aprueba sola.');
  };

  return <Dialog title="Anfitriones y comunidades" onClose={onClose} wide>
    <div className="dialog-content host-hub">
      <p className="host-hub-lead">Publica tus experiencias, recibe solicitudes y cuenta tu historia con tus propias palabras. Pensado también para emprendimientos rurales que no tienen todos los papeles de una empresa grande.</p>
      <section aria-labelledby="hh-steps"><h3 id="hh-steps"><ClipboardList size={18} />Cómo funciona la verificación</h3><ol className="host-hub-steps">{STEPS.map(step => <li key={step}>{step}</li>)}</ol></section>
      <section aria-labelledby="hh-badges" className="host-hub-badges"><h3 id="hh-badges"><BadgeCheck size={18} />Dos distintivos, separados</h3>
        <div><strong><ShieldCheck size={16} />Identidad y documentación revisadas por Chulla Vida</strong><p>Una persona del equipo revisó tu identidad, tu representación y tus documentos. No es un aval del Gobierno.</p></div>
        <div><strong><BadgeCheck size={16} />Registro turístico oficial verificado</strong><p>Solo cuando existe evidencia de tu registro en el portal del Ministerio de Turismo y tu actividad lo requiere.</p></div>
      </section>
      <section aria-labelledby="hh-figure"><h3 id="hh-figure"><UserRound size={18} />¿Qué te vamos a pedir?</h3>
        <label className="field-label" htmlFor="hh-figure-select">Tu figura</label>
        <select id="hh-figure-select" className="field" value={figure} onChange={event => setFigure(event.target.value as HostFigure)}>{(Object.keys(DOCS_BY_FIGURE) as HostFigure[]).map(key => <option key={key} value={key}>{DOCS_BY_FIGURE[key].label}</option>)}</select>
        <ul className="host-hub-docs">{info.documents.map(doc => <li key={doc}><FileLock2 size={15} />{doc}</li>)}</ul>
        <p className="host-hub-note">{info.officialRegistry === 'normalmente' ? 'Esta figura normalmente requiere registro turístico.' : 'El registro turístico se pide solo cuando tu actividad lo requiere.'} Consulta el <a href={OFFICIAL_REGISTRY_URL} target="_blank" rel="noreferrer">portal oficial de registro de actividades turísticas<ExternalLink size={13} /></a>.</p>
      </section>
      <section aria-labelledby="hh-send" className="host-hub-send"><h3 id="hh-send">Enviar tu solicitud</h3>
        {configured
          ? <><p>Con tu cuenta conectada, la solicitud y los documentos se guardan en Supabase con acceso privado.</p><button className="button button-primary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:account')); }}>Ir a mi cuenta y solicitar revisión</button></>
          : <><p className="host-hub-demo-label">Modo demostración en este dispositivo: el servidor de cuentas aún no está configurado. Nada se envía a nadie y no se suben documentos.</p>
            <label className="field-label" htmlFor="hh-name">Nombre del emprendimiento o comunidad</label>
            <input id="hh-name" className="field" value={name} onChange={event => setName(event.target.value)} maxLength={120} />
            <button className="button button-primary" onClick={submitDemo}>Guardar solicitud de demostración</button></>}
        <p role="status" className="host-hub-status">{notice}</p>
        {demo.length > 0 && <ul className="host-hub-queue" aria-label="Solicitudes de demostración">{demo.map(item => <li key={item.id}><strong>{item.name}</strong><span>{DOCS_BY_FIGURE[item.figure].label}</span><em>En revisión · demostración</em></li>)}</ul>}
      </section>
      <p className="host-hub-note">Puedes crear borradores de experiencias aunque no estés verificado; no serán reservables hasta completar la revisión, el precio validado y el convenio de reparto. Acuerdo de referencia: <button className="host-hub-link" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:legal')); }}>acuerdo para comerciantes y anfitriones (borrador)</button>.</p>
    </div>
  </Dialog>;
}
