import { useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, ExternalLink, Headphones, Leaf, MapPin, MessageCircle, Music2, Play, Send, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from './Dialog';
import { faqs, money, normalize, placeImage, shortTitle } from './content';
import type { Raymi } from '../../types';


const music = [
  { title: 'Folklore ecuatoriano', artist: 'Edwardalex-', region: 'Sierra', image: 'andes', mood: 'Música de nuestra tierra para acompañar el camino.', embed: 'playlist/1YViurI7F7HxTMSS0DiabA', url: 'https://open.spotify.com/playlist/1YViurI7F7HxTMSS0DiabA?si=4b3022f9f13a4235', type: 'Playlist compartida para CHULLA VIDA', class: 'folklore' },
  { title: 'Cumbias de la Costa', artist: 'Andy Merino Placencia', region: 'Costa', image: 'coast', mood: 'El ritmo del litoral para tu próxima escapada.', embed: 'playlist/18gSr3UmtEr6wuDRWSD4yX', url: 'https://open.spotify.com/playlist/18gSr3UmtEr6wuDRWSD4yX?si=a095a0dfe0544d19', type: 'Playlist compartida para CHULLA VIDA', class: 'coast' },
  { title: 'Música del Oriente', artist: 'Nathnx', region: 'Amazonía', image: 'forest', mood: 'Sonidos del Oriente para acompañar el camino.', embed: 'playlist/5nRsIgwAyODNTv4V6JzUZp', url: 'https://open.spotify.com/playlist/5nRsIgwAyODNTv4V6JzUZp?si=ef4c816edaa54a26', type: 'Playlist compartida para CHULLA VIDA', class: 'forest' },
];
export function MusicPanel() {
  const { t } = useApp();
  const [selection, setSelection] = useState(0);
  const [open, setOpen] = useState(false);
  const m = music[selection];
  return <section className="music-section music-section-andina" aria-labelledby="music-heading">
    <div className="music-intro">
      <div className="music-heading-icon"><Headphones size={23} /></div>
      <h2 id="music-heading">{t("Dale ritmo al viaje.")}</h2>
      <p>{t("De la Sierra al mar, pasando por el Oriente.")}</p>
      <span className="music-spotify"><Music2 size={15} />{t("Selecciones en Spotify")}</span>
    </div>
    <div className="music-player">
      <div className="music-route-art" aria-hidden="true"><img src={`/images/${m.image}.jpg`} alt="" loading="lazy" /><span>CHULLA VIDA<br /><strong>{t(m.region)}</strong></span></div>
      <div className="music-player-content" aria-live="polite">
        <h3>{t(m.title)}</h3><p>{m.artist}</p><span className="music-type">{t(m.type)}</span><span className="music-mood">{t(m.mood)}</span>
        <button className="button music-play-button" onClick={() => setOpen(true)}><Play size={15} fill="currentColor" />{t("Abrir reproductor")}<ArrowUpRight size={15} /></button>
        <a className="music-direct-link" href={m.url} target="_blank" rel="noreferrer">{t("Ir a Spotify")}<ExternalLink size={12} /></a>
      </div>
    </div>
    <div className="music-picks" role="group" aria-label={t("Seleccionar música para la ruta")}>{music.map((s, i) => <button key={s.title} className={selection === i ? 'active' : ''} aria-pressed={selection === i} onClick={() => setSelection(i)}><span className={`music-pick-icon ${s.class}`}><Music2 size={17} /></span><span><strong>{t(s.title)}</strong><small>{t(s.region)}</small></span>{selection === i ? <Check size={17} aria-label={t("Seleccionada")} /> : <ArrowRight size={16} />}</button>)}</div>
    {open && <Dialog title={t(m.title)} onClose={() => setOpen(false)}><div className="dialog-content music-embed-dialog"><p className="muted">{t("Una playlist compartida para tu viaje por Ecuador.")} {t("Pulsa reproducir dentro de Spotify para escuchar.")}</p><iframe className="spotify-embed" title={`Spotify: ${m.title}`} src={`https://open.spotify.com/embed/${m.embed}?utm_source=generator`} width="100%" height="352" allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /><p className="small-note">{t("Si el reproductor no carga, abre la selección directamente en Spotify. Algunas funciones dependen de tu cuenta.")}</p><a className="button button-secondary full-width" href={m.url} target="_blank" rel="noreferrer">{t("Abrir en Spotify")}<ExternalLink size={16} /></a></div></Dialog>}
  </section>;
}

export function HelpView() {
  const { t, role } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(role === 'turista' ? 'Todas' : 'Negocios');
  const items = faqs.filter(f => (category === 'Todas' || f.category === category) && normalize(t(f.question) + t(f.answer)).includes(normalize(query)));
  return <section className="help-view"><div className="page-heading"><h1>{t("Viaja con las cosas claras")}</h1><p>{t("Respuestas para preparar tu escapada y usar CHULLA VIDA.")}</p></div><label className="search-field"><SearchIcon /><input placeholder={t("¿En qué podemos ayudarte?")} aria-label={t("Buscar preguntas frecuentes")} value={query} onChange={e => setQuery(e.target.value)} /></label><div className="segmented-tabs" role="group" aria-label={t("Categoría de ayuda")}>{['Todas', 'Viajeros', 'Negocios', 'Música'].map(c => <button className={category === c ? 'active' : ''} aria-pressed={category === c} key={c} onClick={() => setCategory(c)}>{t(c)}</button>)}</div><div className="faq-list">{items.map(f => <details key={t(f.question)}><summary>{t(f.question)}<ChevronDown size={18} /></summary><p>{t(f.answer)}</p></details>)}</div>{!items.length && <div className="empty-state"><CircleHelp size={32} /><h3>{t("No encontramos esa pregunta")}</h3><p>{t("Prueba con «presupuesto», «reserva» o «negocio».")}</p><button className="text-button" onClick={() => { setQuery(''); setCategory('Todas'); }}>{t("Mostrar todas las respuestas")}</button></div>}<div className="help-note"><Leaf size={24} /><div><h3>{t("El mejor viaje también cuida de quienes reciben.")}</h3><p>{t("Pregunta, escucha y respeta los ritmos de cada comunidad.")}</p></div></div></section>;
}
function SearchIcon() { return <CircleHelp size={19} />; }

export function FestivalsView() {
  const { t, raymis } = useApp();
  const [selected, setSelected] = useState<Raymi | null>(null);
  return <section><div className="page-heading"><h1>{t("Un Ecuador que celebra")}</h1><p>{t("Conoce sus Raymis y tradiciones. Acércate con curiosidad y respeto.")}</p></div><div className="festival-list">{[...raymis].sort((a, b) => a.id === 'raymi-kapak' ? -1 : b.id === 'raymi-kapak' ? 1 : 0).map((r, i) => <article className="festival-row" key={r.id}><div className={`festival-symbol festival-symbol-${i % 3}`}><CalendarDays size={28} /></div><div><span className="place-location"><MapPin size={13} />{r.provincia} · {r.region}</span><h2>{r.nombre.split(' (')[0]}</h2><p>{r.significado_ancestral}</p><span className="festival-date">{t("Referencia del calendario:")} {r.fecha_celebracion}</span></div><button className="button button-secondary" onClick={() => setSelected(r)}>{t("Conocer tradición")}<ArrowUpRight size={16} /></button></article>)}</div><p className="small-note">{t("Las celebraciones pueden variar según cada comunidad. Consulta las fechas y condiciones de participación con sus organizadores.")}</p>{selected && <Dialog title={selected.nombre.split(' (')[0]} onClose={() => setSelected(null)}><div className="dialog-content"><p className="place-location"><MapPin size={15} />{selected.canton}, {selected.provincia}</p><p>{selected.historia_origen}</p><h3>{t("Participa con respeto")}</h3><ul className="plain-list">{selected.protocolo_respeto.map(p => <li key={p}>{p}</li>)}</ul><h3>{t("Elementos de la tradición")}</h3><div className="plan-interests">{selected.elementos_rituales.map(e => <span className="soft-tag" key={e}>{e}</span>)}</div></div></Dialog>}</section>;
}

export function CommunityView() {
  const { t, chatMessages, sendChatMessage } = useApp();
  const channels = [{ id: '#panas-de-ruta', label: 'Panas de ruta', desc: 'Las mejores historias se comparten.' }, { id: '#sierra', label: 'Sierra', desc: 'Rutas de páramo, pueblos y montañas.' }, { id: '#costa', label: 'Costa', desc: 'Entre el mar y los caminos del litoral.' }, { id: '#amazonia', label: 'Amazonía', desc: 'Ideas para descubrir el bosque.' }];
  const [channel, setChannel] = useState(channels[0].id);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const visible = chatMessages.filter(m => m.canal === channel);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!message.trim()) return; sendChatMessage(channel, message); setMessage(''); setFeedback('Tu mensaje se guardó en este navegador.'); };
  return <section><div className="page-heading"><h1>{t("Entre wambras, el viaje se comparte")}</h1><p>{t("Ideas, preguntas y ganas de conocer el siguiente destino.")}</p></div><div className="community-shell"><aside className="community-channels"><h2>{t("Conversaciones")}</h2>{channels.map(c => <button key={c.id} className={c.id === channel ? 'active' : ''} onClick={() => { setChannel(c.id); setFeedback(''); }} aria-pressed={channel === c.id}><MessageCircle size={17} />{t(c.label)}</button>)}<p>{t("Espacio de demostración.")}<br />{t("Los mensajes solo son visibles en este navegador.")}</p></aside><div className="conversation"><div className="conversation-heading"><h2>{t(channels.find(c => c.id === channel)?.label || '')}</h2><p>{t(channels.find(c => c.id === channel)?.desc || '')}</p></div><div className="messages">{visible.length ? visible.map(m => <article key={m.id} className={`message ${m.usuario_id === 'user-current' ? 'own' : ''}`}><span className="message-avatar">{m.usuario_nombre.split(' ').map(s => s[0]).slice(0, 2).join('')}</span><div><div className="message-name"><strong>{m.usuario_nombre.replace(/guambra/gi, 'Wambra')}</strong><span>{m.timestamp}</span></div><p>{m.mensaje}</p></div></article>) : <div className="empty-state"><MessageCircle size={30} /><h3>{t("Una conversación empieza con una pregunta")}</h3><p>{t("Escribe una idea de viaje para probar este espacio.")}</p></div>}</div><form className="message-form" onSubmit={submit}><label className="sr-only" htmlFor="community-message">{t("Tu mensaje")}</label><input id="community-message" className="field" value={message} onChange={e => setMessage(e.target.value)} placeholder={t("Comparte una idea para la ruta…")} maxLength={1000} required /><button type="submit" className="button button-primary" disabled={!message.trim()} aria-label={t("Guardar mensaje en este navegador")}><Send size={18} /></button></form><p className="small-note" role="status">{t(feedback || 'Prueba local · No se envían mensajes a otras personas.')}</p></div></div></section>;
}
