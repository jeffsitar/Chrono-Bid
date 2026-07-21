'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RoomSettings } from '@chrono-bid/shared-types';
import { clearSession, getSocket, loadSession, saveSession } from '../lib/socketClient';

export interface RoomActions {
  createRoom: (
    nickname: string,
    settings: Partial<RoomSettings>,
  ) => Promise<{ roomId: string } | { error: string }>;
  joinRoom: (roomId: string, nickname: string) => Promise<{ ok: true } | { error: string }>;
  leaveRoom: () => void;
  rejoining: boolean;
  /** True once the socket has an active connection to the server. False
   *  means create/join will fail — surface this in the UI rather than
   *  letting a click silently do nothing. */
  connected: boolean;
  /** Increments whenever a rejoin attempt fails and the stored session gets
   *  cleared (room gone, invalid token, etc). Consumers should treat any
   *  change to this as "there is no session anymore — stop waiting". */
  sessionLostTick: number;
}

/** How long we wait for a server ack before giving up and telling the
 *  user something is wrong, instead of leaving the button stuck forever.
 *  Generous because free-tier hosts (e.g. Render's free plan) can take
 *  30+ seconds to wake a sleeping instance on the very first request. */
const ACK_TIMEOUT_MS = 20000;

/**
 * On mount, attempts to silently resume a previous session (stored in
 * sessionStorage) — this is what makes a page refresh or a brief network
 * drop reconnect to the same seat instead of losing your place.
 */
export function useRoomSession(): RoomActions {
  const socket = getSocket();
  const [rejoining, setRejoining] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [sessionLostTick, setSessionLostTick] = useState(0);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    const attemptRejoin = () => {
      setRejoining(true);
      socket.timeout(ACK_TIMEOUT_MS).emit('rejoin_room', session, (err, res) => {
        setRejoining(false);
        if (err || (res && 'error' in res)) {
          clearSession();
          setSessionLostTick((n) => n + 1);
        }
      });
    };

    if (socket.connected) attemptRejoin();
    socket.on('connect', attemptRejoin);
    return () => {
      socket.off('connect', attemptRejoin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(
    (nickname: string, settings: Partial<RoomSettings>) =>
      new Promise<{ roomId: string } | { error: string }>((resolve) => {
        socket.timeout(ACK_TIMEOUT_MS).emit('create_room', { nickname, settings }, (err, res) => {
          if (err) return resolve({ error: 'Could not reach the game server. Check your connection and try again.' });
          if ('error' in res) return resolve({ error: res.error });
          saveSession({ roomId: res.roomId, playerId: res.playerId, playerToken: res.playerToken });
          resolve({ roomId: res.roomId });
        });
      }),
    [socket],
  );

  const joinRoom = useCallback(
    (roomId: string, nickname: string) =>
      new Promise<{ ok: true } | { error: string }>((resolve) => {
        socket.timeout(ACK_TIMEOUT_MS).emit('join_room', { roomId: roomId.toUpperCase(), nickname }, (err, res) => {
          if (err) return resolve({ error: 'Could not reach the game server. Check your connection and try again.' });
          if ('error' in res) return resolve({ error: res.error });
          saveSession({ roomId: roomId.toUpperCase(), playerId: res.playerId, playerToken: res.playerToken });
          resolve({ ok: true });
        });
      }),
    [socket],
  );

  const leaveRoom = useCallback(() => {
    socket.emit('leave_room');
    clearSession();
  }, [socket]);

  return { createRoom, joinRoom, leaveRoom, rejoining, connected, sessionLostTick };
}
