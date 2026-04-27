-- Advanced Admin Features Database Schema
-- Tables: chat_messages, responder_locations, evidence_files, ai_predictions

-- 1. CHAT MESSAGES TABLE

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_admin_id ON chat_messages(admin_id);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON chat_messages;

-- Policy: Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can insert messages
CREATE POLICY "Admins can insert messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 2. RESPONDER LOCATIONS TABLE

CREATE TABLE IF NOT EXISTS responder_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('en_route', 'on_scene', 'returning')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_responder_locations_report_id ON responder_locations(report_id);
CREATE INDEX IF NOT EXISTS idx_responder_locations_responder_id ON responder_locations(responder_id);
CREATE INDEX IF NOT EXISTS idx_responder_locations_updated_at ON responder_locations(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE responder_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all locations" ON responder_locations;
DROP POLICY IF EXISTS "Responders can update own location" ON responder_locations;

-- Policy: Admins can view all locations
CREATE POLICY "Admins can view all locations"
  ON responder_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Responders can update their own location
CREATE POLICY "Responders can update own location"
  ON responder_locations
  FOR ALL
  TO authenticated
  USING (responder_id = auth.uid())
  WITH CHECK (responder_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE responder_locations;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_responder_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_responder_locations_updated_at_trigger ON responder_locations;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_responder_locations_updated_at_trigger
  BEFORE UPDATE ON responder_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_responder_locations_updated_at();

-- 3. EVIDENCE FILES TABLE

CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_files_report_id ON evidence_files(report_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_created_at ON evidence_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_files_uploaded_by ON evidence_files(uploaded_by);

-- Enable Row Level Security
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all evidence" ON evidence_files;
DROP POLICY IF EXISTS "Admins can upload evidence" ON evidence_files;

-- Policy: Admins can view all evidence
CREATE POLICY "Admins can view all evidence"
  ON evidence_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can upload evidence
CREATE POLICY "Admins can upload evidence"
  ON evidence_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- 4. AI PREDICTIONS TABLE

CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  predicted_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  expected_response_time INTEGER NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  recommended_actions TEXT,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_predictions_report_id ON ai_predictions(report_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created_at ON ai_predictions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all predictions" ON ai_predictions;
DROP POLICY IF EXISTS "System can insert predictions" ON ai_predictions;

-- Policy: Admins can view all predictions
CREATE POLICY "Admins can view all predictions"
  ON ai_predictions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: System can insert predictions
CREATE POLICY "System can insert predictions"
  ON ai_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- 5. UPDATE ADMIN_PROFILES TABLE

-- Add columns for responder tracking and online status
ALTER TABLE admin_profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS last_known_lon DECIMAL(11, 8);

-- Index for online status queries
CREATE INDEX IF NOT EXISTS idx_admin_profiles_last_seen ON admin_profiles(last_seen DESC);

-- 6. HELPER FUNCTIONS

-- Function to find nearby reports (for duplicate detection)
CREATE OR REPLACE FUNCTION find_nearby_reports(
  lat DECIMAL,
  lon DECIMAL,
  radius_km DECIMAL,
  report_type TEXT,
  exclude_id UUID
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.type,
    r.description,
    r.latitude,
    r.longitude,
    (
      6371 * acos(
        cos(radians(lat)) * 
        cos(radians(r.latitude)) * 
        cos(radians(r.longitude) - radians(lon)) + 
        sin(radians(lat)) * 
        sin(radians(r.latitude))
      )
    ) AS distance_km,
    r.created_at
  FROM reports r
  WHERE r.type = report_type
    AND r.id != exclude_id
    AND (
      6371 * acos(
        cos(radians(lat)) * 
        cos(radians(r.latitude)) * 
        cos(radians(r.longitude) - radians(lon)) + 
        sin(radians(lat)) * 
        sin(radians(r.latitude))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- VERIFICATION QUERIES

-- Verify all tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('chat_messages', 'responder_locations', 'evidence_files', 'ai_predictions')
ORDER BY table_name;

-- Verify indexes were created
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('chat_messages', 'responder_locations', 'evidence_files', 'ai_predictions', 'admin_profiles')
ORDER BY tablename, indexname;

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chat_messages', 'responder_locations', 'evidence_files', 'ai_predictions')
ORDER BY tablename;

-- SETUP COMPLETE
-- All tables, indexes, RLS policies, and functions have been created.

