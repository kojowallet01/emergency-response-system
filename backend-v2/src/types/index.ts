import type { Server } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

export type { Server as IoServer } from 'socket.io';