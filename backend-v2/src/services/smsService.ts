import twilio, { type Twilio } from 'twilio';
import { env } from '../config/env';
import { logger } from '../lib/logger';

let client: Twilio | null = null;

function getClient(): Twilio | null {
  if (client) return client;

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio credentials not configured. SMS notifications disabled.');
    return null;
  }

  try {
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    logger.info('Twilio SMS service initialized');
    return client;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Twilio');
    return null;
  }
}

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export interface SmsRecipientResult extends SmsResult {
  phoneNumber: string;
}

export async function sendSMS(to: string, message: string): Promise<SmsResult> {
  const tw = getClient();

  if (!tw) {
    return { success: false, error: 'Twilio not configured' };
  }

  if (!env.TWILIO_PHONE_NUMBER) {
    logger.error('TWILIO_PHONE_NUMBER not configured');
    return { success: false, error: 'Twilio phone number not configured' };
  }

  try {
    const result = await tw.messages.create({
      body: message,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info({ to, sid: result.sid }, 'SMS sent');
    return { success: true, sid: result.sid };
  } catch (error) {
    logger.error({ to, err: error }, 'SMS send failed');
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

interface ReportLike {
  [key: string]: unknown;
  type: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  created_at?: Date | string | null;
}

const reportTypeEmoji: Record<string, string> = {
  fire: 'FIRE',
  medical: 'MEDICAL',
  crime: 'CRIME',
};

export async function sendEmergencyAlert(phoneNumbers: string[], report: ReportLike): Promise<SmsRecipientResult[]> {
  const type = typeof report.type === 'string' ? reportTypeEmoji[report.type] ?? report.type.toUpperCase() : 'EMERGENCY';
  const location = `${Number(report.latitude ?? 0).toFixed(4)}, ${Number(report.longitude ?? 0).toFixed(4)}`;
  const time = report.created_at ? new Date(report.created_at).toLocaleString() : new Date().toLocaleString();

  const message = [
    'EMERGENCY ALERT!',
    '',
    `${type} Emergency Reported`,
    '',
    `Location: ${location}`,
    report.description ? `Details: ${report.description}` : '',
    `Time: ${time}`,
    '',
    'Respond immediately!',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return sendToMany(phoneNumbers, message);
}

export async function sendStatusChangeAlert(
  phoneNumbers: string[],
  report: ReportLike,
  oldStatus: string,
  newStatus: string,
): Promise<SmsRecipientResult[]> {
  const statusEmoji = ['pending', 'responding', 'resolved'].includes(newStatus) ? newStatus : 'pending';
  const location = `${Number(report.latitude ?? 0).toFixed(4)}, ${Number(report.longitude ?? 0).toFixed(4)}`;
  const reportType = typeof report.type === 'string' ? report.type.toUpperCase() : 'EMERGENCY';

  const message = [
    'Status Update',
    '',
    `${reportType} Emergency`,
    '',
    `Status: ${oldStatus.toUpperCase()} -> ${statusEmoji.toUpperCase()}`,
    '',
    `Location: ${location}`,
    `Time: ${new Date().toLocaleString()}`,
  ].join('\n');

  return sendToMany(phoneNumbers, message);
}

export async function sendBulkSMS(phoneNumbers: string[], message: string): Promise<SmsRecipientResult[]> {
  return sendToMany(phoneNumbers, message);
}

async function sendToMany(phoneNumbers: string[], message: string): Promise<SmsRecipientResult[]> {
  const results: SmsRecipientResult[] = [];

  for (const phoneNumber of phoneNumbers) {
    const result = await sendSMS(phoneNumber, message);
    results.push({ phoneNumber, ...result });
  }

  return results;
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export function validatePhoneNumber(phoneNumber: string): boolean {
  return E164_REGEX.test(phoneNumber);
}

export function formatPhoneNumber(phoneNumber: string, countryCode = '+233'): string {
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  const cleaned = phoneNumber.replace(/\D/g, '').replace(/^0/, '');
  return `${countryCode}${cleaned}`;
}