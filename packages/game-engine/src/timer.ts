/**
 * All bid math lives here as pure functions of explicit inputs (never
 * `Date.now()` inside this file) so it is trivially unit-testable and so
 * the server can be the single source of truth for every timestamp.
 */

/**
 * Given a server-recorded press and release timestamp, and how much time
 * the player had left *before* this bid, compute the actual bid amount.
 *
 * The bid can never exceed the player's remaining time — if the raw
 * held duration would overdraw the budget, the player is treated as
 * having auto-released the instant they hit zero.
 */
export function computeBidFromHold(
  pressedAtMs: number,
  releasedAtMs: number,
  remainingBeforeBidMs: number,
): number {
  const heldMs = Math.max(0, releasedAtMs - pressedAtMs);
  return clampBid(heldMs, remainingBeforeBidMs);
}

/** A bid can never be negative or exceed what the player has left. */
export function clampBid(rawBidMs: number, remainingMs: number): number {
  if (remainingMs <= 0) return 0;
  return Math.min(Math.max(0, rawBidMs), remainingMs);
}

/** Deduct a bid from a player's remaining time, floored at zero. */
export function applyBid(remainingMs: number, bidMs: number): number {
  return Math.max(0, remainingMs - bidMs);
}

/** True once a holding player's clock has run out and must be force-released. */
export function isAutoReleaseDue(remainingAtPressMs: number, heldSoFarMs: number): boolean {
  return heldSoFarMs >= remainingAtPressMs;
}

/**
 * Never expose sub-second precision to *other* players — round to the
 * nearest whole second. (The owning player still sees their own exact ms.)
 */
export function toApproxSeconds(ms: number): number {
  return Math.round(Math.max(0, ms) / 1000);
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = Math.floor(clamped % 1000);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}
