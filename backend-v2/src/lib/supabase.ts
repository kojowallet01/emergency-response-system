import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from './logger';

const globalForSupabase = globalThis as unknown as { supabase?: SupabaseClient };

export const supabase: SupabaseClient =
  globalForSupabase.supabase ??
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
  logger.info('Supabase client initialized');
}