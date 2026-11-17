import { randomBytes } from "node:crypto";

/**
 * Paste IDs are 12-character URL-safe base64url strings derived from
 * 9 cryptographically random bytes (72 bits of entropy).
 */
export const PASTE_ID_REGEX = /^[A-Za-z0-9_-]{8,32}$/;

export function generatePasteId(): string {
  return randomBytes(9).toString("base64url");
}

export function isValidPasteId(id: string): boolean {
  return typeof id === "string" && PASTE_ID_REGEX.test(id);
}
