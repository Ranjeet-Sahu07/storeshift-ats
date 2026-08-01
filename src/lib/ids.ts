import { customAlphabet } from 'nanoid';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I ambiguity
const shortCode = customAlphabet(ALPHABET, 8);

/**
 * Generates a unique application link code, e.g. "FE2026A18KD9".
 * `prefix` is derived from the role (FE, BE, UI, AI, ...).
 */
export function generateLinkCode(rolePrefix: string) {
  const year = new Date().getFullYear();
  return `${rolePrefix.toUpperCase()}${year}${shortCode().slice(0, 6)}`;
}

/** Human-readable application ID, e.g. SS-APP-2026-000482 */
export function generateApplicationId(sequence: number) {
  const year = new Date().getFullYear();
  return `SS-APP-${year}-${String(sequence).padStart(6, '0')}`;
}

/** Certificate ID, e.g. SS-INT-2026-0001 */
export function generateCertificateId(sequence: number) {
  const year = new Date().getFullYear();
  return `SS-INT-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Offer letter ID, e.g. SS-OFR-2026-0001 */
export function generateOfferId(sequence: number) {
  const year = new Date().getFullYear();
  return `SS-OFR-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Letter of recommendation ID, e.g. SS-LOR-2026-0001 */
export function generateLorId(sequence: number) {
  const year = new Date().getFullYear();
  return `SS-LOR-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Official StoreShift email, e.g. rahul.int23@storeshift.in */
export function generateOfficialEmail(fullName: string, roleShortCode: string) {
  const first = fullName.trim().split(' ')[0]?.toLowerCase().replace(/[^a-z]/g, '') || 'user';
  const yy = String(new Date().getFullYear()).slice(-2);
  return `${first}.${roleShortCode.toLowerCase()}${yy}@storeshift.in`;
}
