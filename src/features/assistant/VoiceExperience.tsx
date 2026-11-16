import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowUpRight, Captions, Check, CloudSun, Compass, Cpu, Download, Keyboard, Map as MapIcon, Mic, MicOff, Pencil, RotateCcw, Send, Settings2, ShieldCheck, Sparkles, Square, Trash2, Volume2, VolumeX, WifiOff, X } from 'lucide-react';
import { experiences } from '../../domain/catalog';
import type { Experience } from '../../domain/catalog/types';
import { getWeather, searchWeatherLocalities, weatherAdvice, type WeatherLocality, type WeatherReport } from '../../domain/weather';
import { Dialog } from '../../components/chulla/Dialog';
import type { AssistantAction, AssistantAnswer, AssistantCard, AssistantChip } from './knowledge';
import { converse, initialConversation, openingAnswer, type ConversationState } from './conversation';
import { saveTripPreferences } from './preferences';
import { isWeatherQuestion, microphoneMessages, microphonePermission, microphoneUnblockSteps, navigationFromVoice, openMicrophone, permissionPromptMessage, requestMicrophone, voiceDebug, voicePlaceNames, weatherLocalityFromVoice, type MicrophoneResult, type VoiceNavigation } from './voice-tools';
import { AUTO_LOCAL_FALLBACK, END_GRACE_MS, FALLBACK_TO_LOCAL, MAX_LISTEN_MS, RECOGNITION_LANGS, START_WATCHDOG_MS, SPEECH_PITCH, VOICE_SAMPLE, chunkSpeech, classifyRecognitionError, describeRecognitionCode, describeVoice, engineSilentMessage, hasGoodSpanishVoice, isAppleMobile, loadBestVoices, localVoiceMessages, markVoiceNoticeSeen, pickSpanishVoice, preferredVoiceEngine, rankSpanishVoices, readVoiceEngine, readVoiceNoticeSeen, readVoicePreference, recognitionMessages, speechRates, storeVoiceEngine, storeVoicePreference, toSpeakable, unlockSpeechSynthesis, unsupportedVoiceText, voiceTier, voiceTip, type SpeechRate, type VoiceEngine } from './speech';
import { cleanTranscript, correctPlaceNames, isLocalVoiceCached, localVoiceGaps, localVoiceMegabytes, placeVocabulary } from './voice-model';
import { getLocalTranscriber, LocalVoiceError, type PrepareProgress } from './local-asr';
import { decodeRecording, recordPhrase, type Recording } from './recorder';
import './assistant.css';
import { useT, tr } from '../../i18n/v3';
import { SpanishContentNote } from '../../i18n/v3/SpanishContentNote';
export interface MijinAssistantProps { onOpenExperience?: (id: string) => void; publicExperiences?: Experience[]; downloadedExperiences?: Experience[]; downloadedAt?: string; onOpenPrivacy?: () => void }
interface RecognitionResult { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }
interface Recognition { lang: string; continuous: boolean; interimResults: boolean; maxAlternatives?: number; onresult: ((event: RecognitionResult) => void) | null; onend: (() => void) | null; onerror: ((event: { error: string; message?: string }) => void) | null; onstart?: (() => void) | null; onaudiostart?: (() => void) | null; start(): void; stop?(): void; abort(): void }
type RecognitionConstructor = new () => Recognition;
type Phase = 'ready' | 'offer' | 'preparing' | 'permission' | 'starting' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';
/** A voice problem shown next to the microphone, with a retry button; `steps` lists how to unblock the permission. */
interface VoiceProblem { message: string; steps?: readonly string[]; code?: string; offerLocal?: boolean }
const browserRecognition = () => { const browser = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }; return browser.SpeechRecognition ?? browser.webkitSpeechRecognition; };
const navigationLabels: Record<VoiceNavigation, string> = { plan: 'Armar mi viaje', culture: 'Cultura Viva', passport: 'Mi pasaporte', downloads: 'Mis descargas', account: 'Cuenta y negocio', alerts: 'Alertas y notificaciones' };
/** The page may greet aloud only right after a tap or click (browsers block speech without one). */
const hasUserGesture = () => (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;
/** Milliseconds for diagnostics only (never rendered). */
const elapsedClock = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
/** 0,5 s at 16 kHz: the shortest recording worth transcribing. */
const MIN_PHRASE_SAMPLES = 8000;
const megabytes = (bytes: number) => (bytes / 1048576).toFixed(bytes > 10485760 ? 0 : 1);
export function MijinAssistant(props: MijinAssistantProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [greetAloud, setGreetAloud] = useState(false);
  const show = () => { unlockSpeechSynthesis(); setGreetAloud(hasUserGesture()); setOpen(true); };
  useEffect(() => { const listener = () => { setGreetAloud(hasUserGesture()); setOpen(true); }; window.addEventListener('cv3:mijin', listener); return () => window.removeEventListener('cv3:mijin', listener); }, []);
  return <><button className="mijin-launcher" onClick={show} aria-label={t("Habla con MIJIN, tu pana de aventuras")} aria-haspopup="dialog"><span className="mijin-launcher-mark" aria-hidden="true"><Mic size={21} /></span><span>{t("Habla con MIJIN")}</span></button>{open && <MijinConversation {...props} greetAloud={greetAloud} onClose={() => setOpen(false)} />}</>;
}
function MijinConversation({ onClose, onOpenExperience, publicExperiences, downloadedExperiences = [], downloadedAt, onOpenPrivacy, greetAloud = false }: MijinAssistantProps & { onClose: () => void; greetAloud?: boolean }) {
  const t = useT();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [phase, setPhase] = useState<Phase>('ready');
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [rate, setRate] = useState<SpeechRate>(1);
  const [readAnswers, setReadAnswers] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [input, setInput] = useState('');
  const [textFallback, setTextFallback] = useState(true);
  const [turn, setTurn] = useState<{ question: string; answer: AssistantAnswer; byVoice: boolean; readBack?: boolean } | null>(() => ({ question: '', answer: openingAnswer({ catalog: [], online: navigator.onLine }), byVoice: false }));
  const conversation = useRef<ConversationState>(initialConversation());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicePreference, setVoicePreference] = useState<string | null>(() => readVoicePreference());
  const voicePreferenceRef = useRef<string | null>(voicePreference);
  const [notice, setNotice] = useState('');
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherQuery, setWeatherQuery] = useState('');
  const [weatherLocalities, setWeatherLocalities] = useState<WeatherLocality[]>([]);
  const [weatherConsent, setWeatherConsent] = useState(false);
  const [weatherPending, setWeatherPending] = useState(false);
  const [navigation, setNavigation] = useState<VoiceNavigation | null>(null);
  const [engine, setEngineState] = useState<VoiceEngine>(() => preferredVoiceEngine({ hasRecognition: Boolean(browserRecognition()), stored: readVoiceEngine() }));
  const [progress, setProgress] = useState<PrepareProgress | null>(null);
  const [offerReason, setOfferReason] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const recording = useRef<Recording | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const stage = useRef<HTMLElement>(null);
  const engineRef = useRef<VoiceEngine>(engine);
  const generation = useRef(0);
  const mounted = useRef(true);
  const voiceAnswers = useRef(false);
  const readingEnabled = useRef(true);
  const rateRef = useRef<SpeechRate>(1);
  /** Already waited once for the full voice list: do not wait again on every answer. */
  const voicesSettled = useRef(false);
  const timers = useRef<number[]>([]);
  const micGranted = useRef(false);
  const utterances = useRef<SpeechSynthesisUtterance[]>([]);
  const [problem, setProblem] = useState<VoiceProblem | null>(null);
  const [hint, setHint] = useState('');
  const textInput = useRef<HTMLInputElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const catalog = online ? publicExperiences ?? experiences : downloadedExperiences;
  const hasRecognition = Boolean(browserRecognition());
  const appleMobile = isAppleMobile();
  const localSupported = localVoiceGaps().length === 0;
  const hasVoice = hasRecognition || localSupported;
  const hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const setEngine = (value: VoiceEngine) => { engineRef.current = value; setEngineState(value); };
  const setLevel = (level: number) => { stage.current?.style.setProperty('--level', level.toFixed(3)); };
  const releaseMicrophone = useCallback(() => {
    const current = stream.current; stream.current = null;
    current?.getTracks().forEach(track => { try { track.stop(); } catch { /* already stopped */ } });
  }, []);
  const stopAudio = useCallback(() => {
    timers.current.forEach(id => window.clearTimeout(id)); timers.current = [];
    const instance = recognition.current; recognition.current = null;
    if (instance) { instance.onresult = null; instance.onend = null; instance.onerror = null; instance.onstart = null; instance.onaudiostart = null; try { instance.abort(); } catch { /* already stopped */ } }
    const active = recording.current; recording.current = null; active?.cancel();
    releaseMicrophone();
    if (hasSpeech) window.speechSynthesis.cancel();
    utterances.current = [];
  }, [hasSpeech, releaseMicrophone]);
  function stopEverything() { generation.current += 1; stopAudio(); setWeatherPending(false); setProblem(null); setProgress(null); setPhase('ready'); setNotice(tr("Voz detenida. El micrófono está apagado.")); }
  const later = (callback: () => void, ms: number) => { const id = window.setTimeout(() => { timers.current = timers.current.filter(item => item !== id); callback(); }, ms); timers.current.push(id); return id; };
  const cancelTimer = (id: number | undefined) => { if (id === undefined) return; window.clearTimeout(id); timers.current = timers.current.filter(item => item !== id); };
  useEffect(() => {
    mounted.current = true;
    const update = () => { setOnline(navigator.onLine); if (!navigator.onLine && engineRef.current === 'browser') { generation.current += 1; stopAudio(); setWeatherPending(false); setPhase('ready'); } };
    const visibility = () => { if (document.visibilityState === 'hidden') { generation.current += 1; stopAudio(); setPhase('ready'); setProgress(null); setWeatherPending(false); } };
    window.addEventListener('online', update); window.addEventListener('offline', update); document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false; generation.current += 1; stopAudio();
      const context = audioContext.current; audioContext.current = null; void context?.close?.().catch(() => undefined);
      window.removeEventListener('online', update); window.removeEventListener('offline', update); document.removeEventListener('visibilitychange', visibility);
    };
  }, [stopAudio]);
  // Spanish voices for the picker; Chrome fills the list late (voiceschanged).
  useEffect(() => {
    if (!hasSpeech) return;
    const synthesis = window.speechSynthesis;
    const refresh = () => { const list = synthesis.getVoices?.() ?? []; if (mounted.current && list.length) setVoices(list); };
    refresh();
    synthesis.addEventListener?.('voiceschanged', refresh);
    return () => synthesis.removeEventListener?.('voiceschanged', refresh);
  }, [hasSpeech]);
  // MIJIN greets aloud when the panel was opened with a tap and spoken answers are on.
  useEffect(() => {
    if (!greetAloud || !hasSpeech || !readingEnabled.current) return;
    const request = generation.current;
    const timer = window.setTimeout(() => { if (turn && !turn.question) speak(turn.answer.spokenSummary, request, true); }, 0);
    return () => window.clearTimeout(timer);
    // Only once, when the panel opens.
  }, []);
  /** AudioContext for the level meter and decoding; created (and resumed) inside the tap so iOS lets it run. */
  function ensureAudioContext(): AudioContext | null {
    if (audioContext.current && audioContext.current.state !== 'closed') return audioContext.current;
    const Context = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    try { audioContext.current = new Context(); } catch { return null; }
    return audioContext.current;
  }
  /** Runs synchronously inside every voice tap: unlocks speech on iOS and wakes the audio context. */
  function primeAudio(forLocal = engineRef.current === 'local') {
    unlockSpeechSynthesis();
    if (forLocal && localSupported) { const context = ensureAudioContext(); void context?.resume?.().catch(() => undefined); }
  }
  /** Reads an answer aloud. Automatic only for questions asked by voice; `manual` comes from the «Escuchar» button. */
  function speak(text: string, request: number, manual = false) {
    if (!mounted.current || request !== generation.current) return;
    if (!hasSpeech || (!manual && (!voiceAnswers.current || !readingEnabled.current))) { setPhase('ready'); return; }
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const chunks = chunkSpeech(toSpeakable(text.slice(0, 1600)));
    if (!chunks.length) { setPhase('ready'); return; }
    const play = (voices: SpeechSynthesisVoice[], attempt = 0) => {
      if (!mounted.current || request !== generation.current) return;
      const voice = pickSpanishVoice(voices, voicePreferenceRef.current);

      voiceDebug('tts', { voice: voice?.name ?? null, lang: voice?.lang ?? null, chunks: chunks.length, rate: rateRef.current, attempt });
      let began = false;
      // Chrome drops `onend` when an utterance is garbage-collected: keep a reference until the turn ends.
      utterances.current = [];
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterances.current.push(utterance);
        utterance.lang = voice?.lang ?? 'es-US'; utterance.voice = voice; utterance.rate = rateRef.current; utterance.pitch = SPEECH_PITCH;
        utterance.onstart = () => { began = true; };
        if (index === chunks.length - 1) utterance.onend = () => { if (mounted.current && request === generation.current) { utterances.current = []; setPhase('ready'); } };
        utterance.onerror = (event?: { error?: string }) => {
          if (event?.error === 'interrupted' || event?.error === 'canceled') return;
          voiceDebug('tts-error', { error: event?.error ?? 'unknown' });
          if (mounted.current && request === generation.current) {
            synthesis.cancel(); setPhase('ready');
            setNotice(event?.error === 'not-allowed' ? tr("Tu navegador no me dejó leer en voz alta. Toca «Escuchar respuesta» para oírla.") : tr("La lectura no pudo completarse. La respuesta queda en los subtítulos."));
          }
        };
        synthesis.speak(utterance);
      });
      // Chrome can stay paused after a cancel; resuming is harmless elsewhere.
      if (synthesis.paused) synthesis.resume?.();
      // iOS sometimes swallows the first answer right after the microphone closes: try once more.
      if (appleMobile && attempt === 0) later(() => { if (mounted.current && request === generation.current && !began && !synthesis.speaking) { synthesis.cancel(); play(voices, 1); } }, 1500);
      // If the engine never reports the end, do not leave the orb stuck in «Hablando…».
      const expected = chunks.join(' ').length * 95 / rateRef.current + 4000;
      later(() => { if (mounted.current && request === generation.current && !synthesis.speaking) setPhase(current => current === 'speaking' ? 'ready' : current); }, expected);
    };
    setPhase('speaking');
    // Chrome/Edge add their good voices late: never start in a robotic voice if a better one is about to arrive.
    const voices = synthesis.getVoices?.() ?? [];
    if (hasGoodSpanishVoice(voices) || (voices.length && voicesSettled.current)) play(voices);
    else void loadBestVoices(synthesis).then(list => { voicesSettled.current = true; play(list); });
  }
  function answer(text: string, question: string, request: number, canonical?: AssistantAnswer, byVoice = false) {
    if (!mounted.current || request !== generation.current) return;
    const result: AssistantAnswer = canonical ?? { text, spokenSummary: text, cards: [], warnings: [], mode: online ? 'local_faq' as const : 'offline_downloads' as const, pricesAreEstimates: true as const, needsConfirmation: true as const };
    setTurn({ question, answer: result, byVoice, readBack: voiceAnswers.current }); speak(result.spokenSummary, request);
  }
  async function consultWeather(reference: WeatherLocality, question: string, request = generation.current) {
    setWeatherPending(true); setPhase('thinking'); setNotice(tr("Consultando el pronóstico de {placeName}…", { placeName: reference.placeName }));
    try {
      const report = await getWeather(reference, { online }); if (!mounted.current || request !== generation.current) return;
      setWeather(report); setWeatherLocalities([]); setNotice(tr("Pronóstico recibido. Revisa la fuente y la hora."));
      const time = new Intl.DateTimeFormat('es-EC', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: report.timezone }).format(new Date(report.fetchedAt));
      const advice = weatherAdvice(report);
      answer('', question, request, { text: tr("{place}: {temperatureC} °C, sensación {apparentC} °C. {advice}", { place: report.place, temperatureC: report.temperatureC, apparentC: report.apparentC, advice: advice }), spokenSummary: `En ${report.place} hay ${report.temperatureC} grados, sensación de ${report.apparentC}. ${advice} Consultado a las ${time}. Fuente Open-Meteo.`, cards: [], warnings: [], chips: [{ label: tr("¿Qué fiestas hay?"), query: '¿Qué fiestas hay este mes?' }, { label: tr("Seguir con mi viaje"), query: 'Seguir con mi viaje' }], mode: 'local_faq', pricesAreEstimates: true, needsConfirmation: true });
    } catch (error) { if (request === generation.current) answer(error instanceof Error ? error.message : 'No tengo el clima actualizado.', question, request); }
    finally { if (mounted.current && request === generation.current) setWeatherPending(false); }
  }
  async function findWeather(query: string, question: string, request = generation.current) {
    if (!online) { answer('No tengo el clima actualizado sin conexión.', question, request); return; }
    setWeatherPending(true); setPhase('thinking'); setWeather(null); setNotice(tr("Buscando {query} en Ecuador…", { query: query }));
    try {
      const options = await searchWeatherLocalities(query, { online }); if (!mounted.current || request !== generation.current) return;
      if (!options.length) { answer('No encontré esa localidad en Ecuador. Dime la ciudad o el cantón cercano.', question, request); return; }
      setWeatherLocalities(options);
      if (options.length === 1) await consultWeather(options[0], question, request);
      else answer(`Encontré ${options.length} lugares con ese nombre. ¿Cuál es? Di «primera», «segunda» o toca uno.`, question, request);
    } catch (error) { if (request === generation.current) answer(error instanceof Error ? error.message : 'No tengo el clima actualizado.', question, request); }
    finally { if (mounted.current && request === generation.current) setWeatherPending(false); }
  }
  /**
   * `fromVoice`: asked with the microphone (the answer is read aloud). `autoAct`: the transcript is trusted enough to
   * navigate or open a card by itself — only for the browser engine; on-device transcripts show a button instead,
   * so a misheard phrase never takes the person somewhere else.
   */
  function ask(question: string, fromVoice = false, autoAct = fromVoice, readBack = fromVoice) {
    const trimmed = question.trim().slice(0, 1000); if (!trimmed) return;
    stopAudio(); const request = ++generation.current; setPhase('thinking'); setProblem(null); setProgress(null); setInput(''); setTranscript(trimmed); setNotice(''); setNavigation(null); setWeather(null); setWeatherPending(false);
    // Speaking back automatically only follows a question the person asked with the microphone they tapped.
    voiceAnswers.current = readingEnabled.current && readBack;
    if (weatherLocalities.length && weatherConsent) {
      const choice = /\b(primera|segund[ao]|tercer[ao]|cuart[ao]|[1-4])\b/i.exec(trimmed)?.[1]?.toLowerCase();
      const index = choice ? ['primera', 'segunda', 'tercera', 'cuarta'].indexOf(choice.replace(/o$/, 'a')) : -1;
      const number = index >= 0 ? index : choice && /^\d$/.test(choice) ? +choice - 1 : -1;
      if (weatherLocalities[number]) { void consultWeather(weatherLocalities[number], trimmed, request); return; }
    }
    setWeatherLocalities([]);
    const target = navigationFromVoice(trimmed);
    if (target && autoAct) { close(); window.dispatchEvent(new Event(`cv3:${target}`)); return; }
    if (target) setNavigation(target);
    if (isWeatherQuestion(trimmed)) {
      const query = weatherLocalityFromVoice(trimmed, catalog); setWeatherQuery(query ?? '');
      if (!online) { answer('No tengo el clima actualizado sin internet.', trimmed, request, undefined, fromVoice); return; }
      if (!query) { answer('¿De qué lugar quieres el clima? Por ejemplo: «clima de Baños».', trimmed, request, undefined, fromVoice); return; }
      if (!weatherConsent) { answer(`¿Vemos el clima de ${query}? Toca «Permitir y consultar clima»: solo envío el nombre del lugar.`, trimmed, request, undefined, fromVoice); return; }
      void findWeather(query, trimmed, request); return;
    }
    const step = converse(conversation.current, trimmed, { catalog, online, downloadedAt });
    conversation.current = step.state;
    // «Sí» to an offer («¿Quieres ver el clima de allá?») runs the offered question.
    if (step.redirect && step.redirect !== trimmed) { ask(step.redirect, fromVoice, autoAct, readBack); return; }
    const result = step.answer; if (!result) return;
    if (autoAct && onOpenExperience && /^(?:mijin[ ,]*)?(?:abre|muestra|muestrame)\b/i.test(trimmed) && result.cards.length === 1) { openPlace(result.cards[0].id); return; }
    answer(result.text, trimmed, request, result, fromVoice);
  }
  const focusText = () => window.setTimeout(() => { if (details.current) details.current.open = true; textInput.current?.focus(); }, 0);
  const fail = (message: string, steps?: readonly string[], code?: string, offerLocal = false) => { setPhase('error'); setHint(''); setProgress(null); setLevel(0); setProblem({ message, steps, code, offerLocal }); };
  /**
   * The browser service failed. Codes in AUTO_LOCAL_FALLBACK switch to on-device recognition at once (asking first
   * only if the model still has to be downloaded); other recoverable codes offer it with a button.
   */
  function browserFailed(code: string, message: string, steps?: readonly string[]) {
    voiceDebug('browser-failed', { code, localSupported });
    if (localSupported && AUTO_LOCAL_FALLBACK.has(code)) {
      setEngine('local'); setProblem(null);
      voiceDebug('browser-message', { message });
      setOfferReason(tr("El reconocimiento de voz del navegador falló. {v}", { v: describeRecognitionCode(code) }));
      void startVoice({ engine: 'local', fallbackFrom: code });
      return;
    }
    fail(message, steps, code, localSupported && FALLBACK_TO_LOCAL.has(code));
  }
  /**
   * Tapping the microphone IS the consent gesture. Browser engine: explicit getUserMedia permission (released at once),
   * then SpeechRecognition with a start watchdog and language fallback. Local engine: download on first use (after
   * confirmation), record with a live level meter and transcribe in a worker. Never silent: every outcome shows a message.
   */
  async function startVoice(options: { engine?: VoiceEngine; download?: boolean; fallbackFrom?: string } = {}) {
    const Constructor = browserRecognition();
    let chosen: VoiceEngine = options.engine ?? engineRef.current;
    if (chosen === 'browser' && !Constructor) chosen = 'local';
    if (chosen === 'browser' && !online && localSupported) chosen = 'local';
    if (chosen === 'local' && !localSupported) {
      if (Constructor && online && !isAppleMobile()) chosen = 'browser';
      else { setPhase('ready'); setNotice(Constructor ? localVoiceMessages.unsupported : unsupportedVoiceText(hasSpeech)); focusText(); return; }
    }
    if (chosen === 'browser' && !online) { setPhase('ready'); setNotice(tr("Sin conexión, el reconocimiento de voz del navegador no funciona. Escríbeme abajo: busco en tus fichas descargadas.")); focusText(); return; }
    if (chosen !== engineRef.current) setEngine(chosen);
    if (!options.fallbackFrom) setOfferReason('');
    if (!readVoiceNoticeSeen()) { markVoiceNoticeSeen(); setVoiceNotice(true); }
    stopAudio(); const request = ++generation.current; setTranscript(''); if (!options.fallbackFrom) setNotice(''); setProblem(null);
    if (chosen === 'local') { await listenLocally(request, Boolean(options.download)); return; }
    const isCurrent = () => mounted.current && request === generation.current;
    if (!micGranted.current) {
      setPhase('permission'); setHint(tr("Encendiendo el micrófono…"));
      const prompt = permissionPromptMessage();
      // Show the «pulsa Permitir» guidance as soon as we know (or suspect) the browser is showing its prompt.
      const slow = later(() => { if (isCurrent()) setHint(prompt); }, 350);
      void microphonePermission().then(state => { voiceDebug('permission-state', { state }); if (!isCurrent()) return; if (state === 'prompt') { cancelTimer(slow); setHint(prompt); } });
      const mic = await requestMicrophone();
      cancelTimer(slow);
      voiceDebug('microphone', { result: mic });
      if (!isCurrent()) return;
      if (microphoneFailed(mic)) return;
      if (mic === 'granted') micGranted.current = true;
    }
    if (Constructor) listen(Constructor, request, 0);
  }
  /** Shows the right message for a microphone outcome; true when it is a failure. */
  function microphoneFailed(mic: MicrophoneResult): boolean {
    if (mic === 'denied') { micGranted.current = false; fail(microphoneMessages.denied, microphoneUnblockSteps); return true; }
    if (mic !== 'granted' && mic !== 'unavailable') { fail(microphoneMessages[mic]); return true; }
    return false;
  }
  async function listenLocally(request: number, confirmedDownload: boolean) {
    const isCurrent = () => mounted.current && request === generation.current;
    const cached = await isLocalVoiceCached();
    if (!isCurrent()) return;
    if (!cached && !navigator.onLine) { fail(localVoiceMessages.offline); return; }
    if (!cached && !confirmedDownload) { setPhase('offer'); setHint(''); return; }
    primeAudio(true);
    const transcriber = getLocalTranscriber();
    setProgress(null);
    setPhase(cached ? 'starting' : 'preparing'); setHint(cached ? tr("Encendiendo el micrófono…") : '');
    const prepared = transcriber.prepare(update => { if (isCurrent()) setProgress(update); });
    prepared.catch(() => undefined);
    const prepareFailed = (error: unknown) => {
      const stage = error instanceof LocalVoiceError ? error.stage : 'engine';
      voiceDebug('local-prepare-failed', { stage, message: error instanceof Error ? error.message : String(error) });
      fail(stage === 'download' || stage === 'manifest' ? localVoiceMessages.download : localVoiceMessages.engine, undefined, `local-${stage}`);
    };
    if (!cached) {
      try { await prepared; } catch (error) { if (isCurrent()) prepareFailed(error); return; }
      if (!isCurrent()) return;
      setProgress(null);
    }
    setPhase('permission'); setHint(tr("Encendiendo el micrófono…"));
    const slow = later(() => { if (isCurrent()) setHint(permissionPromptMessage()); }, 350);
    const { result, stream: opened } = await openMicrophone();
    cancelTimer(slow);
    voiceDebug('microphone', { result, engine: 'local' });
    if (!isCurrent()) { opened?.getTracks().forEach(track => track.stop()); return; }
    if (!opened) { if (!microphoneFailed(result)) fail(microphoneMessages.error); return; }
    stream.current = opened; micGranted.current = true;
    const context = ensureAudioContext();
    if (!context) { releaseMicrophone(); fail(localVoiceMessages.unsupported); return; }
    try { await context.resume(); } catch { /* the meter may stay flat, recording still works */ }
    if (!isCurrent()) return;
    let active: Recording;
    try { active = recordPhrase(opened, context, { onLevel: setLevel, appleMobile: isAppleMobile() }); }
    catch (error) { voiceDebug('recorder-failed', { message: error instanceof Error ? error.message : String(error) }); releaseMicrophone(); fail(localVoiceMessages.unsupported, undefined, 'recorder'); return; }
    recording.current = active;
    setPhase('listening'); setHint(''); setNotice(tr("Te escucho. Cuando hagas una pausa, transcribo; o toca «Listo»."));
    const outcome = await active.done;
    if (recording.current === active) recording.current = null;
    releaseMicrophone(); setLevel(0);
    voiceDebug('local-recorded', { reason: outcome.reason, heardSpeech: outcome.heardSpeech, bytes: outcome.blob?.size ?? 0, type: outcome.blob?.type ?? null });
    if (!isCurrent() || outcome.reason === 'cancelled') return;
    if (!outcome.blob || (!outcome.heardSpeech && outcome.reason !== 'manual')) { fail(localVoiceMessages.noSpeech, undefined, 'local-no-speech'); return; }
    setPhase('transcribing'); setNotice('');
    try { await prepared; } catch (error) { if (isCurrent()) prepareFailed(error); return; }
    let audio: Float32Array;
    try { audio = await decodeRecording(outcome.blob, context); }
    catch (error) { voiceDebug('decode-failed', { message: error instanceof Error ? error.message : String(error) }); if (isCurrent()) fail(localVoiceMessages.decode, undefined, 'local-decode'); return; }
    if (!isCurrent()) return;
    // «Listo» tapped right away: half a second of audio holds no phrase and Whisper would invent one.
    if (audio.length < MIN_PHRASE_SAMPLES) { fail(localVoiceMessages.noSpeech, undefined, 'local-too-short'); return; }
    const started = elapsedClock();
    const seconds = +(audio.length / 16000).toFixed(1);
    let text = '';
    try { text = correctPlaceNames(cleanTranscript(await transcriber.transcribe(audio)), placeVocabulary(catalog, voicePlaceNames())); }
    catch (error) { voiceDebug('transcribe-failed', { message: error instanceof Error ? error.message : String(error) }); if (isCurrent()) fail(localVoiceMessages.engine, undefined, 'local-transcribe'); return; }
    voiceDebug('local-transcribed', { ms: Math.round(elapsedClock() - started), seconds, chars: text.length });
    if (!isCurrent()) return;
    if (!text) { fail(localVoiceMessages.empty, undefined, 'local-empty'); return; }
    storeVoiceEngine('local');
    ask(text, true, false);
  }
  function listen(Constructor: RecognitionConstructor, request: number, langIndex: number) {
    const lang = RECOGNITION_LANGS[langIndex] ?? RECOGNITION_LANGS[0];
    const instance = new Constructor(); recognition.current = instance;
    instance.lang = lang; instance.continuous = false; instance.interimResults = true; instance.maxAlternatives = 1;
    setPhase('starting'); setHint(langIndex ? tr("Probando el reconocimiento con otra variante de español…") : tr("Encendiendo el micrófono…"));
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
      // An engine that never started will not start in another Spanish variant either: go straight to the fallback.
      if (!started) { browserFailed('engine-silent', engineSilentMessage); return; }
      browserFailed('no-result', recognitionMessages['no-speech']);
    };
    const markStarted = (event: string) => {
      voiceDebug(event, { lang });
      if (!current() || started || settled) return; started = true; cancelTimer(startTimer);
      setPhase('listening'); setHint(''); setNotice(tr("Te escucho. Habla con calma; me detengo solo cuando haces una pausa."));
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
      const code = String(event?.error ?? 'unknown');
      voiceDebug('error', { code, message: event?.message || undefined, lang });
      if (!current() || settled) return;
      const issue = classifyRecognitionError(code);
      shutdown();
      if (issue === 'language') { if (!nextLanguage('language-not-supported')) browserFailed(code, recognitionMessages.language); return; }
      if (issue === 'aborted') { if (interimText.trim()) ask(interimText, true); else { setPhase('ready'); setHint(''); setNotice(`${recognitionMessages.aborted} ${describeRecognitionCode(code)}`); } return; }
      if (issue === 'blocked') { micGranted.current = false; fail(recognitionMessages.blocked, microphoneUnblockSteps, code); return; }
      if (issue === 'no-microphone') { micGranted.current = false; fail(recognitionMessages['no-microphone'], undefined, code); return; }
      browserFailed(code, recognitionMessages[issue]);
    };
    try { instance.start(); voiceDebug('start-called', { lang }); }
    catch (error) {
      voiceDebug('start-threw', { lang, name: error instanceof Error ? error.name : 'unknown' });
      shutdown(); browserFailed('engine-silent', 'No se pudo iniciar el reconocimiento de voz. Espera un segundo y toca «Reintentar», o escríbeme abajo.');
      return;
    }
    startTimer = later(() => {
      if (!current() || started || settled) return;
      voiceDebug('start-watchdog', { lang, ms: START_WATCHDOG_MS });
      shutdown(); browserFailed('engine-silent', engineSilentMessage);
    }, START_WATCHDOG_MS);
  }
  const submit = (event: FormEvent) => { event.preventDefault(); ask(input); };
  const close = () => { generation.current += 1; stopAudio(); onClose(); };
  const labels: Record<Phase, string> = { ready: 'Aquí estoy, wambra.', offer: 'Un paso antes de hablar', preparing: 'Preparando tu voz…', permission: 'Esperando tu permiso…', starting: 'Encendiendo el micrófono…', listening: 'Escuchando…', transcribing: 'Transcribiendo…', thinking: 'Pensando…', speaking: 'Hablando…', error: 'Probemos de nuevo.' };
  const busyVoice = phase === 'listening' || phase === 'permission' || phase === 'starting' || phase === 'preparing' || phase === 'transcribing';
  const localListening = phase === 'listening' && engine === 'local';
  const showStop = phase !== 'ready' && phase !== 'error' && phase !== 'offer';
  const voiceTap = (options: { engine?: VoiceEngine; download?: boolean } = {}) => { primeAudio(options.engine ? options.engine === 'local' : undefined); void startVoice(options); };
  const orbTap = () => {
    if (localListening) { recording.current?.finish(); return; }
    if (busyVoice) { stopEverything(); return; }
    voiceTap();
  };
  const orbLabel = localListening ? 'Listo, terminé de hablar' : phase === 'preparing' || phase === 'transcribing' ? 'Cancelar y volver' : busyVoice ? 'Detener micrófono' : phase === 'speaking' ? 'Interrumpir y hablar con MIJIN' : 'Hablar con MIJIN';
  const megabytesNeeded = localVoiceMegabytes();
  const percent = progress && progress.stage === 'download' && progress.total ? Math.min(100, Math.round(progress.loaded / progress.total * 100)) : null;
  const help = phase === 'ready' ? (!hasVoice ? 'Escríbeme abajo: te respondo igual.' : 'Toca y habla. Te respondo cuando haces una pausa.')
    : phase === 'offer' ? 'Se descarga una sola vez; luego funciona sin internet.'
    : phase === 'preparing' ? (progress?.stage === 'engine' ? 'Iniciando la voz en tu dispositivo…' : localVoiceMessages.preparing(megabytesNeeded))
    : phase === 'permission' || phase === 'starting' ? hint || 'Encendiendo el micrófono…'
    : phase === 'listening' ? (engine === 'local' ? 'Habla ahora. Toca «Listo» al terminar.' : 'Habla con calma; te respondo al terminar.')
    : phase === 'transcribing' ? 'Paso tu voz a texto aquí mismo, sin enviarla.'
    : phase === 'thinking' ? 'Buscando… Puedes detenerme.'
    : phase === 'speaking' ? 'Toca para interrumpirme.'
    : 'Micrófono apagado. Reintenta o escríbeme.';
  const retry = () => voiceTap();
  const openPlace = (id: string) => { close(); onOpenExperience?.(id); };
  const correct = () => { if (!turn) return; stopAudio(); generation.current += 1; setPhase('ready'); setInput(turn.question); focusText(); };
  const spanishVoices = rankSpanishVoices(voices);
  const currentVoice = pickSpanishVoice(voices, voicePreference);
  const tip = hasSpeech && voices.length ? voiceTip(voices) : null;
  /** A quick-reply chip: answered aloud too when the conversation is going by voice. */
  const tapChip = (chip: AssistantChip) => { unlockSpeechSynthesis(); ask(chip.query, false, false, Boolean(turn?.byVoice || turn?.readBack)); };
  const runAction = (action: AssistantAction) => {
    if (action.target === 'build_trip') { saveTripPreferences(conversation.current.slots); close(); window.dispatchEvent(new Event('cv3:plan')); return; }
    if (action.target === 'privacy') { close(); onOpenPrivacy?.(); return; }
    close(); window.dispatchEvent(new Event(`cv3:${action.target}`));
  };
  const chooseVoice = (name: string) => {
    const value = name || null; voicePreferenceRef.current = value; setVoicePreference(value); storeVoicePreference(value);
    playSample();
  };
  const playSample = () => { if (!hasSpeech) return; unlockSpeechSynthesis(); stopAudio(); const request = ++generation.current; speak(VOICE_SAMPLE, request, true); };
  const resetConversation = () => {
    stopEverything(); conversation.current = initialConversation();
    setTurn({ question: '', answer: openingAnswer({ catalog, online }), byVoice: false });
    setTranscript(''); setWeather(null); setWeatherLocalities([]); setWeatherQuery(''); setInput(''); setNotice(t("Conversación borrada."));
  };
  const actions = (turn?.answer.actions ?? []).filter(action => (action.target !== 'privacy' || onOpenPrivacy) && action.target !== navigation);
  const chips = turn?.answer.chips ?? [];
  return <Dialog title={t("MIJIN · Tu pana de aventuras")} onClose={close} wide><div className={`mijin-panel mijin-voice-first phase-${phase} engine-${engine}`}>
    <div className="mijin-mode"><span><Sparkles size={16} />{t("Tu guía por voz")}</span><span>{online ? t("{length} fichas", { length: catalog.length }) : <><WifiOff size={15} />{catalog.length} descargadas</>}</span></div>
    <section ref={stage} className="mijin-stage" aria-label={t("Conversación de voz con MIJIN")}>
      <div className="mijin-orb-wrap"><span className="mijin-orbit orbit-one" /><span className="mijin-orbit orbit-two" /><button className="mijin-orb" aria-describedby="mijin-voice-help" onClick={orbTap} aria-label={orbLabel}><span className="mijin-orb-core" /><span className="mijin-orb-icon">{localListening ? <Check size={36} /> : phase === 'preparing' || phase === 'transcribing' ? <X size={32} /> : busyVoice ? <MicOff size={34} /> : phase === 'speaking' ? <Volume2 size={34} /> : <Mic size={34} />}</span><span className="mijin-wave" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map(index => <i key={index} style={{ '--bar': index } as CSSProperties} />)}</span></button></div>
      <h3 role="status">{labels[phase]}</h3>
      <p id="mijin-voice-help" className={phase === 'permission' ? 'mijin-permission-hint' : undefined}>{help}</p>
      {localListening && <div className="mijin-level" aria-hidden="true"><span /></div>}
      {phase === 'listening' && engine === 'browser' && <p className="mijin-live">{transcript ? `«${transcript}»` : t("Habla ahora…")}</p>}
      {localListening && <button className="button mijin-done" onClick={() => recording.current?.finish()}><Check size={18} />{t("Listo, ya terminé")}</button>}
      {phase === 'preparing' && <div className="mijin-progress-wrap"><div className="mijin-progress" role="progressbar" aria-label={t("Descarga de la voz para tu dispositivo")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} aria-valuetext={percent === null ? t("Iniciando") : `${percent} %`}><span style={{ width: `${percent ?? (progress?.stage === 'engine' ? 100 : 2)}%` }} /></div><small>{progress?.stage === 'download' && progress.total ? `${megabytes(progress.loaded)} de ${megabytes(progress.total)} MB` : t("Un momento…")}</small></div>}
      {offerReason && phase !== 'offer' && <p className="mijin-fallback-note" role="note">{offerReason}{' '}{t("Cambié a la voz de este dispositivo.")}</p>}
      {phase === 'offer' && <div className="mijin-voice-offer" role="group" aria-label={t("Descargar la voz para este dispositivo")}>{offerReason && <p className="mijin-offer-reason">{offerReason}</p>}<p>{localVoiceMessages.offer(megabytesNeeded)}</p><div><button className="button button-primary" onClick={() => voiceTap({ engine: 'local', download: true })}><Download size={17} />{t("Descargar y hablar")}</button><button className="mijin-control" onClick={() => { setPhase('ready'); focusText(); }}><Keyboard size={17} />{t("Mejor escribo")}</button></div></div>}
      {problem && <div className="mijin-voice-problem" role="alert"><p>{problem.message}</p>{problem.code && <p className="mijin-problem-code">{describeRecognitionCode(problem.code)}</p>}{problem.steps && <ol>{problem.steps.map(step => <li key={step}>{step}</li>)}</ol>}<div>{problem.offerLocal && <button className="button button-primary" onClick={() => voiceTap({ engine: 'local' })}><Cpu size={17} />{t("Usar voz en mi dispositivo")}</button>}<button className="button button-secondary mijin-retry" onClick={retry}><RotateCcw size={17} />{t("Reintentar")}</button><button className="mijin-control" onClick={() => { setProblem(null); setPhase('ready'); focusText(); }}><Keyboard size={17} />{t("Mejor escribo")}</button></div></div>}
      {engine === 'local' && hasVoice && <p className="mijin-local-privacy"><ShieldCheck size={16} aria-hidden="true" />{localVoiceMessages.privacy}</p>}
      <div className="mijin-stage-controls">{showStop && <button className="mijin-control mijin-stop" onClick={stopEverything}><Square size={15} />{t("Detener")}</button>}<button className="mijin-control" aria-pressed={readAnswers} onClick={() => { const enabled = !readAnswers; readingEnabled.current = enabled; if (!enabled) voiceAnswers.current = false; setReadAnswers(enabled); if (hasSpeech) window.speechSynthesis.cancel(); if (phase === 'speaking') setPhase('ready'); setNotice(enabled ? t("Leeré en voz alta lo que te responda cuando me hables.") : t("No leeré en voz alta; las respuestas quedan en los subtítulos.")); }}>{readAnswers ? <Volume2 size={17} /> : <VolumeX size={17} />}{t("Respuesta con voz")}</button></div>
      {voiceNotice && engine === 'browser' && <p className="mijin-voice-notice" role="note">{t("Tu voz la reconoce el navegador (Google o Apple). CHULLA VIDA no guarda audio.")}</p>}
      {tip && <p className="mijin-voice-tip" role="note">{tip}</p>}
    </section>
    {!online && <div className="mijin-permission"><p className="mijin-support-note">{t("Sin conexión: uso tus fichas descargadas")}{downloadedAt ? ` (${downloadedAt})` : ''}{t(". Clima y reservas necesitan internet.")}</p></div>}
    {captions && <section className="mijin-captions" aria-label={t("Subtítulos de la conversación")} aria-live="polite">{transcript && <p className="mijin-heard"><span>{t("Tú")}</span>{transcript}</p>}{turn?.byVoice && phase !== 'listening' && <button className="text-button mijin-correct" onClick={correct}><Pencil size={15} />{t("Corregir lo que entendí")}</button>}{turn && <div className="mijin-caption-answer"><span>MIJIN</span><p>{!turn.question && turn.answer.text === '¡Hola, wambra! Soy MIJIN, tu pana de aventuras. ¿Desde dónde sales?' ? t('¡Hola, wambra! Soy MIJIN, tu pana de aventuras. ¿Desde dónde sales?') : turn.answer.text}</p>{turn.question ? <SpanishContentNote text="MIJIN responde en español por ahora" /> : null}<div className="mijin-answer-tools">{hasSpeech && phase !== 'speaking' && <button className="text-button mijin-listen" onClick={() => { unlockSpeechSynthesis(); stopAudio(); const request = ++generation.current; speak(turn.answer.spokenSummary, request, true); }}><Volume2 size={16} />{t("Escuchar respuesta")}</button>}</div>{turn.answer.details && <details className="mijin-more"><summary>{t("Ver detalle")}</summary><p>{turn.answer.details}</p></details>}</div>}</section>}
    {turn?.answer.warnings.length ? <details className="mijin-warnings"><summary>{t("Avisos de la ficha (")}{turn.answer.warnings.length})</summary>{turn.answer.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</details> : null}
    {turn?.answer.cards.length ? <section className="mijin-results" aria-label={t("Fichas de la respuesta")}><ul className="mijin-cards">{turn.answer.cards.map(card => <MijinCard key={card.id} card={card} onOpen={onOpenExperience ? () => openPlace(card.id) : undefined} />)}</ul></section> : null}
    {actions.length || chips.length ? <div className="mijin-next">{actions.map(action => <button key={action.target} className={`button ${action.target === 'build_trip' ? 'button-primary' : 'button-secondary'} mijin-action`} onClick={() => runAction(action)}>{action.target === 'build_trip' && <MapIcon size={17} aria-hidden="true" />}{action.label}</button>)}{chips.length > 0 && <div className="mijin-chips" role="group" aria-label={t("Respuestas rápidas")}>{chips.map(chip => <button key={chip.query} className="mijin-chip" onClick={() => tapChip(chip)}>{chip.label}</button>)}</div>}</div> : null}
    {navigation && <button className="button button-primary mijin-navigation" onClick={() => { const target = navigation; close(); window.dispatchEvent(new Event(`cv3:${target}`)); }}>{navigationLabels[navigation]}<ArrowUpRight size={17} /></button>}
    {weatherQuery && !weatherConsent && online && <section className="mijin-weather-permission"><CloudSun size={26} /><div><h4>{t("¿Vemos el clima de")}{' '}{weatherQuery}?</h4><p>{t("Solo envío el nombre del lugar a Open-Meteo. Es un pronóstico, no confirma accesos.")}</p><button className="button button-secondary" onClick={() => { setWeatherConsent(true); const request = ++generation.current; void findWeather(weatherQuery, turn?.question ?? `Clima de ${weatherQuery}`, request); }}>{t("Permitir y consultar clima")}</button></div></section>}
    {weatherPending && <p role="status" className="mijin-weather-status"><CloudSun size={19} />{t("Consultando el clima…")}</p>}
    {weatherLocalities.length > 1 && <section className="mijin-localities"><h4>{t("¿Cuál de estos lugares?")}</h4>{weatherLocalities.map((locality, index) => <button key={locality.id} onClick={() => { stopAudio(); const request = ++generation.current; void consultWeather(locality, turn?.question ?? `Clima de ${locality.placeName}`, request); }}><span>{index + 1}</span>{locality.placeName} · {locality.province}<ArrowUpRight size={16} /></button>)}</section>}
    {weather && <WeatherDisplay report={weather} online={online} />}
    <details ref={details} className="mijin-accessible" open onToggle={event => setTextFallback(event.currentTarget.open)}><summary>{t("Escríbele a MIJIN")}</summary>{textFallback && <form className="mijin-form" onSubmit={submit}><label><span className="sr-only">{t("Consulta accesible para MIJIN")}</span><input ref={textInput} value={input} onChange={event => setInput(event.target.value)} placeholder={t("Ej.: algo barato cerca de Quito")} maxLength={1000} enterKeyHint="send" /></label><button className="button button-primary" type="submit" aria-label={t("Consultar a MIJIN")} disabled={!input.trim()}><Send size={17} aria-hidden="true" /><span>{t("Enviar")}</span></button></form>}</details>
    <details className="mijin-settings"><summary><Settings2 size={17} aria-hidden="true" /><span>{t("Voz de MIJIN")}</span>{currentVoice && <small>{describeVoice(currentVoice)}</small>}</summary>
      <div className="mijin-settings-body">
        {hasSpeech && spanishVoices.length > 0 && <div className="mijin-voice-pick"><label><span>{t("Voz de MIJIN")}</span><select value={currentVoice?.name ?? ''} onChange={event => chooseVoice(event.target.value)}>{spanishVoices.map(voice => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{describeVoice(voice)}{voiceTier(voice.name) <= 2 && voice === spanishVoices[0] ? t(" (recomendada)") : ''}</option>)}</select></label><button className="button button-secondary" onClick={playSample}><Volume2 size={16} />{t("Escuchar")}</button></div>}
        {hasSpeech && !spanishVoices.length && <p className="mijin-support-note">{t("Este navegador no trae voces en español: te respondo en texto.")}</p>}
        <div className="mijin-settings-row">{hasSpeech && <label className="mijin-setting"><span>{t("Velocidad")}</span><select value={rate} onChange={event => { const value = Number(event.target.value) as SpeechRate; rateRef.current = value; setRate(value); }}>{speechRates.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}<button className="mijin-setting" aria-pressed={captions} onClick={() => setCaptions(!captions)}><Captions size={17} />{t("Subtítulos")}{' '}{captions ? 'activados' : 'desactivados'}</button></div>
        {hasRecognition && localSupported && !appleMobile && (phase === 'ready' || phase === 'error') && <button className="text-button mijin-engine-switch" onClick={() => { const next = engine === 'local' ? 'browser' : 'local'; setEngine(next); storeVoiceEngine(next); setProblem(null); setPhase('ready'); setNotice(next === 'local' ? t("Usaré la voz en tu dispositivo: tu audio no sale de aquí.") : t("Usaré el reconocimiento de voz del navegador.")); }}>{engine === 'local' ? t("Usar el reconocimiento del navegador") : t("Procesar mi voz en este dispositivo")}</button>}
      </div>
    </details>
    <p className="mijin-notice" role="status">{notice}</p><div className="mijin-bottom"><p>{t("Respuestas del catálogo, sin IA remota. Precios referenciales.")}</p><button className="text-button" onClick={resetConversation}><Trash2 size={16} />{t("Borrar conversación")}</button>{onOpenPrivacy && <button className="text-button" onClick={() => { close(); onOpenPrivacy(); }}>{t("Privacidad y cookies")}</button>}</div>
  </div></Dialog>;
}
/** One idea: photo, place and time, reference price and why it fits. */
function MijinCard({ card, onOpen }: { card: AssistantCard; onOpen?: () => void }) {
  const t = useT();
  return <li className={`mijin-card${card.fits === false ? ' is-stretch' : ''}`}>
    <div className="mijin-card-media">{card.image ? <img src={card.image.src} alt={card.image.alt} loading="lazy" decoding="async" /> : <Compass size={30} aria-hidden="true" />}{card.image?.credit && <small className="mijin-card-credit">{card.image.credit}</small>}</div>
    <div className="mijin-card-body">
      <h4>{card.title}</h4>
      {card.place && <p className="mijin-card-place">{card.place}{card.duration ? ` · ${card.duration}` : ''}</p>}
      <p className="mijin-card-price"><strong>{card.priceShort ?? card.price}</strong><span>referencial</span></p>
      {card.reasons?.length ? <ul className="mijin-reasons">{card.reasons.map(reason => <li key={reason} className={/^(Se pasa|Necesita|Precio en euros|Vuelos)/.test(reason) ? 'is-warn' : undefined}>{reason}</li>)}</ul> : null}
      {onOpen && <button className="text-button mijin-card-open" onClick={onOpen}>{t("Ver ficha")}<ArrowUpRight size={16} aria-hidden="true" /></button>}
    </div>
  </li>;
}
function WeatherDisplay({ report, online }: { report: WeatherReport; online: boolean }) {
  const t = useT();
  const queried = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: report.timezone }).format(new Date(report.fetchedAt));
  return <section className="mijin-weather-report" aria-label={t("Pronóstico de {place}", { place: report.place })}><div><CloudSun size={36} /><h3>{report.place}<strong>{report.temperatureC} °C</strong></h3></div><p>{t("Sensación")}{' '}{report.apparentC}{' '}{t("°C · Viento")}{' '}{report.windKmh}{' '}{t("km/h · Precipitación")}{' '}{report.precipitationMm} mm</p><p>{weatherAdvice(report)}</p><small>{online ? t("Última consulta") : t("Dato anterior, sin conexión")}: {queried} · {report.timezone}<br />{t("Hora del modelo:")}{' '}{report.modelTime} · <a href={report.sourceUrl} target="_blank" rel="noreferrer">{t("Open-Meteo")}</a></small>{report.days.length > 0 && <div className="mijin-weather-days">{report.days.map(day => <p key={day.date}><strong>{day.date}</strong><span>{day.minC}–{day.maxC} °C</span><span>{t("Lluvia:")}{' '}{day.rainProbability === null ? 'sin dato' : `${day.rainProbability}%`}</span></p>)}</div>}{report.hours.length > 0 && <details><summary>{t("Próximas horas")}</summary><ul>{report.hours.map(hour => <li key={hour.time}>{hour.time.split('T')[1]} · {hour.temperatureC}{' '}{t("°C · Lluvia")}{' '}{hour.rainProbability === null ? 'sin dato' : `${hour.rainProbability}%`}</li>)}</ul></details>}</section>;
}
