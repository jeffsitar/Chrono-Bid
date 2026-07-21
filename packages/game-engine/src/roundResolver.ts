import type { PlayerId } from '@chrono-bid/shared-types';

export interface RoundBid {
  playerId: PlayerId;
  amountMs: number;
  /** Server-recorded release timestamp (epoch ms). */
  releasedAtMs: number;
}

export interface RoundResolutionInput {
  bids: RoundBid[];
  /** Used only as a last-resort deterministic tiebreaker. */
  joinedAtByPlayer: Record<PlayerId, number>;
}

export interface RoundResolutionResult {
  winnerId: PlayerId | null;
  /** For debugging / server logs only — never sent to clients. */
  resolvedBy: 'amount' | 'earliest_release' | 'join_order' | 'player_id' | 'no_bids';
}

/**
 * Highest bid wins. Ties break by earliest release (ms precision), then
 * by earliest room-join time, then — in the astronomically unlikely case
 * everything else is identical — by player id, so the result is always
 * deterministic and a winner is (almost) always produced.
 */
export function resolveRoundWinner(input: RoundResolutionInput): RoundResolutionResult {
  const { bids, joinedAtByPlayer } = input;
  if (bids.length === 0) {
    return { winnerId: null, resolvedBy: 'no_bids' };
  }

  const maxAmount = Math.max(...bids.map((b) => b.amountMs));
  let candidates = bids.filter((b) => b.amountMs === maxAmount);
  if (candidates.length === 1) {
    return { winnerId: candidates[0]!.playerId, resolvedBy: 'amount' };
  }

  const earliestRelease = Math.min(...candidates.map((b) => b.releasedAtMs));
  const releaseCandidates = candidates.filter((b) => b.releasedAtMs === earliestRelease);
  if (releaseCandidates.length === 1) {
    return { winnerId: releaseCandidates[0]!.playerId, resolvedBy: 'earliest_release' };
  }

  candidates = releaseCandidates;
  const earliestJoin = Math.min(...candidates.map((b) => joinedAtByPlayer[b.playerId] ?? Infinity));
  const joinCandidates = candidates.filter(
    (b) => (joinedAtByPlayer[b.playerId] ?? Infinity) === earliestJoin,
  );
  if (joinCandidates.length === 1) {
    return { winnerId: joinCandidates[0]!.playerId, resolvedBy: 'join_order' };
  }

  const sortedById = [...joinCandidates].sort((a, b) => a.playerId.localeCompare(b.playerId));
  return { winnerId: sortedById[0]!.playerId, resolvedBy: 'player_id' };
}

/**
 * For players who had zero time remaining (or never pressed at all) when
 * the round started, their bid is automatically 0, released at the moment
 * the round began — per spec, they stay in the game but can't compete.
 */
export function zeroBid(playerId: PlayerId, roundStartedAtMs: number): RoundBid {
  return { playerId, amountMs: 0, releasedAtMs: roundStartedAtMs };
}
