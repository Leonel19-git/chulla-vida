import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { commercialReadiness, legalDocuments } from '../../domain/legal';
import { DataProtectionSection } from '../privacy-rights/DataProtectionSection';
import './legal.css';

const texts = import.meta.glob('../../content/legal/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export function LegalCenter({ onClose, onPrivacy }: { onClose: () => void; onPrivacy: () => void }) {
  const [selected, setSelected] = useState(legalDocuments[0].id);
  const document = legalDocuments.find(item => item.id === selected)!;
  const content = texts[`../../content/legal/${document.file}`] ?? 'No se pudo cargar el documento.';
  return <Dialog title="Documentos y privacidad" onClose={onClose} wide><div className="dialog-content legal-center"><p className="legal-draft"><ShieldCheck size={22} /><span><strong>Borradores pendientes de revisión.</strong> Los documentos conservan campos por completar. No acreditan cumplimiento ni habilitan pagos o publicación comercial.</span></p><DataProtectionSection variant="compact" headingLevel={3} onOpenForm={onClose} /><label>Documento<select className="field" value={selected} onChange={event => setSelected(event.target.value)}>{legalDocuments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p className="legal-version">Versión {document.version ?? 'sin declarar'} · {document.date ?? 'fecha sin declarar'} · {document.pendingFieldCount} campos pendientes</p><article className="legal-copy">{content.split(/\r?\n/).map((line, index) => line.startsWith('# ') ? <h2 key={index}>{line.slice(2)}</h2> : line.startsWith('## ') ? <h3 key={index}>{line.slice(3)}</h3> : line.startsWith('### ') ? <h4 key={index}>{line.slice(4)}</h4> : line ? <p key={index}>{line}</p> : null)}</article><details className="legal-checks"><summary>Estado de preparación comercial</summary><ul>{commercialReadiness().blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></details><button className="button button-primary" onClick={() => { onClose(); onPrivacy(); }}>Cambiar privacidad y cookies</button></div></Dialog>;
}
