'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MAX_DURATION_SECONDS, MAX_PLAYERS, MIN_DURATION_SECONDS, MIN_PLAYERS } from '@chrono-bid/shared-types';
import { useRoomSession } from '@/hooks/useSocket';
import { formatSeconds } from '@/lib/formatTime';

type Tab = 'create' | 'join';

export default function LandingPage() {
  const router = useRouter();
  const { createRoom, joinRoom, connected } = useRoomSession();

  const [tab, setTab] = useState<Tab>('create');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [duration, setDuration] = useState(300);
  const [maxPlayers, setMaxPlayers] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!nickname.trim()) return setError('Enter a nickname first.');
    setBusy(true);
    setError(null);
    const res = await createRoom(nickname.trim(), { durationSeconds: duration, maxPlayers });
    setBusy(false);
    if ('error' in res) return setError(res.error);
    router.push(`/room/${res.roomId}`);
  }

  async function handleJoin() {
    if (!nickname.trim()) return setError('Enter a nickname first.');
    if (!roomCode.trim()) return setError('Enter a room code.');
    setBusy(true);
    setError(null);
    const res = await joinRoom(roomCode.trim(), nickname.trim());
    setBusy(false);
    if ('error' in res) return setError(res.error);
    router.push(`/room/${roomCode.trim().toUpperCase()}`);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10 sm:py-16">
      {/* Ambient background glow — the signature element: a slowly breathing chrono ring */}
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-30 blur-[100px]" style={{ background: 'radial-gradient(circle, #38f2ff, transparent 65%)' }} />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-20 blur-[100px]" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 65%)' }} />

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mt-6 text-center sm:mt-10"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-glow/25 bg-cyan-glow/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-cyan-glow/80">
          2–7 players · no download · no account
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight text-glow-cyan sm:text-6xl md:text-7xl">
          CHRONO BID
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-sm text-white/50 sm:text-base">
          Every player starts with the same bank of time. Every second you hold the button is a
          second you spend forever. Highest bid each round takes the point — nobody sees what
          anybody else bid.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="glass-panel-raised relative z-10 mt-10 w-full max-w-md rounded-3xl p-6 sm:p-8"
      >
        <div className="mb-6 flex rounded-full bg-white/5 p-1">
          {(['create', 'join'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                tab === t ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'create' ? 'Create room' : 'Join room'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/40">Nickname</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="What should we call you?"
              className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:ring-1 focus:ring-cyan-glow/50"
            />
          </label>

          <AnimatePresence mode="wait">
            {tab === 'create' ? (
              <motion.div
                key="create"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
                    <span>Time per player</span>
                    <span className="chrono-digits font-mono text-cyan-glow">{formatSeconds(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_DURATION_SECONDS}
                    max={MAX_DURATION_SECONDS}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-xs uppercase tracking-wide text-white/40">Max players</div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(
                      (n) => (
                        <button
                          key={n}
                          onClick={() => setMaxPlayers(n)}
                          className={`h-9 flex-1 rounded-lg text-sm font-medium transition-colors ${
                            maxPlayers === n
                              ? 'bg-cyan-glow/25 text-cyan-glow'
                              : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          {n}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/40">Room code</span>
                  <input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="CHR8X2"
                    className="chrono-digits w-full rounded-xl bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] outline-none placeholder:text-white/20 focus:ring-1 focus:ring-cyan-glow/50"
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {!connected && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300" role="status">
              Connecting to the game server… if this doesn&apos;t resolve, the server may be
              unreachable (check your connection, or try again shortly).
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={busy || !connected}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-glow/80 to-violet-glow/80 py-3 font-display
              font-bold text-void transition-transform hover:scale-[1.01] active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'One sec…' : tab === 'create' ? 'Create room' : 'Join room'}
          </button>
        </div>
      </motion.div>

      <p className="relative z-10 mt-8 max-w-sm text-center text-xs text-white/25">
        Original bidding-duel format. No affiliation with, and no assets from, any TV show.
      </p>
    </main>
  );
}
