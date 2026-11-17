import { ALBUM_EXPERIENCES, ALBUM_REGION_ORDER, albumNumber, albumPage, formatAlbumNumber, mejorEstado, type CromoEstado } from '../album';
import type { RegionId } from '../catalog';
import { isBoughtWalletStatus, type DemoValidation, type ServerStampRow, type StampSource, type WalletStampInput } from './stamps';

/**
 * Casillas del Pasaporte Guambra: una por cromo del álbum (01–51), con su estado honesto.
 *
 * - `pegado` (único con brillo): SOLO una fila `verified_visit` de passport_stamps, emitida por el servidor o el anfitrión.
 * - `pegado_demo`: código de un comprobante de prueba validado en la demostración. Nunca sube a `pegado`.
 * - `comprado`: compra de prueba aprobada (o transferencia de prueba en revisión) de la billetera; `prueba: true`.
 * - `en_sobre`: guardado en el sobre o parada de Mi viaje.
 * - `visto`: ficha abierta o explorada. Abrir una ficha nunca da más que esto.
 * - `album`: el hueco, «te falta».
 * Si un cromo tiene varias fuentes, gana la más avanzada (`mejorEstado`). La numeración sale de src/domain/album.
 */
export interface SlotExperience { id: string; title: string; localizedRegion: RegionId }

export interface PassportSlot {
  /** Número de cromo (1…51), de `albumNumber`. */
  number: number;
  /** «02», «17»… */
  label: string;
  experienceId: string;
  title: string;
  region: RegionId;
  estado: CromoEstado;
  /** Todos los estados que aplican, del más al menos avanzado (sin `album`). */
  estados: CromoEstado[];
  /** Fecha (ISO) de lo que decide el estado: sello verificado, validación demo o compra. */
  fecha?: string;
  /** Pegado de demostración: rotulado DEMO, sin brillo, no cuenta para logros verificados. */
  demo?: boolean;
  /** La compra que lo aparta es de prueba, sin cobro. */
  prueba?: boolean;
  /** Transferencia de prueba enviada y todavía en revisión. */
  revision?: boolean;
}

export interface SlotSources {
  serverStamps?: readonly ServerStampRow[];
  demoValidations?: readonly DemoValidation[];
  wallet?: readonly WalletStampInput[];
  savedIds?: readonly string[];
  tripIds?: readonly string[];
  exploredIds?: readonly string[];
  /** Por defecto, los 51 cromos del álbum. */
  experiences?: readonly SlotExperience[];
}

const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const earliest = (current: string | undefined, candidate: string) => current === undefined || Date.parse(candidate) < Date.parse(current) ? candidate : current;

export function passportSlots(sources: SlotSources = {}): PassportSlot[] {
  const verified = new Map<string, string>();
  for (const row of sources.serverStamps ?? []) {
    if (row.stamp_type !== 'verified_visit' || !row.experience_id || !validDate(row.awarded_at)) continue;
    verified.set(row.experience_id, earliest(verified.get(row.experience_id), row.awarded_at));
  }
  const demo = new Map<string, string>();
  for (const validation of sources.demoValidations ?? []) {
    if (validation.mode !== 'demo' || !validation.experienceId || !validDate(validation.validatedAt)) continue;
    demo.set(validation.experienceId, earliest(demo.get(validation.experienceId), validation.validatedAt));
  }
  const bought = new Map<string, { date: string; revision: boolean }>();
  for (const record of sources.wallet ?? []) {
    if (record.kind !== 'test_purchase' || !isBoughtWalletStatus(record.status)) continue;
    const revision = record.status === 'test_transfer_review';
    const current = bought.get(record.experienceId);
    if (!current || (current.revision && !revision)) bought.set(record.experienceId, { date: record.updatedAt, revision });
  }
  const kept = new Set([...(sources.savedIds ?? []), ...(sources.tripIds ?? [])]);
  const seen = new Set(sources.exploredIds ?? []);

  return (sources.experiences ?? ALBUM_EXPERIENCES)
    .map(experience => ({ experience, number: albumNumber(experience.id) }))
    .filter((item): item is { experience: SlotExperience; number: number } => item.number !== null)
    .sort((a, b) => a.number - b.number)
    .map(({ experience, number }) => {
      const id = experience.id;
      const estados: CromoEstado[] = [];
      if (verified.has(id)) estados.push('pegado');
      if (demo.has(id)) estados.push('pegado_demo');
      if (bought.has(id)) estados.push('comprado');
      if (kept.has(id)) estados.push('en_sobre');
      if (seen.has(id)) estados.push('visto');
      const estado = mejorEstado(...estados);
      const slot: PassportSlot = { number, label: formatAlbumNumber(number), experienceId: id, title: experience.title, region: experience.localizedRegion, estado, estados };
      if (estado === 'pegado') slot.fecha = verified.get(id);
      else if (estado === 'pegado_demo') { slot.fecha = demo.get(id); slot.demo = true; }
      else if (estado === 'comprado') {
        const purchase = bought.get(id)!;
        slot.fecha = purchase.date;
        slot.prueba = true;
        if (purchase.revision) slot.revision = true;
      }
      return slot;
    });
}

// ── Totales ──────────────────────────────────────────────────────────────────
export interface SlotCounts {
  total: number;
  /** Pegados verificados (con brillo). */
  pegado: number;
  pegado_demo: number;
  comprado: number;
  en_sobre: number;
  visto: number;
  /** Huecos: lo que te falta. */
  album: number;
}
export function slotCounts(slots: readonly PassportSlot[]): SlotCounts {
  const counts: SlotCounts = { total: slots.length, pegado: 0, pegado_demo: 0, comprado: 0, en_sobre: 0, visto: 0, album: 0 };
  for (const slot of slots) counts[slot.estado] += 1;
  return counts;
}
export interface RegionSlots { region: RegionId; first: number; last: number; slots: PassportSlot[]; counts: SlotCounts }
/** Resumen por región, en el orden del álbum (Sierra, Costa, Amazonía, Galápagos). */
export function slotsByRegion(slots: readonly PassportSlot[]): RegionSlots[] {
  return ALBUM_REGION_ORDER.map(region => {
    const local = slots.filter(slot => slot.region === region);
    const page = albumPage(region);
    return { region, first: page.first, last: page.last, slots: local, counts: slotCounts(local) };
  });
}
/** Casillas de un rango de números (una página del libro). */
export function slotsInRange(slots: readonly PassportSlot[], first: number, last: number): PassportSlot[] {
  return slots.filter(slot => slot.number >= first && slot.number <= last);
}

// ── «Golpe de sello» para lo nuevo ───────────────────────────────────────────
/** Misma clave que `collectStamps` (`<id>:<fuente>`), así lo ya visto en versiones anteriores no se repite. */
const SOURCE_OF: Partial<Record<CromoEstado, StampSource>> = { pegado: 'verified_visit', pegado_demo: 'demo_validated', comprado: 'purchased', en_sobre: 'planned' };
export function slotStampKey(slot: Pick<PassportSlot, 'experienceId' | 'estado'>): string | null {
  const source = SOURCE_OF[slot.estado];
  return source ? `${slot.experienceId}:${source}` : null;
}
/** Casillas con un estado de pegar (sobre, compra, demo, pegado) que la persona todavía no vio. Ver no cuenta. */
export function freshSlotKeys(slots: readonly PassportSlot[], seen: readonly string[]): string[] {
  const known = new Set(seen);
  return slots.map(slotStampKey).filter((key): key is string => key !== null && !known.has(key));
}
