'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameState, useClearError } from '@/hooks/useGameState';
import { useRoomSession } from '@/hooks/useSocket';
import { getSocket, loadSession } from '@/lib/socketClient';
import { sound } from '@/lib/sound';

import { PlayerList } from '@/components/PlayerList';
import { AdminControls } from '@/components/AdminControls';
import { ChatPanel } from '@/components/ChatPanel';
import { EmoteBar } from '@/components/EmoteBar';
import { RoundBanner } from '@/components/RoundBanner';
import { Scoreboard } from '@/components/Scoreboard';
import { HoldButton } from '@/components/HoldButton';
import { RemainingTimeClock } from '@/components/RemainingTimeClock';
import { TableSceneLazy } from '@/components/game/scene/TableSceneLazy';
import { SceneErrorBoundary } from '@/components/shared/SceneErrorBoundary';
import { ResultScreen } from '@/components/game/ResultScreen';
import { SpectatorHUD } from '@/components/game/SpectatorHUD';
import { ConnectionBanner } from '@/components/shared/ConnectionBanner';
import { ErrorToast } from '@/components/shared/ErrorToast';
import { SoundManager } from '@/components/shared/SoundManager';

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = (params.roomId ?? '').toUpperCase();
  const router = useRouter();

  const { room, self, chat, standings, errorMessage, connected } = useGameState();
  const { leaveRoom, rejoining, joinRoom, sessionLostTick } = useRoomSession();
  const visibleError = useClearError(errorMessage);
  const [copied, setCopied] = useState(false);

  // sessionStorage is per-tab, so anyone arriving via a shared invite link,
  // a new tab, or a cleared session has nothing to rejoin with. Detect that
  // up front so we can show a join form instead of spinning forever.
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinNickname, setJoinNickname] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return; // param not settled yet — wait rather than misjudge
    const session = loadSession();
    setNeedsJoin(!session || session.roomId !== roomId);
  }, [roomId]);

  // If a rejoin attempt fails partway through (room gone, expired token,
  // server restarted and lost its in-memory state, etc), the session gets
  // cleared — fall into the join form instead of leaving the spinner
  // waiting on a room_state that will never come.
  useEffect(() => {
    if (sessionLostTick > 0) setNeedsJoin(true);
  }, [sessionLostTick]);

  // Last line of defense: whatever the reason, never let the connecting
  // state hang indefinitely with no way out for the person watching it.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (room && self) return setStuck(false);
    const t = setTimeout(() => setStuck(true), 20000);
    return () => clearTimeout(t);
  }, [room, self, roomId]);

  async function handleJoinExisting() {
    if (!joinNickname.trim()) return setJoinError('Enter a nickname first.');
    setJoinBusy(true);
    setJoinError(null);
    const res = await joinRoom(roomId, joinNickname.trim());
    setJoinBusy(false);
    if ('error' in res) return setJoinError(res.error);
    setNeedsJoin(false);
    setStuck(false);
  }

  const prevCountdown = useRef<number | null>(null);
  const prevPhase = useRef<string | null>(null);

  // Sound cues, driven off state transitions rather than scattered calls.
  useEffect(() => {
    if (!room) return;
    if (room.phase === 'countdown' && room.countdownValue !== prevCountdown.current) {
      if (room.countdownValue === 1) sound.countdownGo();
      else if (room.countdownValue !== null) sound.countdownTick();
    }
    prevCountdown.current = room.countdownValue;

    if (room.phase === 'round_reveal' && prevPhase.current !== 'round_reveal') sound.roundWinner();
    prevPhase.current = room.phase;
  }, [room]);

  useEffect(() => {
    if (standings) sound.gameOver();
  }, [standings]);

  function copyInvite() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (needsJoin && (!room || !self)) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-display text-lg font-bold">Join room {roomId}</h2>
        <div className="glass-panel-raised w-full max-w-xs space-y-4 rounded-2xl p-6 text-left">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/40">Nickname</span>
            <input
              value={joinNickname}
              onChange={(e) => setJoinNickname(e.target.value)}
              maxLength={20}
              placeholder="What should we call you?"
              className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:ring-1 focus:ring-cyan-glow/50"
            />
          </label>
          {joinError && <p className="text-sm text-red-400">{joinError}</p>}
          {!connected && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300" role="status">
              Connecting to the game server…
            </p>
          )}
          <button
            onClick={handleJoinExisting}
            disabled={joinBusy || !connected}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-glow/80 to-violet-glow/80 py-3 font-display
              font-bold text-void transition-transform hover:scale-[1.01] active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-40"
          >
            {joinBusy ? 'One sec…' : 'Join room'}
          </button>
        </div>
      </main>
    );
  }

  if (!room || !self) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-glow/30 border-t-cyan-glow" />
        <p className="text-sm text-white/40">
          {rejoining ? 'Reconnecting to your seat…' : `Connecting to room ${roomId}…`}
        </p>
        {visibleError && <p className="max-w-xs text-sm text-red-400">{visibleError}</p>}
        {stuck && (
          <div className="mt-2 space-y-2">
            <p className="max-w-xs text-xs text-white/35">
              Taking longer than expected — the server may have been asleep and is waking up.
            </p>
            <button
              onClick={() => setNeedsJoin(true)}
              className="rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              Join room manually instead
            </button>
          </div>
        )}
      </main>
    );
  }

  const isSpectator = self.isSpectator;
  const isInLobby = room.phase === 'lobby';
  const canStart =
    !isSpectator &&
    room.players.filter((p) => !p.isSpectator).length >= 2 &&
    room.players.filter((p) => !p.isSpectator).every((p) => p.ready);
  const showEmotes = room.phase === 'lobby' || room.phase === 'round_reveal';
  const hasTimeLeft = self.exactRemainingMs > 0;

  return (
    <main className="no-pull relative flex min-h-dvh flex-col px-3 pb-6 pt-3 sm:px-6 sm:pt-6">
      <ConnectionBanner connected={connected} room={room} />
      <ErrorToast message={visibleError} />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            leaveRoom();
            router.push('/');
          }}
          className="text-xs text-white/40 transition-colors hover:text-white/70"
        >
          ← Leave
        </button>

        <button
          onClick={copyInvite}
          className="glass-panel flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
        >
          <span className="chrono-digits font-mono tracking-[0.2em] text-cyan-glow">{roomId}</span>
          <span className="text-white/30">|</span>
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>

        <SoundManager />
      </div>

      {/* ---- Lobby / waiting room ---- */}
      {isInLobby && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-6 grid w-full max-w-4xl flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold">
                Waiting room{' '}
                <span className="text-sm font-normal text-white/40">
                  ({room.players.length}/{room.settings.maxPlayers})
                </span>
              </h2>
              <p className="text-sm text-white/40">
                {room.players.every((p) => p.ready)
                  ? 'Everyone is ready.'
                  : 'Waiting for everyone to ready up…'}
              </p>
            </div>
            <PlayerList players={room.players} selfId={self.id} isAdmin={self.isAdmin} />

            <button
              onClick={() => getSocket().emit('set_ready', !self.ready)}
              className={`w-full rounded-xl py-3 font-display font-bold transition-colors ${
                self.ready
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-gradient-to-r from-cyan-glow/80 to-violet-glow/80 text-void'
              }`}
            >
              {self.ready ? "You're ready ✓" : "I'm ready"}
            </button>

            {showEmotes && (
              <div className="flex justify-center">
                <EmoteBar />
              </div>
            )}

            <div className="h-48">
              <ChatPanel messages={chat} selfId={self.id} />
            </div>
          </div>

          <div>{self.isAdmin && <AdminControls room={room} canStart={canStart} />}</div>
        </motion.div>
      )}

      {/* ---- Live game / spectator ---- */}
      {!isInLobby && room.phase !== 'results' && (
        <div className="mx-auto mt-4 flex w-full max-w-5xl flex-1 flex-col gap-4">
          {isSpectator ? (
            <SpectatorHUD room={room} />
          ) : (
            <>
              <RoundBanner room={room} />

              <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-3xl sm:min-h-[360px]">
                <SceneErrorBoundary>
                  <TableSceneLazy
                    players={room.players}
                    selfId={self.id}
                    winnerId={room.lastResult?.winnerId ?? null}
                    phase={room.phase}
                  />
                </SceneErrorBoundary>
                <div className="pointer-events-none absolute left-3 top-3">
                  <div className="pointer-events-auto">
                    <RemainingTimeClock self={self} />
                  </div>
                </div>
                <div className="pointer-events-none absolute right-3 top-3">
                  <div className="glass-panel pointer-events-auto rounded-xl px-4 py-2 text-right">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Tokens</div>
                    <div className="chrono-digits font-mono text-2xl font-semibold text-cyan-glow">
                      {self.victoryTokens}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <HoldButton
                  enabled={room.phase === 'round_active' && !isSpectator}
                  hasTimeLeft={hasTimeLeft}
                  onHoldChange={(holding) => {
                    if (!holding) sound.release();
                  }}
                />
              </div>

              {showEmotes && (
                <div className="flex justify-center">
                  <EmoteBar />
                </div>
              )}

              <Scoreboard players={room.players} selfId={self.id} />
            </>
          )}
        </div>
      )}

      {/* ---- Results ---- */}
      {room.phase === 'results' && standings && (
        <div className="mx-auto flex w-full flex-1 flex-col justify-center">
          <ResultScreen standings={standings} selfId={self.id} isAdmin={self.isAdmin} />
        </div>
      )}
    </main>
  );
}
