import type { RoomId } from '@chrono-bid/shared-types';
import { EMPTY_ROOM_TTL_MS, MAX_ROOMS, ROOM_ID_LENGTH } from '../config.js';
import { generateRoomId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { Room, type RoomCallbacks } from './Room.js';

export class RoomManager {
  private rooms = new Map<RoomId, Room>();
  private sweepTimer: NodeJS.Timeout;

  constructor(private makeCallbacks: (roomId: RoomId) => RoomCallbacks) {
    // Periodically sweep rooms nobody has touched in a while — covers the
    // case where every socket vanished without a clean disconnect event.
    this.sweepTimer = setInterval(() => this.sweep(), 60_000);
    this.sweepTimer.unref?.();
  }

  count(): number {
    return this.rooms.size;
  }

  create(): Room | { error: string } {
    if (this.rooms.size >= MAX_ROOMS) {
      return { error: 'The server is at capacity — please try again shortly.' };
    }
    let id = generateRoomId(ROOM_ID_LENGTH);
    let attempts = 0;
    while (this.rooms.has(id) && attempts < 10) {
      id = generateRoomId(ROOM_ID_LENGTH);
      attempts++;
    }
    const room = new Room(id, this.makeCallbacks(id));
    this.rooms.set(id, room);
    logger.info('room created', { roomId: id });
    return room;
  }

  get(roomId: RoomId): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  delete(roomId: RoomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.destroy();
    this.rooms.delete(roomId);
    logger.info('room deleted', { roomId });
  }

  private sweep() {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (room.isEmpty() && now - room.lastActivityAt > EMPTY_ROOM_TTL_MS) {
        this.delete(id);
      }
    }
  }
}
