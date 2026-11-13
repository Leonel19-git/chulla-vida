import { describe, expect, it } from 'vitest';
import { commercialReadiness, legalDocuments } from '../../src/domain/legal';
import { isConsent, makeConsent } from '../../src/domain/consent';

describe('contenido legal y consentimiento', () => {
  it('mantiene nueve borradores y bloquea el lanzamiento comercial sin aprobación', () => {
    expect(legalDocuments).toHaveLength(9);
    expect(commercialReadiness().ready).toBe(false);
    expect(commercialReadiness().blockers.length).toBeGreaterThan(0);
    expect(legalDocuments.every(document => document.status === 'draft_pending_legal_review')).toBe(true);
  });
  it('aceptar medios no acepta marketing ni analítica ni otras categorías', () => {
    expect(makeConsent({ media: true })).toMatchObject({ essential: true, media: true, analytics: false, marketing: false });
    expect(makeConsent({ media: false, marketing: false }).media).toBe(false);
    expect(isConsent({ ...makeConsent({}), version: 0 })).toBe(false);
    expect(isConsent({ ...makeConsent({}), updatedAt: 'ayer' })).toBe(false);
    expect(isConsent(makeConsent({}))).toBe(true);
  });
});
