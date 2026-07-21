import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@chrono-bid/shared-types';
import { CLIENT_ORIGINS, PORT } from './config.js';
import { registerHandlers } from './socket/registerHandlers.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGINS, methods: ['GET', 'POST'] },
  // Keep connections alive through typical PaaS proxy idle timeouts.
  pingInterval: 15_000,
  pingTimeout: 20_000,
});

const manager = registerHandlers(io);

httpServer.listen(PORT, () => {
  logger.info(`Chrono Bid server listening on :${PORT}`, {
    clientOrigins: CLIENT_ORIGINS,
    roomCount: manager.count(),
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  httpServer.close(() => process.exit(0));
});
