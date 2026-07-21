export const PORT = Number(process.env.PORT ?? 4000);
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

/** Server-processing budget per spec ("less than 80ms"); used only for a dev-time warning. */
export const SLOW_HANDLER_WARN_MS = 80;

export const MAX_ROOMS = 100;
export const ROOM_ID_LENGTH = 6;
/** Rooms with nobody connected get swept after this long. */
export const EMPTY_ROOM_TTL_MS = 5 * 60_000;
