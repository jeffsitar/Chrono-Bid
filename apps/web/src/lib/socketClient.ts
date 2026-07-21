'use client';

import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@chrono-bid/shared-types';

export type ChronoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ChronoSocket | null = null;

/** A single shared socket for the whole app — created lazily, client-side only. */
export function getSocket(): ChronoSocket {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
  socket = io(url, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export interface StoredSession {
  roomId: string;
  playerId: string;
  playerToken: string;
}

const SESSION_KEY = 'chrono-bid-session';

export function saveSession(session: StoredSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage may be unavailable (e.g. private mode) — reconnect just won't be seamless.
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
