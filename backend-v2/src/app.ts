import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { env } from './config/env';
import reportRoutes from './routes/reports';
import geocodeRoutes from './routes/geocode';
import smsRoutes from './routes/sms';
import { createRealtime } from './plugins/realtime';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
    trustProxy: true,
  });

  const corsOrigin: string | string[] = env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((s) => s.trim());

  await app.register(cors, { origin: corsOrigin });
  await app.register(sensible);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  const io = createRealtime(app, corsOrigin);
  app.decorate('io', io.io);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(reportRoutes);
  await app.register(geocodeRoutes);
  await app.register(smsRoutes);

  app.setErrorHandler((error: unknown, request, reply) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const validation = (error as { validation?: unknown }).validation;
    if (validation) {
      return reply.code(400).send({ error: 'Validation failed' });
    }
    request.log.error({ err }, 'unhandled error');
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    reply.code(statusCode).send({ error: err.message });
  });

  return app;
}