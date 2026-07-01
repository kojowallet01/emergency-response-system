-- ============================================
-- DEPLOY ALL NEW FEATURES
-- Run this script in Supabase SQL Editor
-- ============================================

-- Feature 1: Chat Read Receipts
-- ============================================

-- Add columns to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT,
  typing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- Enable RLS
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policies for typing indicators
DROP POLICY IF EXISTS "Anyone authenticated can view typing indicators" ON chat_typing_indicators;
CREATE POLICY "Anyone authenticated can view typing indicators"
  ON chat_typing_indicators FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own typing indicator" ON chat_typing_indicators;
CREATE POLICY "Users can manage their own typing indicator"
  ON chat_typing_indicators FOR ALL
  TO authenticated
  USING (admin_id = auth.uid());

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = TRUE,
      read_at = NOW()
  WHERE recipient_id IS NULL  -- Group messages
    AND admin_id != user_id   -- Don't mark own messages
    AND is_read = FALSE;      -- Only unread
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_typing_indicators
  WHERE created_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read, admin_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_created ON chat_typing_indicators(created_at);

-- Feature 2: Evidence Annotations
-- ============================================

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
DROP POLICY IF EXISTS "Authenticated users can view evidence annotations" ON evidence_annotations;
CREATE POLICY "Authenticated users can view evidence annotations"
  ON evidence_annotations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create evidence annotations" ON evidence_annotations;
CREATE POLICY "Authenticated users can create evidence annotations"
  ON evidence_annotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update evidence annotations" ON evidence_annotations;
CREATE POLICY "Authenticated users can update evidence annotations"
  ON evidence_annotations FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete evidence annotations" ON evidence_annotations;
CREATE POLICY "Authenticated users can delete evidence annotations"
  ON evidence_annotations FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_evidence_annotations_evidence ON evidence_annotations(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_annotations_report ON evidence_annotations(report_id);

-- Feature 3: AI Predictions (Enhanced)
-- ============================================

-- Drop existing table if you need to recreate (WARNING: This deletes data!)
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
DROP POLICY IF EXISTS "Authenticated users can view AI predictions" ON ai_predictions;
CREATE POLICY "Authenticated users can view AI predictions"
  ON ai_predictions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create AI predictions" ON ai_predictions;
CREATE POLICY "Authenticated users can create AI predictions"
  ON ai_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update AI predictions" ON ai_predictions;
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

-- ============================================
-- DEPLOYMENT COMPLETE!
-- ============================================

-- Verify tables were created
SELECT 'chat_typing_indicators' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'chat_typing_indicators'
UNION ALL
SELECT 'evidence_annotations', COUNT(*) FROM information_schema.tables WHERE table_name = 'evidence_annotations'
UNION ALL
SELECT 'ai_predictions', COUNT(*) FROM information_schema.tables WHERE table_name = 'ai_predictions';

-- Verify columns were added
SELECT 'chat_messages.is_read' as column_check, COUNT(*) as exists FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'is_read'
UNION ALL
SELECT 'chat_messages.read_at', COUNT(*) FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'read_at'
UNION ALL
SELECT 'chat_messages.delivered_at', COUNT(*) FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'delivered_at';
