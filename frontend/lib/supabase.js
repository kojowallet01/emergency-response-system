import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to upload file to Supabase Storage
export async function uploadFile(file, bucket = 'emergency media') {
  try {
    console.log('🔵 Starting upload:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('🔵 Uploading to path:', filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('✅ Public URL:', publicUrl);

    return publicUrl;
  } catch (err) {
    console.error('❌ File upload failed:', err);
    // Return null if upload fails, don't block the report
    return null;
  }
}

// Helper function to create report
export async function createReport(reportData) {
  const { data, error } = await supabase
    .from('reports')
    .insert([reportData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to get all reports
export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Helper function to update report status
export async function updateReportStatus(id, status) {
  const { data, error } = await supabase
    .from('reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Subscribe to real-time changes
export function subscribeToReports(callback) {
  const subscription = supabase
    .channel('reports-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
}
