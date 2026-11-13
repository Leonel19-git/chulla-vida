import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = old; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`cv-dialog ${wide ? 'cv-dialog-wide' : ''}`} aria-labelledby={titleId} onCancel={() => closeRef.current()} onClick={e => { if (e.target === e.currentTarget) closeRef.current(); }}>
    <div className="dialog-top"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label={t('Cerrar ventana')} onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}
