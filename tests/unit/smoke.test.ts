import { afterEach, describe, expect, it, vi } from 'vitest';
import { isReservation, isReservationArray, readStoredValue, writeStoredValue } from '../../src/lib/storage';
import type { Reservation } from '../../src/types';

const reservation: Reservation = {
  id: 'reservation-arrived', codigo_voucher: 'CV-ARRIVED', lugar_id: 'place-saraguro',
  lugar_titulo: 'Saraguro', comunidad_nombre: 'Negocio demo', turista_nombre: 'Viajero demo',
  turista_email: 'viajero@chullavida.local', turista_telefono: '', fecha_tour: '2026-11-12',
  cantidad_personas: 1, precio_total: 45, monto_comunidad_90: 40.5, comision_plataforma_10: 4.5,
  extras_seleccionados: [], estado: 'validado_en_sitio', metodo_pago: 'tarjeta',
  qr_data: 'CV-ARRIVED', pagado_en: '',
  pago_demo: { estado: 'aprobado', referencia: 'DEMO-ARRIVAL-12345', creado_en: '2026-11-12T12:00:00.000Z' },
  validado_en: '2026-11-12T15:00:00.000Z', notificacion_whatsapp_enviada: false, telefono_notificado: '',
};

afterEach(() => vi.unstubAllGlobals());
describe('persistencia de llegadas de demostración', () => {
  it('conserva todas las reservas al recargar después de registrar una llegada', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    const pending = { ...reservation, id: 'reservation-pending', estado: 'pendiente' as const, validado_en: undefined };
    writeStoredValue('reservations', [pending, reservation]);
    expect(readStoredValue('reservations', [], isReservationArray)).toEqual([pending, reservation]);
  });
  it('no admite que un pago demo se convierta en un pago o liquidación real', () => {
    expect(isReservation(reservation)).toBe(true);
    expect(isReservation({ ...reservation, pagado_en: '2026-11-12T15:00:00.000Z' })).toBe(false);
    expect(isReservation({ ...reservation, estado: 'pagado' })).toBe(false);
    expect(isReservation({ ...reservation, estado: 'liquidado_al_local' })).toBe(false);
  });
});
