import type { FastifyInstance } from 'fastify';
import {
  formatPhoneNumber,
  sendBulkSMS,
  sendEmergencyAlert,
  sendSMS,
  sendStatusChangeAlert,
  validatePhoneNumber,
} from '../services/smsService';
import {
  BulkSmsBody,
  EmergencyAlertBody,
  SendSmsBody,
  StatusChangeBody,
  ValidatePhoneBody,
} from '../schemas';

interface ReportBody {
  type: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  created_at?: string;
  [key: string]: unknown;
}

export default async function smsRoutes(app: FastifyInstance) {
  app.post<{ Body: { phoneNumber: string; message: string } }>(
    '/sms/test',
    { schema: { body: SendSmsBody } },
    async (request, reply) => {
      const formatted = formatPhoneNumber(request.body.phoneNumber);
      if (!validatePhoneNumber(formatted)) {
        return reply.code(400).send({ error: 'Invalid phone number format. Use E.164 format: +233XXXXXXXXX' });
      }

      const result = await sendSMS(formatted, request.body.message);
      if (result.success) {
        return { success: true, message: 'SMS sent successfully', sid: result.sid };
      }
      return reply.code(500).send({ success: false, error: result.error });
    },
  );

  app.post<{ Body: { phoneNumbers: string[]; report: ReportBody } }>(
    '/sms/emergency-alert',
    { schema: { body: EmergencyAlertBody } },
    async (request, reply) => {
      const formatted = request.body.phoneNumbers.map((n) => formatPhoneNumber(n));
      const invalid = formatted.filter((n) => !validatePhoneNumber(n));
      if (invalid.length) {
        return reply.code(400).send({ error: 'Invalid phone numbers', invalidNumbers: invalid });
      }

      const results = await sendEmergencyAlert(formatted, request.body.report);
      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return { success: true, sent, failed, results };
    },
  );

  app.post<{ Body: { phoneNumbers: string[]; report: ReportBody; oldStatus: string; newStatus: string } }>(
    '/sms/status-change',
    { schema: { body: StatusChangeBody } },
    async (request, reply) => {
      const formatted = request.body.phoneNumbers.map((n) => formatPhoneNumber(n));
      const invalid = formatted.filter((n) => !validatePhoneNumber(n));
      if (invalid.length) {
        return reply.code(400).send({ error: 'Invalid phone numbers', invalidNumbers: invalid });
      }

      const results = await sendStatusChangeAlert(formatted, request.body.report, request.body.oldStatus, request.body.newStatus);
      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return { success: true, sent, failed, results };
    },
  );

  app.post<{ Body: { phoneNumbers: string[]; message: string } }>(
    '/sms/bulk',
    { schema: { body: BulkSmsBody } },
    async (request, reply) => {
      const formatted = request.body.phoneNumbers.map((n) => formatPhoneNumber(n));
      const invalid = formatted.filter((n) => !validatePhoneNumber(n));
      if (invalid.length) {
        return reply.code(400).send({ error: 'Invalid phone numbers', invalidNumbers: invalid });
      }

      const results = await sendBulkSMS(formatted, request.body.message);
      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return { success: true, sent, failed, results };
    },
  );

  app.post<{ Body: { phoneNumber: string } }>(
    '/sms/validate',
    { schema: { body: ValidatePhoneBody } },
    async (request) => {
      const formatted = formatPhoneNumber(request.body.phoneNumber);
      const valid = validatePhoneNumber(formatted);
      return {
        valid,
        formatted: valid ? formatted : null,
        original: request.body.phoneNumber,
      };
    },
  );
}