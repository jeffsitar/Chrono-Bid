'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  ChatMessage,
  EmoteEvent,
  FinalStanding,
  PublicRoomState,
  RoundResultView,
  SelfPlayerView,
} from '@chrono-bid/shared-types';
import { getSocket } from '../lib/socketClient';

export interface GameState {
  room: PublicRoomState | null;
  self: SelfPlayerView | null;
  chat: ChatMessage[];
  lastEmote: EmoteEvent | null;
  standings: FinalStanding[] | null;
  errorMessage: string | null;
  connected: boolean;
}

/**
 * Subscribes to every room-scoped server event and exposes the latest
 * snapshot. Deliberately dumb — all game rules live server-side; this
 * hook just mirrors whatever the server says is true.
 */
export function useGameState(): GameState {
  const socket = getSocket();
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [self, setSelf] = useState<SelfPlayerView | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [lastEmote, setLastEmote] = useState<EmoteEvent | null>(null);
  const [standings, setStandings] = useState<FinalStanding[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const emoteClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onRoomState = (state: PublicRoomState) => {
      setRoom(state);
      if (state.phase === 'lobby') setStandings(null);
    };
    const onSelfState = (state: SelfPlayerView) => setSelf(state);
    const onChat = (msg: ChatMessage) => setChat((prev) => [...prev.slice(-49), msg]);
    const onEmote = (evt: EmoteEvent) => {
      setLastEmote(evt);
      if (emoteClearTimer.current) clearTimeout(emoteClearTimer.current);
      emoteClearTimer.current = setTimeout(() => setLastEmote(null), 2500);
    };
    const onRoundResult = (_result: RoundResultView) => {
      // room_state already carries lastResult; kept for components that
      // want to react to the *event* (e.g. trigger a one-shot animation).
    };
    const onGameOver = (finalStandings: FinalStanding[]) => setStandings(finalStandings);
    const onError = (msg: string) => setErrorMessage(msg);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('room_state', onRoomState);
    socket.on('self_state', onSelfState);
    socket.on('chat_message', onChat);
    socket.on('emote', onEmote);
    socket.on('round_result', onRoundResult);
    socket.on('game_over', onGameOver);
    socket.on('error_message', onError);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('room_state', onRoomState);
      socket.off('self_state', onSelfState);
      socket.off('chat_message', onChat);
      socket.off('emote', onEmote);
      socket.off('round_result', onRoundResult);
      socket.off('game_over', onGameOver);
      socket.off('error_message', onError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (emoteClearTimer.current) clearTimeout(emoteClearTimer.current);
    };
  }, [socket]);

  return { room, self, chat, lastEmote, standings, errorMessage, connected };
}

export function useClearError(errorMessage: string | null) {
  const [visible, setVisible] = useState<string | null>(null);
  useEffect(() => {
    if (!errorMessage) return;
    setVisible(errorMessage);
    const t = setTimeout(() => setVisible(null), 4000);
    return () => clearTimeout(t);
  }, [errorMessage]);
  return visible;
}
