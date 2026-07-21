import { describe, it, expect } from 'vitest';
import { formatSeconds, formatClockMs } from '@/lib/formatTime';

describe('formatSeconds', () => {
  it('formats whole minutes', () => {
    expect(formatSeconds(180)).toBe('3:00');
  });
  it('pads seconds under 10', () => {
    expect(formatSeconds(65)).toBe('1:05');
  });
  it('clamps negative input to 0:00', () => {
    expect(formatSeconds(-5)).toBe('0:00');
  });
  it('rounds fractional seconds', () => {
    expect(formatSeconds(59.6)).toBe('1:00');
  });
});

describe('formatClockMs', () => {
  it('formats zero', () => {
    expect(formatClockMs(0)).toBe('00:00.000');
  });
  it('formats minutes, seconds, and millis with correct padding', () => {
    expect(formatClockMs(65_432)).toBe('01:05.432');
  });
  it('clamps negative input to zero rather than going negative', () => {
    expect(formatClockMs(-100)).toBe('00:00.000');
  });
  it('handles sub-minute durations', () => {
    expect(formatClockMs(999)).toBe('00:00.999');
  });
});
