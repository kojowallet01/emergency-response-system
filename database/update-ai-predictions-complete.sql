-- Update AI Predictions table with complete schema

-- Drop existing table if needed (in development only!)
-- DROP TABLE IF EXISTS ai_predictions CASCADE;

-- Create comprehensive AI predictions table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  predicted_type TEXT,
  severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 5),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  estimated_response_time INTEGER, -- in minutes
  required_resources TEXT[],
  ai_summary TEXT,
  keywords TEXT[],
  recommendations TEXT[],
  model_version TEXT DEFAULT 'gpt-3.5-turbo',
  was_corrected BOOLEAN DEFAULT FALSE,
  admin_correction TEXT,
  corrected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view AI predictions"
  ON ai_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create AI predictions"
  ON ai_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update AI predictions"
  ON ai_predictions FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_predictions_report ON ai_predictions(report_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(predicted_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_severity ON ai_predictions(severity_score);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_corrected ON ai_predictions(was_corrected);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created ON ai_predictions(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS ai_predictions_updated_at ON ai_predictions;
CREATE TRIGGER ai_predictions_updated_at
  BEFORE UPDATE ON ai_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_predictions_updated_at();

-- Comments for documentation
COMMENT ON TABLE ai_predictions IS 'AI-powered emergency classification and predictions';
COMMENT ON COLUMN ai_predictions.predicted_type IS 'AI-predicted emergency type (fire, medical, crime)';
COMMENT ON COLUMN ai_predictions.severity_score IS 'Severity rating from 1 (minor) to 5 (critical)';
COMMENT ON COLUMN ai_predictions.confidence_score IS 'AI confidence percentage (0-100)';
COMMENT ON COLUMN ai_predictions.urgency_level IS 'Urgency assessment (low, medium, high, critical)';
COMMENT ON COLUMN ai_predictions.estimated_response_time IS 'Estimated response time in minutes';
COMMENT ON COLUMN ai_predictions.required_resources IS 'Array of required resources';
COMMENT ON COLUMN ai_predictions.ai_summary IS 'AI-generated summary of the emergency';
COMMENT ON COLUMN ai_predictions.keywords IS 'Array of extracted keywords';
COMMENT ON COLUMN ai_predictions.recommendations IS 'Array of AI recommendations';
COMMENT ON COLUMN ai_predictions.was_corrected IS 'Whether admin corrected the AI prediction';
COMMENT ON COLUMN ai_predictions.admin_correction IS 'Admin's corrected classification';
