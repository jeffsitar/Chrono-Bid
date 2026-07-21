'use client';

/**
 * Tiny synthesized sound engine — no external audio assets, so nothing to
 * license or ship. All tones are generated on the fly via the Web Audio API.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem('chrono-bid-sound');
  return stored === null ? true : stored === 'on';
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('chrono-bid-sound', next ? 'on' : 'off');
  }
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainPeak = 0.14) {
  if (!enabled && !isSoundEnabled()) return;
  const audioCtx = getContext();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(gainPeak, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.02);
}

export const sound = {
  countdownTick: () => tone(440, 120, 'square'),
  countdownGo: () => tone(880, 220, 'square', 0.18),
  release: () => tone(300, 90, 'triangle', 0.1),
  roundWinner: () => {
    tone(660, 140, 'sine');
    setTimeout(() => tone(880, 220, 'sine'), 110);
  },
  gameOver: () => {
    tone(523, 150, 'sine');
    setTimeout(() => tone(659, 150, 'sine'), 140);
    setTimeout(() => tone(784, 320, 'sine'), 280);
  },
};
