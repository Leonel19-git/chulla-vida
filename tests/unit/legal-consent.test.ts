import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commercialReadiness, legalDocuments } from '../../src/domain/legal';
import {
  CONSENT_POLICY_VERSION, isConsent, levelCategories, levelFor, makeConsent, restoreConsent,
} from '../../src/domain/consent';

describe('contenido legal y consentimiento', () => {
  it('mantiene nueve borradores y bloquea el lanzamiento comercial sin aprobación', () => {
    expect(legalDocuments).toHaveLength(9);
    expect(commercialReadiness().ready).toBe(false);
    expect(commercialReadiness().blockers.length).toBeGreaterThan(0);
    expect(legalDocuments.every(document => document.status === 'draft_pending_legal_review')).toBe(true);
  });
  it('aceptar medios no acepta marketing ni analítica ni otras categorías', () => {
    expect(makeConsent({ media: true })).toMatchObject({ essential: true, media: true, analytics: false, marketing: false, personalization: false });
    expect(makeConsent({ media: false, marketing: false }).media).toBe(false);
    expect(isConsent({ ...makeConsent({}), version: 0 })).toBe(false);
    expect(isConsent({ ...makeConsent({}), updatedAt: 'ayer' })).toBe(false);
    expect(isConsent(makeConsent({}))).toBe(true);
  });
});

describe('niveles de privacidad', () => {
  it('Privado solo deja lo necesario y bloquea el contenido externo', () => {
    expect(levelCategories('private')).toEqual({ media: false, personalization: false, analytics: false, marketing: false });
    const consent = makeConsent(levelCategories('private'));
    expect(consent).toMatchObject({ level: 'private', essential: true, media: false });
  });
  it('Equilibrado permite contenido externo, sin analítica ni marketing', () => {
    expect(makeConsent(levelCategories('balanced'))).toMatchObject({ level: 'balanced', media: true, personalization: false, analytics: false, marketing: false });
  });
  it('Personalizado parte de cero y aplica solo lo elegido', () => {
    expect(levelCategories('custom')).toEqual({ media: false, personalization: false, analytics: false, marketing: false });
    expect(makeConsent(levelCategories('custom', { personalization: true }))).toMatchObject({ level: 'custom', personalization: true, media: false });
    // Una combinación idéntica a un preajuste se rotula con su nombre.
    expect(levelFor(levelCategories('custom', { media: true }))).toBe('balanced');
  });
  it('analítica y marketing no se pueden activar mientras no estén conectadas', () => {
    expect(makeConsent({ analytics: true, marketing: true, media: true })).toMatchObject({ analytics: false, marketing: false, level: 'balanced' });
  });
  it('guarda versión de política, método y fecha', () => {
    const consent = makeConsent({}, new Date('2026-11-13T12:00:00Z'), 'banner');
    expect(consent).toMatchObject({ version: 2, policyVersion: CONSENT_POLICY_VERSION, method: 'banner', updatedAt: '2026-11-13T12:00:00.000Z' });
  });
  it('migra la preferencia de 3.0 y descarta las de otra versión de política', () => {
    const migrated = restoreConsent(null, { version: 1, essential: true, media: true, analytics: false, marketing: false, updatedAt: '2026-11-01T00:00:00.000Z' });
    expect(migrated).toMatchObject({ level: 'balanced', media: true, method: 'migration', updatedAt: '2026-11-01T00:00:00.000Z' });
    expect(restoreConsent({ ...makeConsent({ media: true }), policyVersion: '0.1' }, null)).toBeNull();
    expect(restoreConsent('basura', 'basura')).toBeNull();
  });
});

describe('documentos PDF de protección de datos', () => {
  const pdf = (name: string) => resolve(__dirname, '../../public/legal', name);
  it.each(['aviso-proteccion-datos-chulla-vida.pdf', 'formulario-derechos-datos-chulla-vida.pdf'])('%s existe, es un PDF y no está vacío', name => {
    expect(statSync(pdf(name)).size).toBeGreaterThan(20_000);
    expect(readFileSync(pdf(name)).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
  it('el formulario es rellenable (AcroForm)', () => {
    expect(readFileSync(pdf('formulario-derechos-datos-chulla-vida.pdf')).toString('latin1')).toContain('/AcroForm');
  });
});
