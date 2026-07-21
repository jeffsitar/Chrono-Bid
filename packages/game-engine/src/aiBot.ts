/**
 * AI bot "brain". Pure function of its inputs so it's fully unit-testable —
 * randomness is injected via `rng` (defaults to Math.random in production
 * call sites, but tests pass a seeded/fixed function).
 *
 * The bot only ever sees what a real player would see: its own exact
 * remaining time, and *approximate* (second-rounded) remaining time for
 * opponents. It never sees opponents' live bids or intentions — "estimate,
 * never perfect" per spec.
 */

export interface BotPersonality {
  /** 0 = very conservative, 1 = very aggressive. */
  aggression: number;
  /** 0 = very predictable, 1 = highly erratic. */
  volatility: number;
}

export interface BotDecisionInput {
  remainingMs: number;
  /** Rounds left including the current one. */
  roundsRemainingIncludingCurrent: number;
  /** Rounded-to-the-second remaining time for each opponent still playing. */
  approxOpponentRemainingSeconds: number[];
  personality: BotPersonality;
  rng: () => number; // returns [0,1)
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function decideBotBidMs(input: BotDecisionInput): number {
  const { remainingMs, roundsRemainingIncludingCurrent, approxOpponentRemainingSeconds, personality, rng } =
    input;

  if (remainingMs <= 0) return 0;

  const roundsLeft = Math.max(1, roundsRemainingIncludingCurrent);
  const evenSplitMs = remainingMs / roundsLeft;

  // Base target scales with aggression: conservative bots under-bid the
  // even split (banking time for later), aggressive bots over-bid it.
  const aggressionMultiplier = 0.55 + personality.aggression * 0.9; // ~0.55x .. 1.45x
  let targetMs = evenSplitMs * aggressionMultiplier;

  // Occasionally attempt to "snipe" — just edge out the strongest visible
  // opponent — more likely for aggressive bots. The estimate is imperfect
  // because opponent time is only known to the nearest second.
  const snipeChance = 0.15 + personality.aggression * 0.35;
  if (approxOpponentRemainingSeconds.length > 0 && rng() < snipeChance) {
    const strongestOpponentMs = Math.max(...approxOpponentRemainingSeconds) * 1000;
    const overshoot = 1.03 + rng() * 0.12; // 3%-15% over the estimate
    const snipeTarget = strongestOpponentMs * overshoot;
    // Blend rather than fully commit, so bots don't always burn everything
    // chasing an estimate that may itself be wrong.
    targetMs = targetMs * 0.4 + Math.min(snipeTarget, remainingMs) * 0.6;
  }

  // Volatility jitter, symmetric around the target.
  const jitter = 1 + (rng() - 0.5) * 2 * personality.volatility * 0.5;
  targetMs *= jitter;

  // Never bid literally everything unless it's the final round or the bot
  // rolls a rare all-in — mirrors "sometimes aggressive, sometimes
  // conservative" rather than a bot that always empties its bank.
  const isFinalRound = roundsLeft === 1;
  const allIn = !isFinalRound && rng() < 0.03 * (0.5 + personality.aggression);
  if (isFinalRound || allIn) {
    targetMs = Math.max(targetMs, remainingMs * (0.6 + rng() * 0.4));
  }

  return Math.round(clamp(targetMs, 0, remainingMs));
}

/** A handful of named presets so the server can vary bot behavior. */
export const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  cautious: { aggression: 0.15, volatility: 0.2 },
  balanced: { aggression: 0.45, volatility: 0.4 },
  aggressive: { aggression: 0.8, volatility: 0.55 },
  wildcard: { aggression: 0.6, volatility: 0.9 },
};

export function pickRandomPersonality(rng: () => number): BotPersonality {
  const keys = Object.keys(BOT_PERSONALITIES);
  const key = keys[Math.floor(rng() * keys.length)] ?? 'balanced';
  return BOT_PERSONALITIES[key]!;
}
