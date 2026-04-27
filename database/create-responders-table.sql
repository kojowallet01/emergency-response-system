-- Create responders table for field personnel
CREATE TABLE IF NOT EXISTS responders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  responder_id TEXT UNIQUE NOT NULL, -- Simple ID like "FIRE001", "MED001"
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fire', 'medical', 'crime')),
  phone_number TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'en_route', 'on_scene', 'unavailable')),
  current_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_responders_responder_id ON responders(responder_id);
CREATE INDEX IF NOT EXISTS idx_responders_type ON responders(type);
CREATE INDEX IF NOT EXISTS idx_responders_status ON responders(status);

-- Enable RLS
ALTER TABLE responders ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view responders (for assignment)
CREATE POLICY "Anyone can view responders"
ON responders FOR SELECT
TO authenticated
USING (true);

-- Policy: Admins can insert/update responders
CREATE POLICY "Admins can manage responders"
ON responders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
  )
);

-- Update responder_locations to reference responders table
ALTER TABLE responder_locations
ADD COLUMN IF NOT EXISTS responder_id UUID REFERENCES responders(id) ON DELETE CASCADE;

-- Create index for responder_id
CREATE INDEX IF NOT EXISTS idx_responder_locations_responder_id ON responder_locations(responder_id);

-- Insert sample responders for testing
INSERT INTO responders (responder_id, name, type, phone_number) VALUES
('FIRE001', 'Fire Team Alpha', 'fire', '+233501234567'),
('FIRE002', 'Fire Team Bravo', 'fire', '+233501234568'),
('MED001', 'Ambulance Unit 1', 'medical', '+233501234569'),
('MED002', 'Ambulance Unit 2', 'medical', '+233501234570'),
('POLICE001', 'Patrol Unit 1', 'crime', '+233501234571'),
('POLICE002', 'Patrol Unit 2', 'crime', '+233501234572')
ON CONFLICT (responder_id) DO NOTHING;

-- Verify
SELECT * FROM responders ORDER BY type, responder_id;
