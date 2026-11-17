import { ArrowUpRight } from 'lucide-react';
import { TRAVEL_SOCIALS } from '../../features/discovery/social-links';
import { useT } from '../../i18n/v3';

function NetworkMark({ name }: { name: string }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'Instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></> : name === 'Facebook' ? <path d="M14 21v-8h3l.5-4H14V7c0-1 .5-2 2-2h2V2.5a21 21 0 0 0-3-.3c-3 0-5 1.8-5 5V9H7v4h3v8" /> : <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.5v3a1.5 1.5 0 1 0 1 1.5V3h3c.5 3 2 4.5 5 5v3c-2 0-3.5-.7-5-2" />}
  </svg>;
}

export function SocialButtons() {
  const t = useT();
  return <div className="social-demo">
    <div className="social-buttons" role="group" aria-label={t('Ecuador Travel en redes')}>
      {TRAVEL_SOCIALS.map(({name,handle,url}) => <a key={name} className="social-button" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name}: ${handle}`}><NetworkMark name={name} /><span>{name}</span><ArrowUpRight size={14} /></a>)}
    </div>
    <span className="social-demo-label">{t('Inspiración externa · Ecuador Travel')}</span>
  </div>;
}
