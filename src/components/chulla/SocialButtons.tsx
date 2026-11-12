import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const networks = ['Instagram', 'Facebook', 'TikTok'];

function NetworkMark({ name }: { name: string }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'Instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></> : name === 'Facebook' ? <path d="M14 21v-8h3l.5-4H14V7c0-1 .5-2 2-2h2V2.5a21 21 0 0 0-3-.3c-3 0-5 1.8-5 5V9H7v4h3v8" /> : <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.5v3a1.5 1.5 0 1 0 1 1.5V3h3c.5 3 2 4.5 5 5v3c-2 0-3.5-.7-5-2" />}
  </svg>;
}

export function SocialButtons() {
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => setSelected(''), 3500);
    return () => clearTimeout(timer);
  }, [selected]);
  return <div className="social-demo">
    <div className="social-buttons" role="group" aria-label="Redes de CHULLA VIDA, botones simulados">
      {networks.map(name => <button key={name} className="social-button" aria-label={`${name} de CHULLA VIDA (simulación)`} onClick={() => setSelected(name)}><NetworkMark name={name} /><span>{name}</span></button>)}
    </div>
    <span className="social-demo-label">Redes sociales · Demostración</span>
    {selected && <div className="social-feedback" role="status"><NetworkMark name={selected} /><span><strong>{selected}</strong>Botón de demostración de CHULLA VIDA.</span><button className="icon-button" aria-label="Cerrar aviso de red social" onClick={() => setSelected('')}><X size={16} /></button></div>}
  </div>;
}
