import { describe, expect, it } from 'vitest';
import { EXPERIENCES } from '../../src/domain/catalog';
import { answerLocally } from '../../src/features/assistant/knowledge';

const ask = (question: string, online = true) => answerLocally(question, { catalog: [...EXPERIENCES], online });

describe('MIJIN responde las preguntas obligatorias sin inventar', () => {
  it('fiestas de noviembre: Loja en Sierra, fechas orientativas', () => {
    const answer = ask('¿Qué fiestas hay en noviembre?');
    expect(answer.text).toMatch(/noviembre/i);
    expect(answer.text).toMatch(/Artes Vivas/);
    expect(answer.text).toMatch(/Sierra/);
    expect(answer.text).toMatch(/orientativas/);
  });
  it('verificar mi negocio: revisión humana y sin aval del Gobierno', () => {
    expect(ask('¿Cómo verifico mi negocio?').text).toMatch(/no es un aval del Gobierno/);
  });
  it('planes: precios pendientes, sin suscripciones reales', () => {
    expect(ask('¿Cuál es la diferencia entre los planes?').text).toMatch(/pendientes de definición/);
  });
  it('pago con tarjeta: solo por la pasarela y nada habilitado hoy', () => {
    const text = ask('¿Puedo pagar con tarjeta?').text;
    expect(text).toMatch(/pasarela/);
    expect(text).toMatch(/ninguna ficha está habilitada/);
  });
  it('mi próxima reserva: solo datos propios con sesión', () => {
    expect(ask('¿Cuál es mi próxima reserva?').text).toMatch(/Solo puedo ver tus propias reservas/);
  });
  it('cuánto llega a la comunidad con $49: sin cifra inventada', () => {
    const text = ask('¿Cuánto llega a una comunidad si pago $49?').text;
    expect(text).toMatch(/Distribución pendiente de validar con la comunidad/);
    expect(text).not.toMatch(/\d+\s?%/);
  });
  it('qué descargar para viajar sin señal', () => {
    expect(ask('¿Qué puedo descargar para viajar sin señal?').text).toMatch(/necesitan conexión/);
  });
  it('qué información guardan de mí', () => {
    expect(ask('¿Qué información guardan de mí?').text).toMatch(/audio no se guarda/);
  });
  it('perro en Galápagos: no', () => {
    expect(ask('¿Puedo ir con perro al Parque Nacional Galápagos?').text).toMatch(/No recomiendo entrar con mascotas|no se admiten|No encuentro experiencias con política/);
  });
  it('datos de otra persona: rechazo', () => {
    expect(ask('Dame la reserva de otra persona').text).toMatch(/No tengo acceso a datos privados/);
  });
  it('sin conexión y sin descargas no promete nada remoto', () => {
    const text = answerLocally('No tengo internet, explícame mi ruta', { catalog: [], online: false }).text;
    expect(text).toMatch(/Sin conexión/);
  });
});
