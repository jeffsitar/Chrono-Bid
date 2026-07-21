import { describe, it, expect } from 'vitest';
import { computeSeatPositions } from '@/components/game/scene/seatLayout';

describe('computeSeatPositions', () => {
  it('returns an empty array for 0 players', () => {
    expect(computeSeatPositions(0, 2)).toEqual([]);
  });

  it('returns exactly one seat per player, for every supported player count (2-7)', () => {
    for (let n = 2; n <= 7; n++) {
      expect(computeSeatPositions(n, 2).length).toBe(n);
    }
  });

  it('places all seats at the given radius from center', () => {
    const radius = 2.15;
    for (const seat of computeSeatPositions(5, radius)) {
      const dist = Math.sqrt(seat.x ** 2 + seat.z ** 2);
      expect(dist).toBeCloseTo(radius, 5);
    }
  });

  it('spaces seats evenly around the circle (no two seats overlap)', () => {
    const seats = computeSeatPositions(7, 2);
    const angles = seats.map((s) => s.angle).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i] - angles[i - 1]).toBeCloseTo((Math.PI * 2) / 7, 5);
    }
  });
});
