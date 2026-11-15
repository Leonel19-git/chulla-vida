import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowUpRight, Captions, CloudSun, Compass, Keyboard, Mic, MicOff, RotateCcw, Send, Sparkles, Square, Trash2, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { experiences } from '../../domain/catalog';
import type { Experience } from '../../domain/catalog/types';
import { getWeather, searchWeatherLocalities, weatherAdvice, type WeatherLocality, type WeatherReport } from '../../domain/weather';
import { Dialog } from '../../components/chulla/Dialog';
import { answerLocally, type AssistantAnswer } from './knowledge';
import { isWeatherQuestion, microphoneMessages, microphonePermission, microphoneUnblockSteps, navigationFromVoice, permissionPromptMessage, requestMicrophone, voiceDebug, weatherLocalityFromVoice, type VoiceNavigation } from './voice-tools';
import { END_GRACE_MS, MAX_LISTEN_MS, RECOGNITION_LANGS, START_WATCHDOG_MS, chunkSpeech, engineSilentMessage, classifyRecognitionError, loadVoices, markVoiceNoticeSeen, pickSpanishVoice, readVoiceNoticeSeen, recognitionMessages, speechRates, unsupportedVoiceMessage, type SpeechRate } from './speech';
import './assistant.css';
export interface MijinAssistantProps { onOpenExperience?: (id: string) => void; publicExperiences?: Experience[]; downloadedExperiences?: Experience[]; downloadedAt?: string; onOpenPrivacy?: () => void }
interface RecognitionResult { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }
interface Recognition { lang: string; continuous: boolean; interimResults: boolean; maxAlternatives?: number; onresult: ((event: RecognitionResult) => void) | null; onend: (() => void) | null; onerror: ((event: { error: string }) => void) | null; onstart?: (() => void) | null; onaudiostart?: (() => void) | null; start(): void; stop?(): void; abort(): void }
type RecognitionConstructor = new () => Recognition;
type Phase = 'ready' | 'permission' | 'starting' | 'listening' | 'thinking' | 'speaking' | 'error';
/** A voice problem shown next to the microphone, with a retry button; `steps` lists how to unblock the permission. */
interface VoiceProblem { message: string; steps?: readonly string[] }
const browserRecognition = () => { const browser = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }; return browser.SpeechRecognition ?? browser.webkitSpeechRecognition; };
const navigationLabels: Record<VoiceNavigation, string> = { plan: 'Armar mi viaje', culture: 'Cultura Viva', passport: 'Mi pasaporte', downloads: 'Mis descargas', account: 'Cuenta y negocio', alerts: 'Alertas y notificaciones' };
export function MijinAssistant(props: MijinAssistantProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener('cv3:mijin', show); return () => window.removeEventListener('cv3:mijin', show); }, []);
  return <><button className="mijin-launcher" onClick={() => setOpen(true)} aria-label="Habla con MIJIN, tu pana de aventuras" aria-haspopup="dialog"><span className="mijin-launcher-mark" aria-hidden="true"><Mic size={21} /></span><span>Habla con MIJIN</span></button>{open && <MijinConversation {...props} onClose={() => setOpen(false)} />}</>;
}
function MijinConversation({ onClose, onOpenExperience, publicExperiences, downloadedExperiences = [], downloadedAt, onOpenPrivacy }: MijinAssistantProps & { onClose: () => void }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [phase, setPhase] = useState<Phase>('ready');
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [rate, setRate] = useState<SpeechRate>(1);
  const [readAnswers, setReadAnswers] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [input, setInput] = useState('');
  const [textFallback, setTextFallback] = useState(true);
  const [turn, setTurn] = useState<{ question: string; answer: AssistantAnswer } | null>(null);
  const [notice, setNotice] = useState('');
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherQuery, setWeatherQuery] = useState('');
  const [weatherLocalities, setWeatherLocalities] = useState<WeatherLocality[]>([]);
  const [weatherConsent, setWeatherConsent] = useState(false);
  const [weatherPending, setWeatherPending] = useState(false);
  const [navigation, setNavigation] = useState<VoiceNavigation | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const voiceAnswers = useRef(false);
  const readingEnabled = useRef(true);
  const rateRef = useRef<SpeechRate>(1);
  const timers = useRef<number[]>([]);
  const micGranted = useRef(false);
  const utterances = useRef<SpeechSynthesisUtterance[]>([]);
  const [problem, setProblem] = useState<VoiceProblem | null>(null);
  const [hint, setHint] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const textInput = useRef<HTMLInputElement>(null);
  const catalog = online ? publicExperiences ?? experiences : downloadedExperiences;
  const hasVoice = Boolean(browserRecognition());
  const hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const stopAudio = useCallback(() => {
    timers.current.forEach(id => window.clearTimeout(id)); timers.current = [];
    const instance = recognition.current; recognition.current = null;
    if (instance) { instance.onresult = null; instance.onend = null; instance.onerror = null; instance.onstart = null; instance.onaudiostart = null; try { instance.abort(); } catch { /* already stopped */ } }
    if (hasSpeech) window.speechSynthesis.cancel();
    utterances.current = [];
  }, [hasSpeech]);
  function stopEverything() { generation.current += 1; stopAudio(); setWeatherPending(false); setProblem(null); setPhase('ready'); setNotice('Voz detenida. El micrófono está apagado.'); }
  const later = (callback: () => void, ms: number) => { const id = window.setTimeout(() => { timers.current = timers.current.filter(item => item !== id); callback(); }, ms); timers.current.push(id); return id; };
  const cancelTimer = (id: number | undefined) => { if (id === undefined) return; window.clearTimeout(id); timers.current = timers.current.filter(item => item !== id); };
  useEffect(() => {
    mounted.current = true;
    const update = () => { setOnline(navigator.onLine); if (!navigator.onLine) { generation.current += 1; stopAudio(); setWeatherPending(false); setPhase('ready'); } };
    const visibility = () => { if (document.visibilityState === 'hidden') { generation.current += 1; stopAudio(); setPhase('ready'); setWeatherPending(false); } };
    window.addEventListener('online', update); window.addEventListener('offline', update); document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; generation.current += 1; stopAudio(); window.removeEventListener('online', update); window.removeEventListener('offline', update); document.removeEventListener('visibilitychange', visibility); };
  }, [stopAudio]);
  /** Reads an answer aloud. Automatic only for questions asked by voice; `manual` comes from the «Escuchar» button. */
  function speak(text: string, request: number, manual = false) {
    if (!mounted.current || request !== generation.current) return;
    if (!hasSpeech || (!manual && (!voiceAnswers.current || !readingEnabled.current))) { setPhase('ready'); return; }
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const chunks = chunkSpeech(text.slice(0, 1600));
    if (!chunks.length) { setPhase('ready'); return; }
    const play = (voices: SpeechSynthesisVoice[]) => {
      if (!mounted.current || request !== generation.current) return;
      const voice = pickSpanishVoice(voices);
      setVoiceName(voice?.name ?? '');
      voiceDebug('tts', { voice: voice?.name ?? null, lang: voice?.lang ?? null, chunks: chunks.length, rate: rateRef.current });
      // Chrome drops `onend` when an utterance is garbage-collected: keep a reference until the turn ends.
      utterances.current = [];
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterances.current.push(utterance);
        utterance.lang = voice?.lang ?? 'es-US'; utterance.voice = voice; utterance.rate = rateRef.current;
        if (index === chunks.length - 1) utterance.onend = () => { if (mounted.current && request === generation.current) { utterances.current = []; setPhase('ready'); } };
        utterance.onerror = (event?: { error?: string }) => {
          if (event?.error === 'interrupted' || event?.error === 'canceled') return;
          voiceDebug('tts-error', { error: event?.error ?? 'unknown' });
          if (mounted.current && request === generation.current) { synthesis.cancel(); setPhase('ready'); setNotice('La lectura no pudo completarse. La respuesta queda en los subtítulos.'); }
        };
        synthesis.speak(utterance);
      });
      // Chrome can stay paused after a cancel; resuming is harmless elsewhere.
      if (synthesis.paused) synthesis.resume?.();
      // If the engine never reports the end, do not leave the orb stuck in «Te cuento…».
      const expected = chunks.join(' ').length * 95 / rateRef.current + 4000;
      later(() => { if (mounted.current && request === generation.current && !synthesis.speaking) setPhase(current => current === 'speaking' ? 'ready' : current); }, expected);
    };
    setPhase('speaking');
    const voices = synthesis.getVoices?.() ?? [];
    if (voices.length) play(voices); else void loadVoices(synthesis).then(play);
  }
  function answer(text: string, question: string, request: number, canonical?: AssistantAnswer) {
    if (!mounted.current || request !== generation.current) return;
    const result = canonical ?? { text, spokenSummary: text, cards: [], warnings: [], mode: online ? 'local_faq' as const : 'offline_downloads' as const, pricesAreEstimates: true as const, needsConfirmation: true as const };
    setTurn({ question, answer: result }); speak(result.spokenSummary, request);
  }
  async function consultWeather(reference: WeatherLocality, question: string, request = generation.current) {
    setWeatherPending(true); setPhase('thinking'); setNotice(`Consultando el pronóstico de ${reference.placeName}…`);
    try {
      const report = await getWeather(reference, { online }); if (!mounted.current || request !== generation.current) return;
      setWeather(report); setWeatherLocalities([]); setNotice('Pronóstico recibido. Revisa la fuente y la hora.');
      const time = new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: report.timezone }).format(new Date(report.fetchedAt));
      answer(`En ${report.place}, el pronóstico modelado indica ${report.temperatureC} grados, sensación de ${report.apparentC}, viento de ${report.windKmh} kilómetros por hora. ${weatherAdvice(report)} Fuente Open-Meteo, consultado a las ${time}, zona ${report.timezone}.`, question, request);
    } catch (error) { if (request === generation.current) answer(error instanceof Error ? error.message : 'No tengo el clima actualizado.', question, request); }
    finally { if (mounted.current && request === generation.current) setWeatherPending(false); }
  }
  async function findWeather(query: string, question: string, request = generation.current) {
    if (!online) { answer('No tengo el clima actualizado sin conexión.', question, request); return; }
    setWeatherPending(true); setPhase('thinking'); setWeather(null); setNotice(`Buscando ${query} en Ecuador…`);
    try {
      const options = await searchWeatherLocalities(query, { online }); if (!mounted.current || request !== generation.current) return;
      if (!options.length) { answer('No encontré esa localidad en Ecuador. Dime la ciudad o el cantón cercano.', question, request); return; }
      setWeatherLocalities(options);
      if (options.length === 1) await consultWeather(options[0], question, request);
      else answer(`Encontré ${options.length} localidades. Confirma la referencia en las opciones o di primera, segunda o tercera. No uso tu ubicación.`, question, request);
    } catch (error) { if (request === generation.current) answer(error instanceof Error ? error.message : 'No tengo el clima actualizado.', question, request); }
    finally { if (mounted.current && request === generation.current) setWeatherPending(false); }
  }
  function ask(question: string, fromVoice = false) {
    const trimmed = question.trim().slice(0, 1000); if (!trimmed) return;
    stopAudio(); const request = ++generation.current; setPhase('thinking'); setProblem(null); setInput(''); setTranscript(trimmed); setNotice(''); setNavigation(null); setWeather(null); setWeatherPending(false);
    // Speaking back automatically only follows a question the person asked with the microphone they tapped.
    voiceAnswers.current = readingEnabled.current && fromVoice;
    if (weatherLocalities.length && weatherConsent) {
      const choice = /\b(primera|segund[ao]|tercer[ao]|cuart[ao]|[1-4])\b/i.exec(trimmed)?.[1]?.toLowerCase();
      const index = choice ? ['primera', 'segunda', 'tercera', 'cuarta'].indexOf(choice.replace(/o$/, 'a')) : -1;
      const number = index >= 0 ? index : choice && /^\d$/.test(choice) ? +choice - 1 : -1;
      if (weatherLocalities[number]) { void consultWeather(weatherLocalities[number], trimmed, request); return; }
    }
    setWeatherLocalities([]);
    const target = navigationFromVoice(trimmed);
    if (target && fromVoice) { close(); window.dispatchEvent(new Event(`cv3:${target}`)); return; }
    if (target) setNavigation(target);
    if (isWeatherQuestion(trimmed)) {
      const query = weatherLocalityFromVoice(trimmed, catalog); setWeatherQuery(query ?? '');
      if (!online) { answer('No tengo el clima actualizado sin internet. Tu biblioteca descargada sigue disponible.', trimmed, request); return; }
      if (!query) { answer('¿De qué localidad de Ecuador quieres el clima? Di, por ejemplo, clima de Baños.', trimmed, request); return; }
      if (!weatherConsent) { answer(`Puedo consultar el pronóstico de ${query}. Primero permite la consulta a Open-Meteo con el botón que aparece abajo. Solo enviaré el nombre de la localidad, sin tu ubicación.`, trimmed, request); return; }
      void findWeather(query, trimmed, request); return;
    }
    const result = answerLocally(trimmed, { catalog, online, downloadedAt });
    if (fromVoice && onOpenExperience && /^(?:mijin[ ,]*)?(?:abre|muestra|muestrame)\b/i.test(trimmed) && result.cards.length === 1) { openPlace(result.cards[0].id); return; }
    answer(result.text, trimmed, request, result);
  }
  const focusText = () => window.setTimeout(() => textInput.current?.focus(), 0);
  const fail = (message: string, steps?: readonly string[]) => { setPhase('error'); setHint(''); setProblem({ message, steps }); };
  /**
   * Tapping the microphone IS the consent gesture. First an explicit getUserMedia permission (released at once),
   * then SpeechRecognition with a start watchdog and language fallback. Never silent: every outcome shows a message.
   */
  async function startVoice() {
    const Constructor = browserRecognition();
    if (!Constructor) { setPhase('ready'); setNotice(unsupportedVoiceMessage); focusText(); return; }
    if (!online) { setPhase('ready'); setNotice('Sin conexión, el reconocimiento de voz del navegador no funciona. Escríbeme abajo: busco en tus fichas descargadas.'); focusText(); return; }
    if (!readVoiceNoticeSeen()) { markVoiceNoticeSeen(); setVoiceNotice(true); }
    stopAudio(); const request = ++generation.current; setTranscript(''); setNotice(''); setProblem(null);
    const isCurrent = () => mounted.current && request === generation.current;
    if (!micGranted.current) {
      setPhase('permission'); setHint('Encendiendo el micrófono…');
      const prompt = permissionPromptMessage();
      // Show the «pulsa Permitir» guidance as soon as we know (or suspect) the browser is showing its prompt.
      const slow = later(() => { if (isCurrent()) setHint(prompt); }, 350);
      void microphonePermission().then(state => { voiceDebug('permission-state', { state }); if (!isCurrent()) return; if (state === 'prompt') { cancelTimer(slow); setHint(prompt); } });
      const mic = await requestMicrophone();
      cancelTimer(slow);
      voiceDebug('microphone', { result: mic });
      if (!isCurrent()) return;
      if (mic === 'denied') { fail(microphoneMessages.denied, microphoneUnblockSteps); return; }
      if (mic !== 'granted' && mic !== 'unavailable') { fail(microphoneMessages[mic]); return; }
      if (mic === 'granted') micGranted.current = true;
    }
    listen(Constructor, request, 0);
  }
  function listen(Constructor: RecognitionConstructor, request: number, langIndex: number) {
    const lang = RECOGNITION_LANGS[langIndex] ?? RECOGNITION_LANGS[0];
    const instance = new Constructor(); recognition.current = instance;
    instance.lang = lang; instance.continuous = false; instance.interimResults = true; instance.maxAlternatives = 1;
    setPhase('starting'); setHint(langIndex ? 'Probando el reconocimiento con otra variante de español…' : 'Encendiendo el micrófono…');
    let started = false; let settled = false; let interimText = '';
    let startTimer: number | undefined; let maxTimer: number | undefined; let graceTimer: number | undefined;
    const current = () => mounted.current && request === generation.current && recognition.current === instance;
    const detach = () => {
      settled = true; cancelTimer(startTimer); cancelTimer(maxTimer); cancelTimer(graceTimer);
      instance.onresult = null; instance.onend = null; instance.onerror = null; instance.onstart = null; instance.onaudiostart = null;
      if (recognition.current === instance) recognition.current = null;
    };
    const shutdown = () => { detach(); try { instance.abort(); } catch { /* already ended */ } };
    /** Retries with the next Spanish variant; false when none is left. */
    const nextLanguage = (reason: string) => {
      if (langIndex + 1 >= RECOGNITION_LANGS.length) return false;
      voiceDebug('language-fallback', { from: lang, to: RECOGNITION_LANGS[langIndex + 1], reason });
      listen(Constructor, request, langIndex + 1); return true;
    };
    /** Closes the turn when the engine ends (or we give up waiting) without a final phrase. */
    const finish = (reason: string) => {
      const heard = interimText.trim();
      voiceDebug('finish', { reason, lang, started, heard: Boolean(heard) });
      shutdown();
      if (heard) { ask(interimText, true); return; }
      if (!started) { if (!nextLanguage('ended-before-start')) fail(engineSilentMessage); return; }
      fail(recognitionMessages['no-speech']);
    };
    const markStarted = (event: string) => {
      voiceDebug(event, { lang });
      if (!current() || started || settled) return; started = true; cancelTimer(startTimer);
      setPhase('listening'); setHint(''); setNotice('Te escucho. Habla con calma; me detengo solo cuando haces una pausa.');
      maxTimer = later(() => {
        if (!current()) return; voiceDebug('max-listen', { lang });
        try { if (instance.stop) instance.stop(); else instance.abort(); } catch { /* already ended */ }
        graceTimer = later(() => { if (current() && !settled) finish('grace-timeout'); }, END_GRACE_MS);
      }, MAX_LISTEN_MS);
    };
    instance.onstart = () => markStarted('start');
    instance.onaudiostart = () => markStarted('audiostart');
    instance.onresult = event => {
      if (!current() || settled) return;
      if (!started) markStarted('result-before-start');
      let interim = ''; let finalText = ''; let count = 0;
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) { const item = event.results[i]; const text = item?.[0]?.transcript ?? ''; count += 1; if (item?.isFinal === false) interim += text; else finalText += text; }
      voiceDebug('result', { results: count, final: Boolean(finalText.trim()) });
      interimText = interim || finalText;
      setTranscript((finalText || interim).slice(0, 1000));
      if (finalText.trim()) { detach(); try { instance.stop?.(); } catch { /* already ended */ } ask(finalText, true); }
    };
    instance.onend = () => { voiceDebug('end', { lang }); if (current() && !settled) finish('end'); };
    instance.onerror = event => {
      voiceDebug('error', { error: event.error, lang });
      if (!current() || settled) return;
      const issue = classifyRecognitionError(event.error);
      shutdown();
      if (issue === 'language') { if (!nextLanguage('language-not-supported')) fail(recognitionMessages.language); return; }
      if (issue === 'aborted') { if (interimText.trim()) ask(interimText, true); else { setPhase('ready'); setHint(''); } return; }
      if (issue === 'blocked') { micGranted.current = false; fail(recognitionMessages.blocked, event.error === 'not-allowed' ? microphoneUnblockSteps : undefined); return; }
      if (issue === 'no-microphone') micGranted.current = false;
      fail(recognitionMessages[issue]);
    };
    try { instance.start(); voiceDebug('start-called', { lang }); }
    catch (error) {
      voiceDebug('start-threw', { lang, name: error instanceof Error ? error.name : 'unknown' });
      shutdown(); if (!nextLanguage('start-threw')) fail('No se pudo iniciar el reconocimiento de voz. Espera un segundo y toca «Reintentar», o escríbeme abajo.');
      return;
    }
    startTimer = later(() => {
      if (!current() || started || settled) return;
      voiceDebug('start-watchdog', { lang, ms: START_WATCHDOG_MS });
      shutdown(); if (!nextLanguage('no-start-event')) fail(engineSilentMessage);
    }, START_WATCHDOG_MS);
  }
  const submit = (event: FormEvent) => { event.preventDefault(); ask(input); };
  const close = () => { generation.current += 1; stopAudio(); onClose(); };
  const labels: Record<Phase, string> = { ready: 'Aquí estoy, wambra.', permission: 'Esperando tu permiso…', starting: 'Encendiendo el micrófono…', listening: 'Te escucho…', thinking: 'Buscando en tu viaje…', speaking: 'Te cuento…', error: 'Probemos de nuevo.' };
  const busyVoice = phase === 'listening' || phase === 'permission' || phase === 'starting';
  const retry = () => { void startVoice(); };
  const openPlace = (id: string) => { close(); onOpenExperience?.(id); };
  return <Dialog title="MIJIN · Tu pana de aventuras" onClose={close} wide><div className={`mijin-panel mijin-voice-first phase-${phase}`}>
    <div className="mijin-mode"><span><Sparkles size={16} />Tu guía por voz</span><span>{online ? `${catalog.length} fichas para descubrir` : <><WifiOff size={15} />{catalog.length} fichas descargadas</>}</span></div>
    <section className="mijin-stage" aria-label="Conversación de voz con MIJIN"><div className="mijin-orb-wrap"><span className="mijin-orbit orbit-one" /><span className="mijin-orbit orbit-two" /><button className="mijin-orb" aria-describedby="mijin-voice-help" onClick={() => { if (busyVoice) stopEverything(); else void startVoice(); }} aria-label={busyVoice ? 'Detener micrófono' : phase === 'speaking' ? 'Interrumpir y hablar con MIJIN' : 'Hablar con MIJIN'}><span className="mijin-orb-core" /><span className="mijin-orb-icon">{busyVoice ? <MicOff size={38} /> : phase === 'speaking' ? <Volume2 size={38} /> : <Mic size={38} />}</span><span className="mijin-wave" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map(index => <i key={index} style={{ '--bar': index } as CSSProperties} />)}</span></button></div><h3 role="status">{labels[phase]}</h3><p id="mijin-voice-help" className={phase === 'permission' ? 'mijin-permission-hint' : undefined}>{phase === 'ready' ? 'Toca el micrófono, habla y escucha la respuesta. Tocarlo es tu permiso; el navegador te lo confirmará.' : phase === 'permission' || phase === 'starting' ? hint || 'Encendiendo el micrófono…' : phase === 'listening' ? 'Tu micrófono está activo. Al terminar la frase, te respondo.' : phase === 'thinking' ? 'Consulto las fuentes disponibles. Puedes detener la consulta.' : phase === 'speaking' ? 'Pulsa el micrófono para interrumpirme y preguntar otra cosa.' : 'El micrófono está apagado. Puedes reintentar o escribirme abajo.'}</p>{phase === 'listening' && <p className="mijin-live">{transcript ? `«${transcript}»` : 'Habla ahora…'}</p>}{problem && <div className="mijin-voice-problem" role="alert"><p>{problem.message}</p>{problem.steps && <ol>{problem.steps.map(step => <li key={step}>{step}</li>)}</ol>}<div><button className="button button-secondary mijin-retry" onClick={retry}><RotateCcw size={17} />Reintentar</button><button className="mijin-control" onClick={() => { setProblem(null); setPhase('ready'); focusText(); }}><Keyboard size={17} />Mejor escribo</button></div></div>}<div className="mijin-stage-controls"><button className="mijin-control" onClick={stopEverything}><Square size={15} />Detener</button><button className="mijin-control" aria-pressed={captions} onClick={() => setCaptions(!captions)}><Captions size={17} />Subtítulos {captions ? 'activados' : 'desactivados'}</button><button className="mijin-control" aria-pressed={readAnswers} onClick={() => { const enabled = !readAnswers; readingEnabled.current = enabled; if (!enabled) voiceAnswers.current = false; setReadAnswers(enabled); if (hasSpeech) window.speechSynthesis.cancel(); if (phase === 'speaking') setPhase('ready'); }}>{readAnswers ? <Volume2 size={17} /> : <VolumeX size={17} />}Respuesta con voz</button>{phase === 'speaking' && <button className="mijin-control" onClick={stopEverything}><VolumeX size={17} />Callar</button>}{hasSpeech && <label className="mijin-control mijin-rate"><span>Velocidad</span><select value={rate} onChange={event => { const value = Number(event.target.value) as SpeechRate; rateRef.current = value; setRate(value); }}>{speechRates.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}</div>
      {voiceNotice && <p className="mijin-voice-notice" role="note">Tu voz la reconoce el navegador, que puede enviarla a su proveedor (por ejemplo Google o Apple). CHULLA VIDA no guarda audio ni esta conversación. Toca otra vez para detener.</p>}</section>
    <div className="mijin-permission">{!hasVoice && <p className="mijin-support-note">{unsupportedVoiceMessage}</p>}{!online && <p className="mijin-support-note">Sin conexión: solo consulto tus fichas descargadas{downloadedAt ? ` · ${downloadedAt}` : ''}. Voz en línea, clima actual y reservas requieren internet.</p>}</div>
    {captions && <section className="mijin-captions" aria-label="Subtítulos de la conversación" aria-live="polite"><p className="mijin-heard"><span>Tú</span>{transcript || 'Puedes decir: «Quiero conocer Cuyabeno».'}</p>{turn && <div className="mijin-caption-answer"><span>MIJIN</span><p>{turn.answer.text}</p>{hasSpeech && phase !== 'speaking' && <button className="text-button mijin-listen" onClick={() => { stopAudio(); const request = ++generation.current; speak(turn.answer.spokenSummary, request, true); }}><Volume2 size={16} />Escuchar respuesta</button>}{voiceName && <small className="mijin-voice-name">Voz del navegador: {voiceName}</small>}</div>}</section>}
    {turn?.answer.warnings.length ? <div className="mijin-warnings">{turn.answer.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div> : null}
    {turn?.answer.cards.length ? <section className="mijin-results" aria-label="Fichas de la respuesta">{turn.answer.cards.map(card => <article className="mijin-result" key={card.id}><Compass size={22} aria-hidden="true" /><div><h4>{card.title}</h4><p>{card.price} · por confirmar</p><small>{card.source.split('/').at(-1)} · {card.checkedAt}</small></div>{onOpenExperience && <button className="text-button" onClick={() => openPlace(card.id)}>Ver ficha<ArrowUpRight size={17} /></button>}</article>)}</section> : null}
    {navigation && <button className="button button-primary mijin-navigation" onClick={() => { const target = navigation; close(); window.dispatchEvent(new Event(`cv3:${target}`)); }}>{navigationLabels[navigation]}<ArrowUpRight size={17} /></button>}
    {weatherQuery && !weatherConsent && online && <section className="mijin-weather-permission"><CloudSun size={26} /><div><h4>¿Consultamos el clima de {weatherQuery}?</h4><p>Enviaré el nombre de la localidad a Open-Meteo. El pronóstico es modelado, con fuente y hora; no confirma accesos ni seguridad.</p><button className="button button-secondary" onClick={() => { setWeatherConsent(true); const request = ++generation.current; void findWeather(weatherQuery, turn?.question ?? `Clima de ${weatherQuery}`, request); }}>Permitir y consultar clima</button></div></section>}
    {weatherPending && <p role="status" className="mijin-weather-status"><CloudSun size={19} />Consultando fuente meteorológica…</p>}
    {weatherLocalities.length > 1 && <section className="mijin-localities"><h4>Confirma qué localidad buscas</h4><p>Di «primera», «segunda» o pulsa una referencia.</p>{weatherLocalities.map((locality, index) => <button key={locality.id} onClick={() => { stopAudio(); const request = ++generation.current; void consultWeather(locality, turn?.question ?? `Clima de ${locality.placeName}`, request); }}><span>{index + 1}</span>{locality.placeName} · {locality.province}<ArrowUpRight size={16} /></button>)}</section>}
    {weather && <WeatherDisplay report={weather} online={online} />}
    <section className="mijin-suggestions" aria-label="Ideas para preguntar"><p>Una idea para empezar</p><div>{['Salgo de Quito con $20', 'Quiero conocer Cuyabeno', 'Quiero conocer Saraguro', 'Voy con mi perro', '¿Cómo funciona el pasaporte?'].map(question => <button key={question} onClick={() => ask(question)}>{question}<ArrowUpRight size={14} /></button>)}</div></section>
    <details className="mijin-accessible" open onToggle={event => setTextFallback(event.currentTarget.open)}><summary>Escríbele a MIJIN</summary>{textFallback && <><p>Pregunta lo mismo que por voz: destinos, presupuesto, clima, fiestas o cómo usar la app.</p><form className="mijin-form" onSubmit={submit}><label><span className="sr-only">Consulta accesible para MIJIN</span><input ref={textInput} value={input} onChange={event => setInput(event.target.value)} placeholder="Ej.: Tengo $40, ¿qué destinos puedo explorar?" maxLength={1000} /></label><button className="button button-primary" type="submit" aria-label="Consultar a MIJIN" disabled={!input.trim()}><Send size={17} aria-hidden="true" /><span>Consultar</span></button></form></>}</details>
    <p className="mijin-notice" role="status">{notice}</p><div className="mijin-bottom"><p>Guía de catálogo y preguntas frecuentes. No hay IA remota conectada, cupos en vivo ni reservas por voz.</p><button className="text-button" onClick={() => { stopEverything(); setTurn(null); setTranscript(''); setWeather(null); setWeatherLocalities([]); setWeatherQuery(''); setInput(''); setNotice('Conversación borrada de esta sesión.'); }}><Trash2 size={16} />Borrar conversación</button>{onOpenPrivacy && <button className="text-button" onClick={() => { close(); onOpenPrivacy(); }}>Privacidad y cookies</button>}</div>
  </div></Dialog>;
}
function WeatherDisplay({ report, online }: { report: WeatherReport; online: boolean }) {
  const queried = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: report.timezone }).format(new Date(report.fetchedAt));
  return <section className="mijin-weather-report" aria-label={`Pronóstico de ${report.place}`}><div><CloudSun size={36} /><h3>{report.place}<strong>{report.temperatureC} °C</strong></h3></div><p>Sensación {report.apparentC} °C · Viento {report.windKmh} km/h · Precipitación {report.precipitationMm} mm</p><p>{weatherAdvice(report)}</p><small>{online ? 'Última consulta' : 'Dato anterior, sin conexión'}: {queried} · {report.timezone}<br />Hora del modelo: {report.modelTime} · <a href={report.sourceUrl} target="_blank" rel="noreferrer">Open-Meteo</a></small>{report.days.length > 0 && <div className="mijin-weather-days">{report.days.map(day => <p key={day.date}><strong>{day.date}</strong><span>{day.minC}–{day.maxC} °C</span><span>Lluvia: {day.rainProbability === null ? 'sin dato' : `${day.rainProbability}%`}</span></p>)}</div>}{report.hours.length > 0 && <details><summary>Próximas horas</summary><ul>{report.hours.map(hour => <li key={hour.time}>{hour.time.split('T')[1]} · {hour.temperatureC} °C · Lluvia {hour.rainProbability === null ? 'sin dato' : `${hour.rainProbability}%`}</li>)}</ul></details>}</section>;
}
