-- Create evidence annotations table

CREATE TABLE IF NOT EXISTS evidence_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id UUID NOT NULL UNIQUE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE evidence_annotations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view evidence annotations"
  ON evidence_annotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create evidence annotations"
  ON evidence_annotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update evidence annotations"
  ON evidence_annotations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete evidence annotations"
  ON evidence_annotations FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_evidence_annotations_evidence ON evidence_annotations(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_annotations_report ON evidence_annotations(report_id);

COMMENT ON TABLE evidence_annotations IS 'Stores drawing annotations for evidence files';
COMMENT ON COLUMN evidence_annotations.annotations IS 'JSONB array of annotation objects (tools, colors, positions)';
