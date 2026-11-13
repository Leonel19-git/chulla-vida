// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MijinAssistant } from '../../src/features/assistant/MijinAssistant';
import { experiences } from '../../src/domain/catalog';
import type { WeatherReport } from '../../src/domain/weather';

vi.mock('../../src/components/chulla/Dialog', () => ({
  Dialog: ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => <section role="dialog" aria-label={title}><button onClick={onClose}>Cerrar prueba</button>{children}</section>,
}));
const weatherMocks = vi.hoisted(() => ({ search: vi.fn(), get: vi.fn() }));
vi.mock('../../src/domain/weather', async importOriginal => ({ ...await importOriginal<typeof import('../../src/domain/weather')>(), searchWeatherLocalities: weatherMocks.search, getWeather: weatherMocks.get }));
const start = vi.fn(); const abort = vi.fn(); const synthesis = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] };
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = ''; continuous = false; interimResults = false;
  onresult: ((event: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((event: unknown) => void) | null = null;
  start = start; abort = abort;
  constructor() { FakeRecognition.instances.push(this); }
}
class FakeUtterance { text: string; lang = ''; rate = 1; voice = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
function open() { fireEvent.click(screen.getByRole('button', { name: 'Habla con MIJIN, tu pana de aventuras' })); }
function begin() { fireEvent.click(screen.getByLabelText('Activar conversación de voz en esta sesión')); fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); }
function phrase(text: string, final = true) { act(() => { FakeRecognition.instances.at(-1)?.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: final })] }); }); }
async function typeFallback(text: string) {
  const input = await screen.findByLabelText('Consulta accesible para MIJIN'); fireEvent.change(input, { target: { value: text } }); fireEvent.submit(input.closest('form')!);
}
beforeEach(() => {
  vi.stubGlobal('SpeechRecognition', FakeRecognition); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance); vi.stubGlobal('speechSynthesis', synthesis);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  FakeRecognition.instances = []; start.mockClear(); abort.mockClear(); synthesis.speak.mockClear(); synthesis.cancel.mockClear(); weatherMocks.get.mockReset(); weatherMocks.search.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('MIJIN se usa hablando, con permiso y subtítulos', () => {
  it('abrir no inicia voz ni red y el campo de texto está disponible desde el inicio', () => {
    const network = vi.fn(); vi.stubGlobal('fetch', network); render(<MijinAssistant />); open();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(screen.getByLabelText('Consulta accesible para MIJIN')).toBeInTheDocument();
    expect(start).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled(); expect(synthesis.speak).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Hablar con MIJIN' })).toBeDisabled();
    begin(); expect(start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Detener micrófono' })); expect(abort).toHaveBeenCalled();
  });
  it('una frase final recibe respuesta hablada automática sin Enviar; un resultado parcial no consulta', () => {
    render(<MijinAssistant />); open(); begin(); phrase('Quiero conocer Sara', false); expect(synthesis.speak).not.toHaveBeenCalled();
    phrase('Quiero conocer Saraguro');
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(synthesis.speak.mock.calls[0][0].text).toMatch(/saraguro/i);
    expect(synthesis.speak.mock.calls[0][0].text).toContain('$45');
    expect(screen.getByRole('button', { name: 'Interrumpir y hablar con MIJIN' })).toBeInTheDocument();
    expect(screen.getByText(/01_catalogo_14_destinos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
  });
  it('puede interrumpir la lectura y cierra el micrófono y la voz al salir', () => {
    render(<MijinAssistant />); open(); begin(); phrase('Quiero conocer Saraguro');
    fireEvent.click(screen.getByRole('button', { name: 'Interrumpir y hablar con MIJIN' })); expect(start).toHaveBeenCalledTimes(2);
    const current = FakeRecognition.instances.at(-1)!; fireEvent.click(screen.getByRole('button', { name: 'Cerrar prueba' }));
    expect(current.onresult).toBeNull(); expect(current.onend).toBeNull(); expect(abort).toHaveBeenCalled(); expect(synthesis.cancel).toHaveBeenCalled();
  });
  it('el acceso desde una ficha abre el panel y permite ir a un resultado canónico', () => {
    const onOpenExperience = vi.fn(); render(<MijinAssistant onOpenExperience={onOpenExperience} />); fireEvent(window, new Event('cv3:mijin'));
    fireEvent.click(screen.getByRole('button', { name: 'Quiero conocer Saraguro' })); fireEvent.click(screen.getAllByRole('button', { name: 'Ver ficha' })[0]);
    expect(onOpenExperience).toHaveBeenCalledWith(expect.stringContaining('saraguro')); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('offline limita las respuestas a las instantáneas descargadas y no activa el micrófono', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); render(<MijinAssistant downloadedExperiences={[]} />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Quiero conocer Saraguro' }));
    expect(screen.getByText(/Sin conexión: no hay fichas descargadas/)).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Ver ficha' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hablar con MIJIN' })).toBeDisabled();
  });
  it('una orden de voz puede abrir una pantalla sin modificar reservas ni pedir texto', () => {
    const navigate = vi.fn(); window.addEventListener('cv3:plan', navigate); render(<MijinAssistant />); open(); begin(); phrase('Abre mi viaje');
    expect(navigate).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); window.removeEventListener('cv3:plan', navigate);
  });
  it('preguntar el clima solicita permiso separado y después consulta y habla con fuente/hora', async () => {
    const report: WeatherReport = { place: 'Baños', temperatureC: 21, apparentC: 20, windKmh: 5, precipitationMm: 0, modelTime: '2026-11-13T12:00', fetchedAt: '2026-11-13T17:15:00Z', timezone: 'America/Guayaquil', source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', kind: 'modelled_forecast', days: [], hours: [] };
    weatherMocks.search.mockResolvedValue([{ id: 1, placeName: 'Baños', province: 'Tungurahua', lat: -1.4, lon: -78.4, precision: 'locality_approx' }]); weatherMocks.get.mockResolvedValue(report);
    render(<MijinAssistant />); open(); begin(); phrase('Qué clima hace en Baños');
    expect(weatherMocks.search).not.toHaveBeenCalled(); expect(weatherMocks.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir y consultar clima' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pronóstico de Baños' })).toBeInTheDocument());
    expect(weatherMocks.search).toHaveBeenCalledWith('Baños', { online: true }); expect(weatherMocks.get).toHaveBeenCalledTimes(1);
    expect(synthesis.speak.mock.calls.at(-1)?.[0].text).toContain('Fuente Open-Meteo'); expect(screen.getByText(/Hora del modelo/)).toBeInTheDocument();
  });
  it('también consulta exclusivamente una ficha descargada cuando hay una disponible', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const saraguro = experiences.find(item => item.id.includes('saraguro'))!; render(<MijinAssistant downloadedExperiences={[saraguro]} downloadedAt="2026-11-13" />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Quiero conocer Saraguro' })); expect(screen.getByText(/Solo uso fichas descargadas/)).toBeInTheDocument();
  });
  it('sin reconocimiento permite abrir la alternativa accesible y consultar sin permisos de audio', async () => {
    vi.stubGlobal('SpeechRecognition', undefined); render(<MijinAssistant />); open();
    expect(screen.getByRole('button', { name: 'Hablar con MIJIN' })).toBeDisabled();
    await typeFallback('Quiero conocer Saraguro');
    await waitFor(() => expect(screen.getByText(/Saraguro Ancestral:/i)).toBeInTheDocument());
    expect(start).not.toHaveBeenCalled(); expect(synthesis.speak).not.toHaveBeenCalled();
  });
  it('detener una consulta descarta la respuesta tardía del proveedor', async () => {
    let resolveSearch: (value: unknown[]) => void = () => undefined;
    weatherMocks.search.mockImplementation(() => new Promise(resolve => { resolveSearch = resolve; }));
    render(<MijinAssistant />); open(); begin(); phrase('Clima de Quito');
    fireEvent.click(screen.getByRole('button', { name: 'Permitir y consultar clima' }));
    fireEvent.click(screen.getByRole('button', { name: 'Detener' }));
    await act(async () => resolveSearch([{ id: 1, placeName: 'Quito', province: 'Pichincha', lat: -0.2, lon: -78.5, precision: 'locality_approx' }]));
    expect(weatherMocks.get).not.toHaveBeenCalled(); expect(screen.queryByRole('region', { name: /Pronóstico de/ })).not.toBeInTheDocument();
  });
  it('silenciar durante una consulta pendiente conserva la respuesta en subtítulos sin volver a hablar', async () => {
    let resolveWeather!: (value: WeatherReport) => void;
    weatherMocks.search.mockResolvedValue([{ id: 1, placeName: 'Quito', province: 'Pichincha', lat: -0.2, lon: -78.5, precision: 'locality_approx' }]);
    weatherMocks.get.mockImplementation(() => new Promise(resolve => { resolveWeather = resolve; }));
    render(<MijinAssistant />); open(); begin(); phrase('Clima de Quito');
    fireEvent.click(screen.getByRole('button', { name: 'Permitir y consultar clima' }));
    await waitFor(() => expect(weatherMocks.get).toHaveBeenCalledTimes(1));
    synthesis.speak.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Respuesta con voz' }));
    expect(screen.getByRole('button', { name: 'Respuesta con voz' })).toHaveAttribute('aria-pressed', 'false');
    await act(async () => resolveWeather({ place: 'Quito', temperatureC: 18, apparentC: 18, windKmh: 4, precipitationMm: 0, modelTime: '2026-11-13T12:00', fetchedAt: '2026-11-13T17:15:00Z', timezone: 'America/Guayaquil', source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', kind: 'modelled_forecast', days: [], hours: [] }));
    expect(screen.getByRole('region', { name: 'Pronóstico de Quito' })).toBeInTheDocument();
    expect(synthesis.speak).not.toHaveBeenCalled();
  });
  it('silenciar durante la escucha usa la preferencia actual y permite hablar otra vez al reactivarla', () => {
    render(<MijinAssistant />); open(); begin();
    fireEvent.click(screen.getByRole('button', { name: 'Respuesta con voz' }));
    phrase('Quiero conocer Saraguro');
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(screen.getByText(/Saraguro Ancestral:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Respuesta con voz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' }));
    phrase('Quiero conocer Saraguro');
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
  });
  it.each(['Detener', 'Cerrar prueba'])('%s impide que un pronóstico pendiente reproduzca audio después', async action => {
    let resolveWeather!: (value: WeatherReport) => void;
    weatherMocks.search.mockResolvedValue([{ id: 1, placeName: 'Quito', province: 'Pichincha', lat: -0.2, lon: -78.5, precision: 'locality_approx' }]);
    weatherMocks.get.mockImplementation(() => new Promise(resolve => { resolveWeather = resolve; }));
    render(<MijinAssistant />); open(); begin(); phrase('Clima de Quito');
    fireEvent.click(screen.getByRole('button', { name: 'Permitir y consultar clima' }));
    await waitFor(() => expect(weatherMocks.get).toHaveBeenCalledTimes(1));
    synthesis.speak.mockClear();
    fireEvent.click(screen.getByRole('button', { name: action, exact: true }));
    await act(async () => resolveWeather({ place: 'Quito', temperatureC: 18, apparentC: 18, windKmh: 4, precipitationMm: 0, modelTime: '2026-11-13T12:00', fetchedAt: '2026-11-13T17:15:00Z', timezone: 'America/Guayaquil', source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', kind: 'modelled_forecast', days: [], hours: [] }));
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Pronóstico de Quito' })).not.toBeInTheDocument();
  });
});
