import {
  applyBid,
  computeBidFromHold,
  computeFinalStandings,
  decideBotBidMs,
  nextPhase,
  pickRandomPersonality,
  resolveRoundWinner,
  toApproxSeconds,
  zeroBid,
  type BotPersonality,
  type RoundBid,
} from '@chrono-bid/game-engine';
import {
  MAX_DURATION_SECONDS,
  MAX_PLAYERS,
  MIN_DURATION_SECONDS,
  MIN_PLAYERS,
  RECONNECT_GRACE_MS,
  ROUNDS_BY_PLAYER_COUNT,
  type ChatMessage,
  type EmoteKind,
  type FinalStanding,
  type GamePhase,
  type PlayerId,
  type PlayerRecord,
  type PublicPlayerView,
  type PublicRoomState,
  type RoomId,
  type RoomSettings,
  type RoundResultView,
  type SelfPlayerView,
} from '@chrono-bid/shared-types';
import { generateMessageId, generatePlayerId, generatePlayerToken } from '../utils/id.js';
import { logger } from '../utils/logger.js';

interface InternalPlayer extends PlayerRecord {
  token: string;
  socketId: string | null;
  personality: BotPersonality | null;
  disconnectTimer: NodeJS.Timeout | null;
}

interface RoundState {
  startedAtMs: number;
  pressedAt: Map<PlayerId, number>;
  releases: Map<PlayerId, RoundBid>;
  autoReleaseTimers: Map<PlayerId, NodeJS.Timeout>;
}

export type Broadcast = (roomId: RoomId) => void;

export interface RoomCallbacks {
  onStateChange: (room: Room) => void;
  onRoundResult: (room: Room, result: RoundResultView) => void;
  onGameOver: (room: Room, standings: FinalStanding[]) => void;
  onChat: (room: Room, msg: ChatMessage) => void;
  onEmote: (room: Room, playerId: PlayerId, emote: EmoteKind) => void;
  onKicked: (room: Room, playerId: PlayerId) => void;
  onError: (room: Room, playerId: PlayerId, message: string) => void;
  onEmpty: (room: Room) => void;
}

const DEFAULT_SETTINGS: RoomSettings = {
  durationSeconds: 300,
  maxPlayers: 7,
  locked: false,
};

export class Room {
  readonly id: RoomId;
  readonly createdAt = Date.now();
  settings: RoomSettings = { ...DEFAULT_SETTINGS };
  phase: GamePhase = 'lobby';
  round = 0;
  totalRounds = 0;
  lastResult: RoundResultView | null = null;
  lastActivityAt = Date.now();

  private players = new Map<PlayerId, InternalPlayer>();
  private roundState: RoundState | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private countdownValue: number | null = null;

  constructor(
    id: RoomId,
    private cb: RoomCallbacks,
  ) {
    this.id = id;
  }

  // ---- player lifecycle ----------------------------------------------

  addPlayer(nickname: string, socketId: string): InternalPlayer | { error: string } {
    const activePlayers = [...this.players.values()].filter((p) => !p.isSpectator);
    const isLateJoin = this.phase !== 'lobby';

    if (this.settings.locked && !isLateJoin) return { error: 'This room is locked.' };
    if (!isLateJoin && activePlayers.length >= this.settings.maxPlayers) {
      return { error: 'Room is full.' };
    }

    const nickname_ = this.uniqueNickname(nickname);
    const player: InternalPlayer = {
      id: generatePlayerId(),
      token: generatePlayerToken(),
      nickname: nickname_,
      isAdmin: this.players.size === 0,
      connection: 'connected',
      ready: false,
      remainingMs: this.settings.durationSeconds * 1000,
      victoryTokens: 0,
      totalMsSpent: 0,
      joinedAt: Date.now(),
      isSpectator: isLateJoin, // spec: game already started -> spectator mode
      socketId,
      personality: null,
      disconnectTimer: null,
    };
    this.players.set(player.id, player);
    this.touch();
    return player;
  }

  private uniqueNickname(requested: string): string {
    const trimmed = requested.trim().slice(0, 20) || 'Player';
    const existing = new Set([...this.players.values()].map((p) => p.nickname));
    if (!existing.has(trimmed)) return trimmed;
    let n = 2;
    while (existing.has(`${trimmed} (${n})`)) n++;
    return `${trimmed} (${n})`;
  }

  getPlayer(playerId: PlayerId): InternalPlayer | undefined {
    return this.players.get(playerId);
  }

  verifyToken(playerId: PlayerId, token: string): boolean {
    return this.players.get(playerId)?.token === token;
  }

  attachSocket(playerId: PlayerId, socketId: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = null;
    }
    p.socketId = socketId;
    p.connection = p.connection === 'bot' ? 'bot' : 'connected';
    this.touch();
    this.cb.onStateChange(this);
  }

  handleDisconnect(socketId: string) {
    const player = [...this.players.values()].find((p) => p.socketId === socketId);
    if (!player) return;
    player.socketId = null;
    player.connection = 'disconnected';
    this.cb.onStateChange(this);

    player.disconnectTimer = setTimeout(() => {
      // Grace period expired.
      if (this.phase === 'lobby') {
        this.players.delete(player.id);
        this.maybeTransferAdmin();
      } else {
        // Spec: player becomes an AI bot and play continues.
        player.connection = 'bot';
        player.personality = pickRandomPersonality(Math.random);
      }
      this.cb.onStateChange(this);
      if (this.players.size === 0) this.cb.onEmpty(this);
    }, RECONNECT_GRACE_MS);
  }

  private maybeTransferAdmin() {
    const stillHasAdmin = [...this.players.values()].some((p) => p.isAdmin);
    if (stillHasAdmin) return;
    const next = [...this.players.values()].find((p) => p.connection !== 'bot');
    if (next) next.isAdmin = true;
  }

  kickPlayer(adminId: PlayerId, targetId: PlayerId): true | { error: string } {
    const admin = this.players.get(adminId);
    if (!admin?.isAdmin) return { error: 'Only the admin can kick players.' };
    if (adminId === targetId) return { error: "You can't kick yourself." };
    const target = this.players.get(targetId);
    if (!target) return { error: 'Player not found.' };
    this.cb.onKicked(this, targetId);
    this.players.delete(targetId);
    this.cb.onStateChange(this);
    return true;
  }

  leave(playerId: PlayerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    this.players.delete(playerId);
    this.maybeTransferAdmin();
    this.cb.onStateChange(this);
    if (this.players.size === 0) this.cb.onEmpty(this);
  }

  // ---- lobby ------------------------------------------------------------

  setReady(playerId: PlayerId, ready: boolean) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'lobby' || p.isSpectator) return;
    p.ready = ready;
    this.touch();
    this.cb.onStateChange(this);
  }

  updateSettings(adminId: PlayerId, partial: Partial<RoomSettings>): true | { error: string } {
    const admin = this.players.get(adminId);
    if (!admin?.isAdmin) return { error: 'Only the admin can change settings.' };
    if (this.phase !== 'lobby') return { error: 'Cannot change settings after the game starts.' };

    if (partial.durationSeconds !== undefined) {
      const d = Math.round(partial.durationSeconds);
      if (d < MIN_DURATION_SECONDS || d > MAX_DURATION_SECONDS) {
        return { error: `Duration must be between ${MIN_DURATION_SECONDS / 60} and ${MAX_DURATION_SECONDS / 60} minutes.` };
      }
      this.settings.durationSeconds = d;
      for (const p of this.players.values()) p.remainingMs = d * 1000;
    }
    if (partial.maxPlayers !== undefined) {
      const m = Math.round(partial.maxPlayers);
      if (m < MIN_PLAYERS || m > MAX_PLAYERS) return { error: `Max players must be ${MIN_PLAYERS}-${MAX_PLAYERS}.` };
      if (m < this.players.size) return { error: 'Cannot set below current player count.' };
      this.settings.maxPlayers = m;
    }
    if (partial.locked !== undefined) this.settings.locked = partial.locked;

    this.touch();
    this.cb.onStateChange(this);
    return true;
  }

  private activePlayers(): InternalPlayer[] {
    return [...this.players.values()].filter((p) => !p.isSpectator);
  }

  canStart(): boolean {
    const active = this.activePlayers();
    return (
      this.phase === 'lobby' &&
      active.length >= MIN_PLAYERS &&
      active.length <= MAX_PLAYERS &&
      active.every((p) => p.ready)
    );
  }

  startGame(requesterId: PlayerId): true | { error: string } {
    const requester = this.players.get(requesterId);
    if (!requester?.isAdmin) return { error: 'Only the admin can start the game.' };
    if (!this.canStart()) return { error: 'Not everyone is ready, or the player count is invalid.' };

    const activeCount = this.activePlayers().length;
    this.totalRounds = ROUNDS_BY_PLAYER_COUNT[activeCount] ?? 10;
    this.round = 0;
    this.phase = nextPhase(this.phase, 'START_GAME') ?? 'countdown';
    this.beginCountdown();
    return true;
  }

  // ---- round flow ---------------------------------------------------

  private beginCountdown() {
    this.round += 1;
    this.countdownValue = 3;
    this.phase = 'countdown';
    this.cb.onStateChange(this);

    const tick = () => {
      if (this.countdownValue === null) return;
      if (this.countdownValue <= 1) {
        this.countdownValue = null;
        this.beginRound();
        return;
      }
      this.countdownValue -= 1;
      this.cb.onStateChange(this);
      this.countdownTimer = setTimeout(tick, 1000);
    };
    this.countdownTimer = setTimeout(tick, 1000);
  }

  private beginRound() {
    this.phase = 'round_active';
    this.roundState = {
      startedAtMs: Date.now(),
      pressedAt: new Map(),
      releases: new Map(),
      autoReleaseTimers: new Map(),
    };
    this.cb.onStateChange(this);

    // Players (and bots) with zero time left auto-bid 0 immediately —
    // per spec they remain in the game but can't compete this round.
    for (const p of this.activePlayers()) {
      if (p.remainingMs <= 0) {
        this.roundState.releases.set(p.id, zeroBid(p.id, this.roundState.startedAtMs));
      }
    }
    this.checkRoundComplete();

    // Kick off bot decisions for this round.
    for (const p of this.activePlayers()) {
      if (p.connection === 'bot' && p.remainingMs > 0) this.scheduleBotMove(p.id);
    }
  }

  private scheduleBotMove(playerId: PlayerId) {
    const p = this.players.get(playerId);
    if (!p || !this.roundState) return;
    const opponents = this.activePlayers().filter((o) => o.id !== playerId);
    const bidMs = decideBotBidMs({
      remainingMs: p.remainingMs,
      roundsRemainingIncludingCurrent: this.totalRounds - this.round + 1,
      approxOpponentRemainingSeconds: opponents.map((o) => toApproxSeconds(o.remainingMs)),
      personality: p.personality ?? pickRandomPersonality(Math.random),
      rng: Math.random,
    });
    // A small human-like reaction delay before the bot even starts holding.
    const reactionDelayMs = 80 + Math.random() * 420;
    setTimeout(() => {
      if (this.phase !== 'round_active' || !this.roundState) return;
      this.holdStart(playerId);
      setTimeout(() => {
        if (this.roundState?.pressedAt.has(playerId) && !this.roundState.releases.has(playerId)) {
          this.holdRelease(playerId);
        }
      }, bidMs);
    }, reactionDelayMs);
  }

  /** Server-authoritative: the timestamp is always `Date.now()` on the server, never client-supplied. */
  holdStart(playerId: PlayerId): true | { error: string } {
    const p = this.players.get(playerId);
    if (!p || p.isSpectator) return { error: 'Spectators cannot bid.' };
    if (this.phase !== 'round_active' || !this.roundState) return { error: 'No active round.' };
    if (this.roundState.releases.has(playerId)) return { error: 'You already released this round.' };
    if (this.roundState.pressedAt.has(playerId)) return { error: 'Already holding.' };
    if (p.remainingMs <= 0) return { error: 'No time remaining.' };

    const now = Date.now();
    this.roundState.pressedAt.set(playerId, now);
    this.cb.onStateChange(this);

    const timer = setTimeout(() => {
      // Auto-release the instant their clock would hit zero.
      this.holdRelease(playerId);
    }, p.remainingMs);
    this.roundState.autoReleaseTimers.set(playerId, timer);
    return true;
  }

  holdRelease(playerId: PlayerId): true | { error: string } {
    const p = this.players.get(playerId);
    const rs = this.roundState;
    if (!p || !rs) return { error: 'No active round.' };
    const pressedAt = rs.pressedAt.get(playerId);
    if (pressedAt === undefined) return { error: 'Not currently holding.' };
    if (rs.releases.has(playerId)) return { error: 'Already released.' };

    const timer = rs.autoReleaseTimers.get(playerId);
    if (timer) clearTimeout(timer);
    rs.autoReleaseTimers.delete(playerId);

    const now = Date.now();
    const amountMs = computeBidFromHold(pressedAt, now, p.remainingMs);
    rs.releases.set(playerId, { playerId, amountMs, releasedAtMs: now });
    p.remainingMs = applyBid(p.remainingMs, amountMs);
    p.totalMsSpent += amountMs;

    this.cb.onStateChange(this);
    this.checkRoundComplete();
    return true;
  }

  private checkRoundComplete() {
    if (!this.roundState) return;
    const active = this.activePlayers();
    const allReleased = active.every((p) => this.roundState!.releases.has(p.id));
    if (!allReleased) return;
    this.resolveRound();
  }

  private resolveRound() {
    if (!this.roundState) return;
    const bids = [...this.roundState.releases.values()];
    const joinedAtByPlayer: Record<PlayerId, number> = {};
    for (const p of this.players.values()) joinedAtByPlayer[p.id] = p.joinedAt;

    const { winnerId } = resolveRoundWinner({ bids, joinedAtByPlayer });
    if (winnerId) {
      const winner = this.players.get(winnerId);
      if (winner) winner.victoryTokens += 1;
    }

    const winner = winnerId ? this.players.get(winnerId) : undefined;
    const result: RoundResultView = {
      round: this.round,
      winnerId: winnerId ?? null,
      winnerNickname: winner?.nickname ?? null,
    };
    this.lastResult = result;
    this.phase = 'round_reveal';
    this.roundState = null;
    this.cb.onStateChange(this);
    this.cb.onRoundResult(this, result);

    const hasMoreRounds = this.round < this.totalRounds;
    // Brief pause on the reveal screen before the next round / results.
    setTimeout(() => {
      if (hasMoreRounds) {
        this.beginCountdown();
      } else {
        this.finishGame();
      }
    }, 3500);
  }

  private finishGame() {
    this.phase = 'results';
    const standings = computeFinalStandings(
      [...this.players.values()]
        .filter((p) => !p.isSpectator)
        .map((p) => ({
          playerId: p.id,
          nickname: p.nickname,
          victoryTokens: p.victoryTokens,
          remainingMs: p.remainingMs,
          totalMsSpent: p.totalMsSpent,
          joinedAt: p.joinedAt,
        })),
    );
    this.cb.onStateChange(this);
    this.cb.onGameOver(this, standings);
  }

  restart(requesterId: PlayerId): true | { error: string } {
    const requester = this.players.get(requesterId);
    if (!requester?.isAdmin) return { error: 'Only the admin can restart.' };
    if (this.phase !== 'results') return { error: 'Game is still in progress.' };

    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.phase = 'lobby';
    this.round = 0;
    this.totalRounds = 0;
    this.lastResult = null;
    this.roundState = null;
    for (const p of this.players.values()) {
      p.remainingMs = this.settings.durationSeconds * 1000;
      p.victoryTokens = 0;
      p.totalMsSpent = 0;
      p.ready = false;
      p.isSpectator = false;
    }
    this.cb.onStateChange(this);
    return true;
  }

  // ---- chat & emotes (lobby-only per spec) ---------------------------

  sendChat(playerId: PlayerId, text: string): true | { error: string } {
    if (this.phase !== 'lobby') return { error: 'Chat is only available in the lobby.' };
    const p = this.players.get(playerId);
    if (!p) return { error: 'Unknown player.' };
    const trimmed = text.trim().slice(0, 300);
    if (!trimmed) return { error: 'Message is empty.' };
    const msg: ChatMessage = {
      id: generateMessageId(),
      playerId,
      nickname: p.nickname,
      text: trimmed,
      sentAt: Date.now(),
    };
    this.cb.onChat(this, msg);
    return true;
  }

  sendEmote(playerId: PlayerId, emote: EmoteKind): true | { error: string } {
    // Spec: emotes only *between* rounds — i.e. not while a round is live.
    if (this.phase === 'round_active' || this.phase === 'round_waiting') {
      return { error: 'Emotes are disabled during an active round.' };
    }
    const p = this.players.get(playerId);
    if (!p) return { error: 'Unknown player.' };
    this.cb.onEmote(this, playerId, emote);
    return true;
  }

  // ---- view builders ---------------------------------------------------

  private touch() {
    this.lastActivityAt = Date.now();
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  toPublicState(): PublicRoomState {
    const players: PublicPlayerView[] = [...this.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isAdmin: p.isAdmin,
      connection: p.connection,
      ready: p.ready,
      approxRemainingSeconds: toApproxSeconds(p.remainingMs),
      victoryTokens: p.victoryTokens,
      isSpectator: p.isSpectator,
      isHolding: this.roundState?.pressedAt.has(p.id) && !this.roundState?.releases.has(p.id) ? true : false,
    }));

    return {
      roomId: this.id,
      phase: this.phase,
      settings: this.settings,
      round: this.round,
      totalRounds: this.totalRounds,
      players,
      lastResult: this.lastResult,
      countdownValue: this.countdownValue,
    };
  }

  toSelfState(playerId: PlayerId): SelfPlayerView | null {
    const p = this.players.get(playerId);
    if (!p) return null;
    return {
      id: p.id,
      nickname: p.nickname,
      isAdmin: p.isAdmin,
      connection: p.connection,
      ready: p.ready,
      approxRemainingSeconds: toApproxSeconds(p.remainingMs),
      victoryTokens: p.victoryTokens,
      isSpectator: p.isSpectator,
      isHolding: this.roundState?.pressedAt.has(p.id) && !this.roundState?.releases.has(p.id) ? true : false,
      exactRemainingMs: p.remainingMs,
    };
  }

  allPlayerIds(): PlayerId[] {
    return [...this.players.keys()];
  }

  socketIdFor(playerId: PlayerId): string | null {
    return this.players.get(playerId)?.socketId ?? null;
  }

  destroy() {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    if (this.roundState) {
      for (const t of this.roundState.autoReleaseTimers.values()) clearTimeout(t);
    }
    for (const p of this.players.values()) {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
    }
    logger.info('room destroyed', { roomId: this.id });
  }
}
