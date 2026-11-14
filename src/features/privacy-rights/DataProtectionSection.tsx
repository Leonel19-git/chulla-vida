import { useId } from 'react';
import { FileDown, FileText, PenLine, ShieldCheck } from 'lucide-react';
import { openRightsForm, PRIVACY_DOCUMENTS } from './documents';
import { PRIVACY_CONTACT_PLACEHOLDER } from './rights';
import './privacy-rights.css';

/**
 * «Protección de tus datos personales». Reutilizable en la página (variant="page") y en el pie o el centro legal (variant="compact").
 * `onOpenForm` permite cerrar el panel que la contiene antes de abrir el formulario en línea.
 */
export function DataProtectionSection({ variant = 'page', onOpenForm, headingLevel = 2 }: { variant?: 'page' | 'compact'; onOpenForm?: () => void; headingLevel?: 2 | 3 }) {
  const titleId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return <section className={`data-protection data-protection-${variant}`} aria-labelledby={titleId}>
    <div className="data-protection-mark" aria-hidden="true"><ShieldCheck size={variant === 'page' ? 30 : 24} /></div>
    <div className="data-protection-body">
      <p className="data-protection-kicker">Ley Orgánica de Protección de Datos Personales</p>
      <Heading id={titleId}>Protección de tus datos personales</Heading>
      <p>En CHULLA VIDA cuidamos tu información con el mismo respeto con el que cuidamos cada ruta: la tratamos de forma segura, legal y confidencial, y solo para lo que tú necesitas al viajar. Seguimos la LOPDP de Ecuador, así que tú decides: puedes pedir acceso a tus datos, corregirlos, actualizarlos o eliminarlos, y oponerte a usos que no quieras.</p>
      {variant === 'page' && <ul className="data-protection-points">
        <li><strong>Lo mínimo.</strong> Pedimos solo los datos que cada función necesita. Tu voz no se guarda.</li>
        <li><strong>Sin sorpresas.</strong> Nada de publicidad ni analítica. El contenido externo se carga solo si lo permites.</li>
        <li><strong>Pagos seguros.</strong> Los datos de tarjeta los maneja el proveedor de pagos; nosotros nunca los vemos.</li>
      </ul>}
      <p className="data-protection-note">Los documentos son un borrador pendiente de revisión jurídica y conservan campos por completar del responsable.</p>
      <div className="data-protection-actions">
        <a className="data-protection-download" href={PRIVACY_DOCUMENTS.notice.href} download={PRIVACY_DOCUMENTS.notice.file} type="application/pdf"><FileDown size={18} aria-hidden="true" /><span>{PRIVACY_DOCUMENTS.notice.label}<small>PDF · borrador</small></span></a>
        <a className="data-protection-download" href={PRIVACY_DOCUMENTS.form.href} download={PRIVACY_DOCUMENTS.form.file} type="application/pdf"><FileText size={18} aria-hidden="true" /><span>{PRIVACY_DOCUMENTS.form.label}<small>PDF rellenable · borrador</small></span></a>
        <button type="button" className="data-protection-online" onClick={() => { onOpenForm?.(); openRightsForm(); }}><PenLine size={18} aria-hidden="true" /><span>Llenar el formulario en línea<small>Sin descargar nada</small></span></button>
      </div>
      <p className="data-protection-contact">También puedes escribir a {PRIVACY_CONTACT_PLACEHOLDER}. Si sientes que no atendimos tu pedido, la autoridad es la <a href="https://www.spdp.gob.ec/" target="_blank" rel="noopener noreferrer">Superintendencia de Protección de Datos Personales</a>.</p>
    </div>
  </section>;
}
