import { randomBytes } from "node:crypto";

const SHARE_SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const SHARE_SLUG_LENGTH = 10;

export function createShareSlug(): string {
  const bytes = randomBytes(SHARE_SLUG_LENGTH);
  let slug = "";
  for (let i = 0; i < SHARE_SLUG_LENGTH; i += 1) {
    slug += SHARE_SLUG_ALPHABET[bytes[i] % SHARE_SLUG_ALPHABET.length];
  }
  return slug;
}

export function isValidShareSlug(slug: string): boolean {
  return /^[a-z2-9]{10}$/.test(slug);
}
