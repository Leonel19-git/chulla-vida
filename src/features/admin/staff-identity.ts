/** Provider identifier only: reserved, non-deliverable domain; never a personal contact. */
export const STAFF_DOMAIN = 'staff.chulla-vida.invalid';
export function normalizeStaffUsername(value: string): string | null {
  const username=value.trim().toLowerCase();
  return /^[a-z][a-z0-9._-]{2,47}$/.test(username) ? username : null;
}
export const staffIdentifier = (username: string) => `${username}@${STAFF_DOMAIN}`;
export function validStaffPassword(value: string): boolean {
  return value.length>=14 && value.length<=128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}
