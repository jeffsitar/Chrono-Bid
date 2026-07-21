import { describe, it, expect } from 'vitest';
import { computeFinalStandings, type FinalStandingInput } from '../src/gameResolver';

const base: Omit<FinalStandingInput, 'playerId'> = {
  nickname: 'x',
  victoryTokens: 0,
  remainingMs: 0,
  totalMsSpent: 0,
  joinedAt: 0,
};

describe('computeFinalStandings', () => {
  it('ranks by victory tokens first', () => {
    const standings = computeFinalStandings([
      { ...base, playerId: 'a', victoryTokens: 3 },
      { ...base, playerId: 'b', victoryTokens: 5 },
    ]);
    expect(standings[0]!.playerId).toBe('b');
    expect(standings[0]!.rank).toBe(1);
    expect(standings[1]!.playerId).toBe('a');
  });

  it('breaks a token tie with more remaining time', () => {
    const standings = computeFinalStandings([
      { ...base, playerId: 'a', victoryTokens: 2, remainingMs: 10_000 },
      { ...base, playerId: 'b', victoryTokens: 2, remainingMs: 40_000 },
    ]);
    expect(standings[0]!.playerId).toBe('b');
  });

  it('breaks a further tie with less total time spent', () => {
    const standings = computeFinalStandings([
      { ...base, playerId: 'a', victoryTokens: 2, remainingMs: 10_000, totalMsSpent: 90_000 },
      { ...base, playerId: 'b', victoryTokens: 2, remainingMs: 10_000, totalMsSpent: 50_000 },
    ]);
    expect(standings[0]!.playerId).toBe('b');
  });

  it('finally breaks a tie with earlier join time', () => {
    const standings = computeFinalStandings([
      { ...base, playerId: 'a', joinedAt: 500 },
      { ...base, playerId: 'b', joinedAt: 100 },
    ]);
    expect(standings[0]!.playerId).toBe('b');
  });

  it('assigns sequential ranks across the full field', () => {
    const standings = computeFinalStandings([
      { ...base, playerId: 'a', victoryTokens: 1 },
      { ...base, playerId: 'b', victoryTokens: 9 },
      { ...base, playerId: 'c', victoryTokens: 5 },
    ]);
    expect(standings.map((s) => s.playerId)).toEqual(['b', 'c', 'a']);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3]);
  });
});
