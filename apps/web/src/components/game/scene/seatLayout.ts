export interface SeatPosition {
  x: number;
  z: number;
  angle: number;
}

/** Evenly spaces seats around the table, starting at the "far" side (facing the camera) and going clockwise. */
export function computeSeatPositions(count: number, radius: number): SeatPosition[] {
  if (count <= 0) return [];
  const seats: SeatPosition[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    seats.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, angle });
  }
  return seats;
}
