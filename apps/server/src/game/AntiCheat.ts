/**
 * Anti-cheat is mostly structural: `Room` never accepts a client-supplied
 * timestamp for a press/release — it always stamps `Date.now()` itself the
 * instant the socket event is received, and every hold_start/hold_release
 * is validated against the room's authoritative phase and per-player state
 * (see Room.holdStart / Room.holdRelease). This module documents and
 * centralizes the invariants so they're easy to audit and unit test
 * in one place, independent of the transport layer.
 */

export interface HoldGuardState {
  phaseAllowsHolding: boolean;
  alreadyHolding: boolean;
  alreadyReleasedThisRound: boolean;
  remainingMs: number;
}

export function canStartHold(state: HoldGuardState): true | { error: string } {
  if (!state.phaseAllowsHolding) return { error: 'No active round.' };
  if (state.alreadyReleasedThisRound) return { error: 'You already released this round.' };
  if (state.alreadyHolding) return { error: 'Already holding.' };
  if (state.remainingMs <= 0) return { error: 'No time remaining.' };
  return true;
}

export interface ReleaseGuardState {
  isHolding: boolean;
  alreadyReleasedThisRound: boolean;
}

export function canRelease(state: ReleaseGuardState): true | { error: string } {
  if (!state.isHolding) return { error: 'Not currently holding.' };
  if (state.alreadyReleasedThisRound) return { error: 'Already released.' };
  return true;
}

/**
 * A client may report its own optimistic elapsed time for UI purposes,
 * but the server must never trust it for scoring. This helper exists so
 * call sites make that discarding explicit and reviewable, rather than
 * silently threading a client value through.
 */
export function discardClientSuppliedTiming<T extends Record<string, unknown>>(
  payload: T,
): Omit<T, 'clientTimestamp' | 'clientElapsedMs'> {
  const { clientTimestamp: _t, clientElapsedMs: _e, ...rest } = payload as Record<string, unknown>;
  return rest as Omit<T, 'clientTimestamp' | 'clientElapsedMs'>;
}
