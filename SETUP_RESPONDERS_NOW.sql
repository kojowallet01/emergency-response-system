CREATE TABLE IF NOT EXISTS responders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  responder_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fire', 'medical', 'crime')),
  phone_number TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'en_route', 'on_scene', 'unavailable')),
  current_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responders_responder_id ON responders(responder_id);
CREATE INDEX IF NOT EXISTS idx_responders_type ON responders(type);
CREATE INDEX IF NOT EXISTS idx_responders_status ON responders(status);

ALTER TABLE responders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view responders"
ON responders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage responders"
ON responders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
  )
);

ALTER TABLE responder_locations
ADD COLUMN IF NOT EXISTS responder_id UUID REFERENCES responders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_responder_locations_responder_id ON responder_locations(responder_id);

INSERT INTO responders (responder_id, name, type, phone_number) VALUES
('FIRE001', 'Fire Team Alpha', 'fire', '+233501234567'),
('FIRE002', 'Fire Team Bravo', 'fire', '+233501234568'),
('MED001', 'Ambulance Unit 1', 'medical', '+233501234569'),
('MED002', 'Ambulance Unit 2', 'medical', '+233501234570'),
('POLICE001', 'Patrol Unit 1', 'crime', '+233501234571'),
('POLICE002', 'Patrol Unit 2', 'crime', '+233501234572')
ON CONFLICT (responder_id) DO NOTHING;

SELECT 
  '✅ Setup Complete!' as status,
  COUNT(*) as responder_count,
  STRING_AGG(responder_id, ', ' ORDER BY responder_id) as responder_ids
FROM responders;

SELECT * FROM responders ORDER BY type, responder_id;
