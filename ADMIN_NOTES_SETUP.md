# 💬 Admin Notes/Comments Setup Guide

## Database Setup

### Step 1: Create `report_notes` Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create report_notes table
CREATE TABLE IF NOT EXISTS report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_notes_report_id ON report_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_report_notes_created_at ON report_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE report_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all notes
CREATE POLICY "Admins can view all notes"
  ON report_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can insert notes
CREATE POLICY "Admins can insert notes"
  ON report_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
  );

-- Policy: Admins can update their own notes
CREATE POLICY "Admins can update own notes"
  ON report_notes
  FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Policy: Admins can delete their own notes
CREATE POLICY "Admins can delete own notes"
  ON report_notes
  FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_report_notes_updated_at_trigger ON report_notes;
CREATE TRIGGER update_report_notes_updated_at_trigger
  BEFORE UPDATE ON report_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_report_notes_updated_at();
```

### Step 2: Enable Realtime (Optional)

For real-time note updates:

```sql
-- Enable realtime for report_notes table
ALTER PUBLICATION supabase_realtime ADD TABLE report_notes;
```

## Features

### What Admins Can Do
- ✅ Add notes to any report
- ✅ View all notes on a report (chronological order)
- ✅ Edit their own notes
- ✅ Delete their own notes
- ✅ See who wrote each note and when
- ✅ Real-time updates when other admins add notes

### Note Information
Each note includes:
- Note text (required)
- Admin email (who wrote it)
- Timestamp (when it was created)
- Last updated timestamp (if edited)

### Use Cases
- "Ambulance dispatched at 3:15 PM"
- "Fire truck en route, ETA 5 minutes"
- "Victim transported to City Hospital"
- "Scene secured, no further action needed"
- "Follow-up required with witness"

## Security

### Row Level Security (RLS)
- Only authenticated admins can access notes
- Admins can only edit/delete their own notes
- All admins can view all notes (for coordination)

### Validation
- Note text is required (cannot be empty)
- Admin ID must match authenticated user
- Report ID must exist in reports table

## Testing Checklist

After running the SQL:

- [ ] Table created successfully
- [ ] Indexes created
- [ ] RLS policies active
- [ ] Can add note to report
- [ ] Can view notes on report
- [ ] Can edit own note
- [ ] Can delete own note
- [ ] Cannot edit other admin's notes
- [ ] Cannot delete other admin's notes
- [ ] Real-time updates work (if enabled)

## Troubleshooting

### Cannot Add Notes
- Check if admin_profiles table has entry for user
- Verify user is authenticated
- Check RLS policies are enabled

### Cannot See Notes
- Verify SELECT policy is active
- Check if user has admin profile
- Look for errors in browser console

### Real-time Not Working
- Ensure realtime is enabled for table
- Check Supabase realtime connection
- Verify subscription is active

---

**Status**: Ready to implement
**Next**: Update frontend to add notes UI
**Time**: 5 minutes to run SQL
