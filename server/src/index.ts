import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@duodeceit/shared';
import { WordManager } from './words/wordManager.js';
import { RoomManager } from './rooms/RoomManager.js';
import { registerRoomHandlers } from './socket/roomHandlers.js';
import { registerGameHandlers } from './socket/gameHandlers.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const wordManager = new WordManager();
const roomManager = new RoomManager(io, wordManager);

io.on('connection', (socket) => {
  registerRoomHandlers(socket, roomManager);
  registerGameHandlers(socket, roomManager);

  socket.on('disconnect', () => {
    roomManager.handleSocketDisconnect(socket.id);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[DuoDeceit Server] Running on http://0.0.0.0:${PORT}`);
});
