import { randomBytes, randomUUID } from 'node:crypto';

// Excludes visually ambiguous characters (0/O, 1/I).
const ROOM_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomId(length = 6): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ROOM_ID_ALPHABET[bytes[i]! % ROOM_ID_ALPHABET.length];
  }
  return out;
}

export function generatePlayerId(): string {
  return randomUUID();
}

export function generatePlayerToken(): string {
  return randomBytes(24).toString('base64url');
}

export function generateMessageId(): string {
  return randomUUID();
}
