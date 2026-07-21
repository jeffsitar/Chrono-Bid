import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  PlayerId,
  RoomId,
  ServerToClientEvents,
} from '@chrono-bid/shared-types';
import { RoomManager } from '../rooms/RoomManager.js';
import type { Room } from '../rooms/Room.js';
import { logger } from '../utils/logger.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  roomId?: RoomId;
  playerId?: PlayerId;
}

function socketRoomChannel(roomId: RoomId) {
  return `room:${roomId}`;
}

export function registerHandlers(io: IOServer) {
  const manager = new RoomManager((roomId) => ({
    onStateChange: (room) => broadcastRoomState(io, room),
    onRoundResult: (room, result) => io.to(socketRoomChannel(room.id)).emit('round_result', result),
    onGameOver: (room, standings) => io.to(socketRoomChannel(room.id)).emit('game_over', standings),
    onChat: (room, msg) => io.to(socketRoomChannel(room.id)).emit('chat_message', msg),
    onEmote: (room, playerId, emote) => {
      const p = room.toPublicState().players.find((pl) => pl.id === playerId);
      if (!p) return;
      io.to(socketRoomChannel(room.id)).emit('emote', { playerId, nickname: p.nickname, emote });
    },
    onKicked: (room, playerId) => {
      const sid = room.socketIdFor(playerId);
      if (sid) io.to(sid).emit('kicked');
      const s = io.sockets.sockets.get(sid ?? '');
      s?.leave(socketRoomChannel(roomId));
    },
    onError: () => {},
    onEmpty: (room) => manager.delete(room.id),
  }));

  function broadcastRoomState(io: IOServer, room: Room) {
    io.to(socketRoomChannel(room.id)).emit('room_state', room.toPublicState());
    // Each player also gets a private message with their own exact time.
    for (const playerId of room.allPlayerIds()) {
      const sid = room.socketIdFor(playerId);
      if (!sid) continue;
      const self = room.toSelfState(playerId);
      if (self) io.to(sid).emit('self_state', self);
    }
  }

  io.on('connection', (socket: IOSocket) => {
    const data = socket.data as SocketData;

    const requireRoom = (): Room | null => {
      if (!data.roomId) return null;
      return manager.get(data.roomId) ?? null;
    };

    socket.on('create_room', ({ nickname, settings }, ack) => {
      const room = manager.create();
      if ('error' in room) return ack({ error: room.error });

      const player = room.addPlayer(nickname ?? 'Host', socket.id);
      if ('error' in player) return ack({ error: player.error });

      if (settings) {
        const res = room.updateSettings(player.id, settings);
        if (typeof res === 'object') logger.warn('invalid initial settings', { error: res.error });
      }

      data.roomId = room.id;
      data.playerId = player.id;
      socket.join(socketRoomChannel(room.id));
      broadcastRoomState(io, room);
      ack({ roomId: room.id, playerId: player.id, playerToken: player.token });
    });

    socket.on('join_room', ({ roomId, nickname }, ack) => {
      const room = manager.get(roomId);
      if (!room) return ack({ error: 'Room not found.' });
      const player = room.addPlayer(nickname ?? 'Player', socket.id);
      if ('error' in player) return ack({ error: player.error });

      data.roomId = room.id;
      data.playerId = player.id;
      socket.join(socketRoomChannel(room.id));
      broadcastRoomState(io, room);
      ack({ ok: true, playerId: player.id, playerToken: player.token, isSpectator: player.isSpectator });
    });

    socket.on('rejoin_room', ({ roomId, playerId, playerToken }, ack) => {
      const room = manager.get(roomId);
      if (!room) return ack({ error: 'Room not found.' });
      if (!room.verifyToken(playerId, playerToken)) return ack({ error: 'Invalid session.' });

      room.attachSocket(playerId, socket.id);
      data.roomId = room.id;
      data.playerId = playerId;
      socket.join(socketRoomChannel(room.id));
      broadcastRoomState(io, room);
      ack({ ok: true });
    });

    socket.on('set_ready', (ready) => {
      const room = requireRoom();
      if (room && data.playerId) room.setReady(data.playerId, ready);
    });

    socket.on('update_settings', (settings) => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.updateSettings(data.playerId, settings);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('kick_player', (targetId) => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.kickPlayer(data.playerId, targetId);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('start_game', () => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.startGame(data.playerId);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('restart_game', () => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.restart(data.playerId);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('hold_start', () => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.holdStart(data.playerId);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('hold_release', () => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.holdRelease(data.playerId);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('send_chat', (text) => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.sendChat(data.playerId, text);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('send_emote', (emote) => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      const res = room.sendEmote(data.playerId, emote);
      if (typeof res === 'object') socket.emit('error_message', res.error);
    });

    socket.on('leave_room', () => {
      const room = requireRoom();
      if (!room || !data.playerId) return;
      room.leave(data.playerId);
      socket.leave(socketRoomChannel(room.id));
      data.roomId = undefined;
      data.playerId = undefined;
    });

    socket.on('disconnect', () => {
      const room = requireRoom();
      room?.handleDisconnect(socket.id);
    });
  });

  return manager;
}
