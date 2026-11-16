// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MijinAssistant } from '../../src/features/assistant/MijinAssistant';
import { VOICE_PREF_KEY } from '../../src/features/assistant/speech';
import { readTravelPreferences } from '../../src/features/onboarding/WelcomeFlow';

vi.mock('../../src/components/chulla/Dialog', () => ({
  Dialog: ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => <section role="dialog" aria-label={title}><button onClick={onClose}>Cerrar prueba</button>{children}</section>,
}));
const voices = [
  { lang: 'es-ES', name: 'Microsoft Helena - Spanish (Spain)', localService: true },
  { lang: 'es-EC', name: 'Microsoft Andrea Online (Natural) - Spanish (Ecuador)', localService: false },
  { lang: 'es-MX', name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', localService: false },
];
const synthesis = { speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(), paused: false, speaking: false, getVoices: vi.fn(() => voices), addEventListener: vi.fn(), removeEventListener: vi.fn() };
class FakeUtterance { text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: { name: string } | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; onstart: (() => void) | null = null; constructor(text: string) { this.text = text; } }
const said = () => synthesis.speak.mock.calls.map(call => call[0] as FakeUtterance);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Habla con MIJIN, tu pana de aventuras' }));
const chip = (label: string) => fireEvent.click(within(screen.getByRole('group', { name: 'Respuestas rápidas' })).getByRole('button', { name: label }));

beforeEach(() => {
  vi.stubGlobal('SpeechRecognition', class { start() { /* no-op */ } abort() { /* no-op */ } });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance); vi.stubGlobal('speechSynthesis', synthesis);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  synthesis.speak.mockClear(); synthesis.cancel.mockClear(); window.localStorage.clear(); window.sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'userActivation'); });

describe('MIJIN en pantalla: saluda, pregunta con chips y arma el viaje', () => {
  it('saluda al abrir con la primera pregunta y chips de ciudades', () => {
    render(<MijinAssistant />); open();
    const captions = screen.getByRole('region', { name: 'Subtítulos de la conversación' });
    expect(captions).toHaveTextContent('¡Hola, wambra! Soy MIJIN, tu pana de aventuras.');
    expect(captions).toHaveTextContent('¿Desde dónde sales?');
    expect(within(screen.getByRole('group', { name: 'Respuestas rápidas' })).getAllByRole('button').map(button => button.textContent)).toEqual(['Quito', 'Guayaquil', 'Cuenca', 'Ambato']);
    // Sin gesto verificable no habla solo.
    expect(synthesis.speak).not.toHaveBeenCalled();
  });
  it('con un toque reciente y la voz activa, dice el saludo con la mejor voz natural', async () => {
    Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { isActive: true, hasBeenActive: true } });
    render(<MijinAssistant />); open();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
    const greeting = said().filter(utterance => utterance.text.trim());
    expect(greeting.map(utterance => utterance.text).join(' ')).toMatch(/Hola, wambra/);
    greeting.forEach(utterance => { expect(utterance.voice?.name).toMatch(/Andrea Online \(Natural\)/); expect(utterance.pitch).toBe(1); expect(utterance.rate).toBe(1); });
  });
  it('responde con chips paso a paso y al final ofrece «Armar mi viaje», que guarda las preferencias y abre Mi viaje', () => {
    const plan = vi.fn(); window.addEventListener('cv3:plan', plan);
    render(<MijinAssistant onOpenExperience={vi.fn()} />); open();
    chip('Cuenca'); expect(screen.getByRole('region', { name: 'Subtítulos de la conversación' })).toHaveTextContent('¿Cuánto quieres gastar en total?');
    chip('$100'); chip('Fin de semana'); chip('2'); chip('Naturaleza'); chip('No');
    const cards = within(screen.getByRole('region', { name: 'Fichas de la respuesta' })).getAllByRole('listitem').filter(item => item.classList.contains('mijin-card'));
    expect(cards).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Ver ficha' })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Armar mi viaje' }));
    expect(plan).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readTravelPreferences()).toMatchObject({ origin: 'Cuenca', budgetTotalUsd: 100, travelers: 2, interests: ['naturaleza'], pet: false });
    window.removeEventListener('cv3:plan', plan);
  });
  it('si no entiende, lo dice y ofrece opciones en vez de una ficha al azar', () => {
    render(<MijinAssistant />); open();
    const input = screen.getByLabelText('Consulta accesible para MIJIN');
    fireEvent.change(input, { target: { value: 'banana' } }); fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('region', { name: 'Subtítulos de la conversación' })).toHaveTextContent(/No te entendí/);
    expect(screen.queryByRole('region', { name: 'Fichas de la respuesta' })).not.toBeInTheDocument();
  });
  it('el detalle largo queda plegado en «Ver detalle»', () => {
    render(<MijinAssistant />); open();
    const input = screen.getByLabelText('Consulta accesible para MIJIN');
    fireEvent.change(input, { target: { value: '¿Qué fiestas hay en noviembre?' } }); fireEvent.submit(input.closest('form')!);
    const more = screen.getByText('Ver detalle').closest('details')!;
    expect(more).not.toHaveAttribute('open');
  });
});

describe('Voz de MIJIN: selector, muestra y preferencia', () => {
  it('lista las voces en español por calidad, deja escuchar una muestra y recuerda la elegida', () => {
    render(<MijinAssistant />); open();
    const select = screen.getByLabelText('Voz de MIJIN') as HTMLSelectElement;
    expect([...select.options].map(option => option.textContent)).toEqual(['Andrea · Ecuador · natural (recomendada)', 'Dalia · México · natural', 'Helena · España · robótica']);
    expect(select.value).toMatch(/Andrea/);
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar' }));
    expect(said().map(utterance => utterance.text).join(' ')).toMatch(/Hola, wambra.*38 dólares por persona/);
    synthesis.speak.mockClear();
    fireEvent.change(select, { target: { value: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)' } });
    expect(window.localStorage.getItem(VOICE_PREF_KEY)).toMatch(/Dalia/);
    expect(said().every(utterance => /Dalia/.test(utterance.voice?.name ?? ''))).toBe(true);
    cleanup(); render(<MijinAssistant />); open();
    expect((screen.getByLabelText('Voz de MIJIN') as HTMLSelectElement).value).toMatch(/Dalia/);
  });
  it('con solo voces robóticas muestra un tip breve', () => {
    synthesis.getVoices.mockImplementation(() => [voices[0]]);
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0) Chrome/130');
    render(<MijinAssistant />); open();
    expect(screen.getByText(/Microsoft Edge: trae voces naturales/)).toBeInTheDocument();
    synthesis.getVoices.mockImplementation(() => voices);
  });
});
