import { z } from 'zod';

export const ReportType = z.enum(['fire', 'medical', 'crime']);
export const ReportStatus = z.enum(['pending', 'responding', 'resolved']);

export const ReportSchema = z.object({
  id: z.string(),
  type: ReportType,
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  description: z.string().nullable().optional(),
  responderNumber: z.string().nullable().optional(),
  voiceUrl: z.string().nullable().optional(),
  mediaUrls: z.array(z.string()),
  mediaCount: z.number(),
  status: ReportStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UpdateReportStatusParams = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const;

export const UpdateReportStatusBody = {
  type: 'object',
  properties: { status: { type: 'string', enum: ['pending', 'responding', 'resolved'] } },
  required: ['status'],
} as const;

export const GeocodeSuggestQuery = {
  type: 'object',
  properties: { q: { type: 'string', minLength: 1 } },
  required: ['q'],
} as const;

export const GeocodeResolveQuery = {
  type: 'object',
  properties: { address: { type: 'string', minLength: 1 } },
  required: ['address'],
} as const;

export const SendSmsBody = {
  type: 'object',
  properties: {
    phoneNumber: { type: 'string', pattern: '^\\+?[0-9]{8,15}$' },
    message: { type: 'string', minLength: 1 },
  },
  required: ['phoneNumber', 'message'],
} as const;

export const BulkSmsBody = {
  type: 'object',
  properties: {
    phoneNumbers: { type: 'array', items: { type: 'string' }, minItems: 1 },
    message: { type: 'string', minLength: 1 },
  },
  required: ['phoneNumbers', 'message'],
} as const;

export const EmergencyAlertBody = {
  type: 'object',
  properties: {
    phoneNumbers: { type: 'array', items: { type: 'string' }, minItems: 1 },
    report: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        description: { type: 'string' },
        created_at: { type: 'string' },
      },
      required: ['type'],
    },
  },
  required: ['phoneNumbers', 'report'],
} as const;

export const StatusChangeBody = {
  type: 'object',
  properties: {
    phoneNumbers: { type: 'array', items: { type: 'string' }, minItems: 1 },
    report: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
      required: ['type'],
    },
    oldStatus: { type: 'string' },
    newStatus: { type: 'string' },
  },
  required: ['phoneNumbers', 'report', 'oldStatus', 'newStatus'],
} as const;

export const ValidatePhoneBody = {
  type: 'object',
  properties: { phoneNumber: { type: 'string' } },
  required: ['phoneNumber'],
} as const;