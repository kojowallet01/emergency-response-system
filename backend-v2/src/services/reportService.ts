import { supabase } from '../lib/supabase';

type ReportRow = {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  description: string | null;
  responder_number: string | null;
  voice_url: string | null;
  media_urls: string[];
  media_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export interface CreateReportInput {
  type: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  description?: string;
  responderNumber?: string;
  voiceUrl?: string | null;
  mediaUrls: string[];
}

export async function createReport(input: CreateReportInput) {
  const { data, error } = await supabase
    .from('reports')
    .insert([
      {
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? 0,
        description: input.description,
        responder_number: input.responderNumber,
        voice_url: input.voiceUrl,
        media_urls: input.mediaUrls,
        media_count: input.mediaUrls.length,
        status: 'pending',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as ReportRow;
}

export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ReportRow[];
}

export async function getReportById(id: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ReportRow | null;
}

export async function updateReportStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ReportRow | null;
}

export type { ReportRow };