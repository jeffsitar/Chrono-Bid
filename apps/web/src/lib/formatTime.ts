export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatClockMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = Math.floor(clamped % 1000);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}
