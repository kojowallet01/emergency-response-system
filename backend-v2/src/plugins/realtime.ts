import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';

export interface Realtime {
  io: SocketIOServer;
}

export function createRealtime(app: FastifyInstance, origin: string | string[]): Realtime {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    app.log.info({ socketId: socket.id }, 'socket connected');

    socket.on('join-report', (reportId: string) => {
      socket.join(`report:${reportId}`);
    });

    socket.on('disconnect', () => {
      app.log.info({ socketId: socket.id }, 'socket disconnected');
    });
  });

  return { io };
}