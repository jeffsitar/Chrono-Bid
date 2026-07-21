import type { GamePhase } from '@chrono-bid/shared-types';

export type GameEvent =
  | 'START_GAME'
  | 'COUNTDOWN_TICK'
  | 'COUNTDOWN_DONE'
  | 'ALL_RELEASED'
  | 'PLAYER_RELEASED'
  | 'REVEAL_DONE'
  | 'MORE_ROUNDS'
  | 'NO_MORE_ROUNDS'
  | 'RESTART';

const TRANSITIONS: Record<GamePhase, Partial<Record<GameEvent, GamePhase>>> = {
  lobby: {
    START_GAME: 'countdown',
  },
  countdown: {
    COUNTDOWN_TICK: 'countdown',
    COUNTDOWN_DONE: 'round_active',
  },
  round_active: {
    PLAYER_RELEASED: 'round_active', // stays active until everyone has released
    ALL_RELEASED: 'round_reveal',
  },
  round_waiting: {
    ALL_RELEASED: 'round_reveal',
  },
  round_reveal: {
    MORE_ROUNDS: 'countdown',
    NO_MORE_ROUNDS: 'results',
  },
  results: {
    RESTART: 'lobby',
  },
};

/**
 * Validates and applies a phase transition. Returns `null` for an
 * event that isn't valid from the current phase (the server should
 * treat that as a no-op / reject the triggering action).
 */
export function nextPhase(current: GamePhase, event: GameEvent): GamePhase | null {
  return TRANSITIONS[current]?.[event] ?? null;
}
