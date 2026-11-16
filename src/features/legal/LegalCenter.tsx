import { useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { commercialReadiness, legalDocuments } from '../../domain/legal';
import { DataProtectionSection } from '../privacy-rights/DataProtectionSection';
import './legal.css';

import { useT } from '../../i18n/v3';
import { SpanishContentNote } from '../../i18n/v3/SpanishContentNote';
/** «**negrita**» del Markdown se muestra como negrita, no con asteriscos. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part);
}
const texts = import.meta.glob('../../content/legal/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export function LegalCenter({ onClose, onPrivacy }: { onClose: () => void; onPrivacy: () => void }) {
  const t = useT();
  const [selected, setSelected] = useState(legalDocuments[0].id);
  const document = legalDocuments.find(item => item.id === selected)!;
  const content = texts[`../../content/legal/${document.file}`] ?? 'No se pudo cargar el documento.';
  return <Dialog title={t("Documentos y privacidad")} onClose={onClose} wide><div className="dialog-content legal-center"><SpanishContentNote text="Documentos legales en español (versión oficial)" /><p className="legal-draft"><ShieldCheck size={22} /><span><strong>{t("Borradores pendientes de revisión.")}</strong>{' '}{t("Aún tienen campos por completar y no acreditan cumplimiento.")}</span></p><DataProtectionSection variant="compact" headingLevel={3} onOpenForm={onClose} /><label>{t("Documento")}<select className="field" value={selected} onChange={event => setSelected(event.target.value)}>{legalDocuments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p className="legal-version">{t("Versión")}{' '}{document.version ?? 'sin declarar'} · {document.date ?? 'fecha sin declarar'} · {document.pendingFieldCount}{' '}{t("campos pendientes")}</p><details className="legal-read"><summary>{t("Leer el documento completo")}</summary><article className="legal-copy">{content.split(/\r?\n/).map((line, index) => line.startsWith('# ') ? <h2 key={index}>{inline(line.slice(2))}</h2> : line.startsWith('## ') ? <h3 key={index}>{inline(line.slice(3))}</h3> : line.startsWith('### ') ? <h4 key={index}>{inline(line.slice(4))}</h4> : /^[-*] /.test(line) ? <p key={index} className="legal-item">• {inline(line.slice(2))}</p> : line ? <p key={index}>{inline(line)}</p> : null)}</article></details><details className="legal-checks"><summary>{t("Estado de preparación comercial")}</summary><ul>{commercialReadiness().blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></details><button className="button button-primary" onClick={() => { onClose(); onPrivacy(); }}>{t("Cambiar privacidad y cookies")}</button></div></Dialog>;
}
