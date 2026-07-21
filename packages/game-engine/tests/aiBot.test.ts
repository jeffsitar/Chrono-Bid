import { describe, it, expect } from 'vitest';
import { decideBotBidMs, BOT_PERSONALITIES, pickRandomPersonality } from '../src/aiBot';

const fixedRng = (value: number) => () => value;

describe('decideBotBidMs', () => {
  it('never bids more than it has', () => {
    for (const seed of [0, 0.1, 0.5, 0.9, 0.99]) {
      const bid = decideBotBidMs({
        remainingMs: 12_000,
        roundsRemainingIncludingCurrent: 3,
        approxOpponentRemainingSeconds: [50, 80],
        personality: BOT_PERSONALITIES.aggressive!,
        rng: fixedRng(seed),
      });
      expect(bid).toBeLessThanOrEqual(12_000);
      expect(bid).toBeGreaterThanOrEqual(0);
    }
  });

  it('bids zero when it has no time left', () => {
    const bid = decideBotBidMs({
      remainingMs: 0,
      roundsRemainingIncludingCurrent: 5,
      approxOpponentRemainingSeconds: [10],
      personality: BOT_PERSONALITIES.balanced!,
      rng: fixedRng(0.5),
    });
    expect(bid).toBe(0);
  });

  it('cautious bots bid less on average than aggressive bots given identical inputs', () => {
    const input = (personality: typeof BOT_PERSONALITIES.balanced) => ({
      remainingMs: 100_000,
      roundsRemainingIncludingCurrent: 4,
      approxOpponentRemainingSeconds: [60, 70],
      personality: personality!,
      rng: fixedRng(0.8), // fixed so we compare apples to apples, avoiding snipe/all-in branches
    });
    const cautious = decideBotBidMs(input(BOT_PERSONALITIES.cautious));
    const aggressive = decideBotBidMs(input(BOT_PERSONALITIES.aggressive));
    expect(aggressive).toBeGreaterThan(cautious);
  });

  it('is deterministic for a given rng', () => {
    const input = {
      remainingMs: 50_000,
      roundsRemainingIncludingCurrent: 6,
      approxOpponentRemainingSeconds: [30],
      personality: BOT_PERSONALITIES.wildcard!,
      rng: fixedRng(0.42),
    };
    expect(decideBotBidMs(input)).toBe(decideBotBidMs(input));
  });

  it('on the final round, commits a large share of remaining time', () => {
    const bid = decideBotBidMs({
      remainingMs: 20_000,
      roundsRemainingIncludingCurrent: 1,
      approxOpponentRemainingSeconds: [15],
      personality: BOT_PERSONALITIES.cautious!,
      rng: fixedRng(0.5),
    });
    expect(bid).toBeGreaterThan(10_000);
  });
});

describe('pickRandomPersonality', () => {
  it('always returns a known personality', () => {
    const p = pickRandomPersonality(fixedRng(0.33));
    expect(Object.values(BOT_PERSONALITIES)).toContainEqual(p);
  });
});
