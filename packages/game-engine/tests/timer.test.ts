import { describe, it, expect } from 'vitest';
import { computeBidFromHold, clampBid, applyBid, toApproxSeconds, formatClock } from '../src/timer';

describe('clampBid', () => {
  it('never exceeds remaining time', () => {
    expect(clampBid(5000, 3000)).toBe(3000);
  });
  it('never goes negative', () => {
    expect(clampBid(-100, 3000)).toBe(0);
  });
  it('returns 0 when remaining is already 0', () => {
    expect(clampBid(4000, 0)).toBe(0);
  });
});

describe('computeBidFromHold', () => {
  it('computes held duration from press/release timestamps', () => {
    const bid = computeBidFromHold(1_000, 9_324, 300_000);
    expect(bid).toBe(8_324);
  });
  it('clamps to remaining time if held longer than available', () => {
    const bid = computeBidFromHold(0, 100_000, 40_000);
    expect(bid).toBe(40_000);
  });
  it('treats release before press as a zero bid, never negative', () => {
    const bid = computeBidFromHold(5_000, 4_000, 100_000);
    expect(bid).toBe(0);
  });
});

describe('applyBid', () => {
  it('subtracts the bid from remaining time', () => {
    expect(applyBid(300_000, 8_324)).toBe(291_676);
  });
  it('floors at zero, never goes negative', () => {
    expect(applyBid(1_000, 5_000)).toBe(0);
  });
});

describe('toApproxSeconds', () => {
  it('rounds to the nearest second, hiding sub-second precision', () => {
    expect(toApproxSeconds(135_483)).toBe(135);
    expect(toApproxSeconds(135_600)).toBe(136);
  });
});

describe('formatClock', () => {
  it('formats mm:ss.mmm', () => {
    expect(formatClock(343_124)).toBe('05:43.124');
  });
  it('never shows negative time', () => {
    expect(formatClock(-500)).toBe('00:00.000');
  });
});
