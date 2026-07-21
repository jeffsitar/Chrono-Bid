import { describe, it, expect } from 'vitest';
import { resolveRoundWinner, zeroBid, type RoundBid } from '../src/roundResolver';

describe('resolveRoundWinner', () => {
  it('the highest bid simply wins', () => {
    const bids: RoundBid[] = [
      { playerId: 'a', amountMs: 5000, releasedAtMs: 1000 },
      { playerId: 'b', amountMs: 9000, releasedAtMs: 2000 },
      { playerId: 'c', amountMs: 3000, releasedAtMs: 1500 },
    ];
    const result = resolveRoundWinner({ bids, joinedAtByPlayer: {} });
    expect(result.winnerId).toBe('b');
    expect(result.resolvedBy).toBe('amount');
  });

  it('ties break by earliest release, ms precision', () => {
    const bids: RoundBid[] = [
      { playerId: 'a', amountMs: 9000, releasedAtMs: 5_000_010 },
      { playerId: 'b', amountMs: 9000, releasedAtMs: 5_000_004 },
    ];
    const result = resolveRoundWinner({ bids, joinedAtByPlayer: {} });
    expect(result.winnerId).toBe('b');
    expect(result.resolvedBy).toBe('earliest_release');
  });

  it('falls back to join order if amount and release both tie exactly', () => {
    const bids: RoundBid[] = [
      { playerId: 'a', amountMs: 9000, releasedAtMs: 5_000_000 },
      { playerId: 'b', amountMs: 9000, releasedAtMs: 5_000_000 },
    ];
    const result = resolveRoundWinner({
      bids,
      joinedAtByPlayer: { a: 200, b: 100 },
    });
    expect(result.winnerId).toBe('b');
    expect(result.resolvedBy).toBe('join_order');
  });

  it('players with no time left auto-bid zero and can still lose gracefully', () => {
    const roundStart = 10_000;
    const bids: RoundBid[] = [
      zeroBid('broke-player', roundStart),
      { playerId: 'rich-player', amountMs: 1, releasedAtMs: roundStart + 50 },
    ];
    const result = resolveRoundWinner({ bids, joinedAtByPlayer: {} });
    expect(result.winnerId).toBe('rich-player');
  });

  it('returns null only when there are no bids at all', () => {
    const result = resolveRoundWinner({ bids: [], joinedAtByPlayer: {} });
    expect(result.winnerId).toBeNull();
    expect(result.resolvedBy).toBe('no_bids');
  });
});
