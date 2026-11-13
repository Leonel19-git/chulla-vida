import manifest from './manifest.json';

export const legalDocuments = manifest.documents;
export function commercialReadiness(approvals: { documentId: string; sha256: string; approvedBy: string; approvedAt: string }[] = []) {
  const required = ['terms', 'privacy', 'cookies', 'merchant-agreement', 'community-agreement', 'booking-policy'];
  const blockers = legalDocuments.filter(document => required.includes(document.id)).flatMap(document => {
    const reasons: string[] = [];
    if (document.pendingFieldCount > 0) reasons.push(`${document.title}: ${document.pendingFieldCount} campos pendientes`);
    if (!approvals.some(approval => approval.documentId === document.id && approval.sha256 === document.sha256
      && approval.approvedBy.trim() && Number.isFinite(Date.parse(approval.approvedAt)))) reasons.push(`${document.title}: falta aprobación de esta versión`);
    return reasons;
  });
  return { ready: blockers.length === 0, blockers };
}
