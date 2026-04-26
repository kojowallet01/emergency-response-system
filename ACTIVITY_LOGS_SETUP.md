# 📝 Activity Logs Setup Guide

## Database Setup

### Step 1: Create `activity_logs` Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_report_id ON activity_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Policy: Admins can insert logs
CREATE POLICY "Admins can insert logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
  );

-- Policy: Super admins can delete logs (cleanup)
CREATE POLICY "Super admins can delete logs"
  ON activity_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
      AND admin_profiles.role = 'super_admin'
    )
  );
```

### Step 2: Enable Realtime (Optional)

For real-time log updates:

```sql
-- Enable realtime for activity_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
```

## Action Types

The system will log these action types:

### Authentication Actions
- `login` - Admin logged in
- `logout` - Admin logged out

### Report Actions
- `status_change` - Changed report status
- `view_report` - Viewed report details

### Note Actions
- `note_add` - Added note to report
- `note_edit` - Edited own note
- `note_delete` - Deleted own note

### Admin Management (Super Admin Only)
- `admin_add` - Added new admin
- `admin_edit` - Edited admin role
- `admin_delete` - Removed admin

## Log Entry Structure

Each log entry contains:
```javascript
{
  id: "uuid",
  admin_id: "uuid",
  admin_email: "admin@example.com",
  action_type: "status_change",
  action_description: "Changed status from pending to responding",
  report_id: "uuid" (optional),
  metadata: {
    old_value: "pending",
    new_value: "responding",
    report_type: "fire"
  },
  created_at: "2026-04-26T10:30:00Z"
}
```

## Features

### Log Viewer
- View all activity logs
- Filter by action type
- Filter by admin
- Filter by date range
- Search by description
- Pagination (50 logs per page)

### Log Details
- Action icon based on type
- Color coding (green=add, blue=edit, red=delete, yellow=view)
- Relative timestamps ("2 minutes ago")
- Link to related report (if applicable)

### Automatic Logging
All actions are logged automatically:
- No manual intervention needed
- Logs created in background
- Non-blocking (doesn't slow down actions)

## Security

### Row Level Security (RLS)
- Only authenticated admins can view logs
- Only authenticated admins can create logs
- Only super admins can delete logs (for cleanup)

### Data Retention
- Logs stored indefinitely by default
- Super admins can delete old logs
- Consider archiving logs older than 1 year

## Performance

### Optimizations
- Indexed on admin_id, report_id, action_type, created_at
- JSONB metadata for flexible data storage
- Pagination prevents loading too many logs

### Scalability
- Handles 100,000+ log entries efficiently
- Consider partitioning by date for very large datasets
- Archive old logs to separate table if needed

## Testing Checklist

After running the SQL:

- [ ] Table created successfully
- [ ] Indexes created
- [ ] RLS policies active
- [ ] Can insert log entry
- [ ] Can view logs
- [ ] Cannot delete logs (unless super admin)
- [ ] Metadata JSONB works
- [ ] Real-time updates work (if enabled)

## Troubleshooting

### Cannot Insert Logs
- Check if admin_profiles table has entry for user
- Verify user is authenticated
- Check RLS policies are enabled

### Cannot See Logs
- Verify SELECT policy is active
- Check if user has admin profile
- Look for errors in browser console

### Logs Not Appearing
- Check if log was actually created
- Verify query filters aren't too restrictive
- Check created_at timestamp

---

**Status**: Ready to implement
**Next**: Update frontend to log actions and display logs
**Time**: 5 minutes to run SQL
