import type { FinalStanding, PlayerId } from '@chrono-bid/shared-types';

export interface FinalStandingInput {
  playerId: PlayerId;
  nickname: string;
  victoryTokens: number;
  remainingMs: number;
  totalMsSpent: number;
  joinedAt: number;
}

/**
 * Ranking order per spec: most victory tokens wins; ties broken by more
 * remaining time, then by fewer total ms spent, then by earlier join time,
 * then (deterministic fallback) by player id.
 */
export function computeFinalStandings(players: FinalStandingInput[]): FinalStanding[] {
  const sorted = [...players].sort((a, b) => {
    if (b.victoryTokens !== a.victoryTokens) return b.victoryTokens - a.victoryTokens;
    if (b.remainingMs !== a.remainingMs) return b.remainingMs - a.remainingMs;
    if (a.totalMsSpent !== b.totalMsSpent) return a.totalMsSpent - b.totalMsSpent;
    if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
    return a.playerId.localeCompare(b.playerId);
  });

  return sorted.map((p, i) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    victoryTokens: p.victoryTokens,
    remainingMs: p.remainingMs,
    totalMsSpent: p.totalMsSpent,
    joinedAt: p.joinedAt,
    rank: i + 1,
  }));
}
