/**
 * Shared types used by both the server and the web client.
 * The server is the source of truth for all game state; the client
 * only ever receives the subset of this data it is allowed to see
 * (see `PublicPlayerView` / `PublicRoomState`).
 */

export type PlayerId = string;
export type RoomId = string;

export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'round_active'
  | 'round_waiting' // some players released, waiting on the rest
  | 'round_reveal'
  | 'results';

export type ConnectionStatus = 'connected' | 'disconnected' | 'bot';

export interface RoomSettings {
  /** Total starting time budget per player, in whole seconds (180-600). */
  durationSeconds: number;
  maxPlayers: number; // 2-7
  locked: boolean;
}

/**
 * Everything the server knows about a player. NEVER sent to clients
 * as-is — `bidHeldSince` / any live bid amount is server-private during
 * an active round.
 */
export interface PlayerRecord {
  id: PlayerId;
  nickname: string;
  isAdmin: boolean;
  connection: ConnectionStatus;
  ready: boolean;
  remainingMs: number;
  victoryTokens: number;
  totalMsSpent: number;
  joinedAt: number; // epoch ms, used as a final tiebreaker
  isSpectator: boolean;
}

/** What a client is allowed to know about another player at any moment. */
export interface PublicPlayerView {
  id: PlayerId;
  nickname: string;
  isAdmin: boolean;
  connection: ConnectionStatus;
  ready: boolean;
  approxRemainingSeconds: number; // rounded to nearest second, per spec
  victoryTokens: number;
  isSpectator: boolean;
  isHolding: boolean; // whether they are *currently* holding — not for how long
}

/** What the *current player themself* additionally gets to see about their own state. */
export interface SelfPlayerView extends PublicPlayerView {
  exactRemainingMs: number;
}

export interface RoundResultView {
  round: number;
  winnerId: PlayerId | null; // null only possible if everyone had 0 time and tied at 0
  winnerNickname: string | null;
}

export interface PublicRoomState {
  roomId: RoomId;
  phase: GamePhase;
  settings: RoomSettings;
  round: number;
  totalRounds: number;
  players: PublicPlayerView[];
  lastResult: RoundResultView | null;
  countdownValue: number | null; // 3,2,1 while phase === 'countdown'
}

export interface ChatMessage {
  id: string;
  playerId: PlayerId;
  nickname: string;
  text: string;
  sentAt: number;
}

export type EmoteKind = 'thumbs_up' | 'laugh' | 'shock' | 'devil' | 'clap';

export interface EmoteEvent {
  playerId: PlayerId;
  nickname: string;
  emote: EmoteKind;
}

/** Final scoreboard entry once the game has ended. */
export interface FinalStanding {
  playerId: PlayerId;
  nickname: string;
  victoryTokens: number;
  remainingMs: number;
  totalMsSpent: number;
  joinedAt: number;
  rank: number;
}

// ---- Socket.io event contracts ----

export interface ServerToClientEvents {
  room_state: (state: PublicRoomState) => void;
  self_state: (state: SelfPlayerView) => void;
  chat_message: (msg: ChatMessage) => void;
  emote: (evt: EmoteEvent) => void;
  round_result: (result: RoundResultView) => void;
  game_over: (standings: FinalStanding[]) => void;
  error_message: (msg: string) => void;
  kicked: () => void;
  room_deleted: () => void;
}

export interface ClientToServerEvents {
  create_room: (
    payload: { nickname: string; settings: Partial<RoomSettings> },
    ack: (res: { roomId: RoomId; playerId: PlayerId; playerToken: string } | { error: string }) => void,
  ) => void;
  join_room: (
    payload: { roomId: RoomId; nickname: string },
    ack: (
      res: { ok: true; playerId: PlayerId; playerToken: string; isSpectator: boolean } | { error: string },
    ) => void,
  ) => void;
  /**
   * Sent right after a socket (re)connects, using the token issued by
   * create_room/join_room and persisted client-side (e.g. sessionStorage).
   * Lets a page refresh or dropped connection rejoin the same seat within
   * the reconnect grace period instead of being treated as a new player.
   */
  rejoin_room: (
    payload: { roomId: RoomId; playerId: PlayerId; playerToken: string },
    ack: (res: { ok: true } | { error: string }) => void,
  ) => void;
  set_ready: (ready: boolean) => void;
  update_settings: (settings: Partial<RoomSettings>) => void;
  kick_player: (playerId: PlayerId) => void;
  start_game: () => void;
  restart_game: () => void;
  hold_start: () => void;
  hold_release: () => void;
  send_chat: (text: string) => void;
  send_emote: (emote: EmoteKind) => void;
  leave_room: () => void;
}

export const ROUNDS_BY_PLAYER_COUNT: Record<number, number> = {
  2: 7,
  3: 10,
  4: 13,
  5: 16,
  6: 19,
  7: 22,
};

export const MIN_DURATION_SECONDS = 180;
export const MAX_DURATION_SECONDS = 600;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 7;
export const RECONNECT_GRACE_MS = 60_000;
export const COUNTDOWN_SECONDS = 3;
