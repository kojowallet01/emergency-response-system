import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import type { FastifyInstance } from 'fastify';
import { createReport, getReportById, getReports, updateReportStatus } from '../services/reportService';
import { UpdateReportStatusBody, UpdateReportStatusParams } from '../schemas';

const VALID_TYPES = new Set(['fire', 'medical', 'crime']);

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export default async function reportRoutes(app: FastifyInstance) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  app.post(
    '/report',
    { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const fields: Record<string, string> = {};
      const pendingFiles: { fieldname: string; filename: string; mimetype: string; filepath: string }[] = [];

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          const targetName = `${Date.now()}-${randomUUID()}${path.extname(part.filename)}`;
          const targetPath = path.join(UPLOAD_DIR, targetName);
          await new Promise<void>((resolve, reject) => {
            const stream = createWriteStream(targetPath);
            part.file.pipe(stream);
            stream.on('finish', () => resolve());
            stream.on('error', reject);
          });
          pendingFiles.push({
            fieldname: part.fieldname,
            filename: part.filename,
            mimetype: part.mimetype,
            filepath: targetPath,
          });
        } else if (typeof part.value === 'string') {
          fields[part.fieldname] = part.value;
        }
      }

      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);

      if (!fields.type || !VALID_TYPES.has(fields.type) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return reply.code(400).send({ error: 'Missing required fields: type, latitude, longitude' });
      }

      let voiceUrl: string | null = null;
      const mediaUrls: string[] = [];

      for (const file of pendingFiles) {
        const fileUrl = `/uploads/${path.basename(file.filepath)}`;
        if (file.fieldname === 'voice' || file.mimetype.startsWith('audio/')) {
          voiceUrl = fileUrl;
        } else {
          mediaUrls.push(fileUrl);
        }
      }

      const report = await createReport({
        type: fields.type,
        latitude,
        longitude,
        accuracy: Number(fields.accuracy) || 0,
        description: fields.description,
        responderNumber: fields.responderNumber,
        voiceUrl,
        mediaUrls,
      });

      app.io.emit('new-report', report);
      return reply.code(201).send(report);
    },
  );

  app.get('/reports', async () => {
    return getReports();
  });

  app.get<{ Params: { id: string } }>(
    '/report/:id',
    { schema: { params: UpdateReportStatusParams } },
    async (request, reply) => {
      const report = await getReportById(request.params.id);
      if (!report) return reply.code(404).send({ error: 'Report not found' });
      return report;
    },
  );

  app.patch<{ Params: { id: string }; Body: { status: 'pending' | 'responding' | 'resolved' } }>(
    '/report/:id',
    { schema: { params: UpdateReportStatusParams, body: UpdateReportStatusBody } },
    async (request, reply) => {
      const report = await updateReportStatus(request.params.id, request.body.status);
      if (!report) return reply.code(404).send({ error: 'Report not found' });
      app.io.emit('update-report', report);
      return report;
    },
  );
}