# Database Setup Instructions

## Overview

This directory contains SQL scripts for setting up the advanced admin features database schema in Supabase.

## Files

- `advanced-features-schema.sql` - Complete schema for all 4 new tables and admin_profiles updates

## Setup Steps

### 1. Run the SQL Script in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `advanced-features-schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the script

### 2. Verify Tables Were Created

After running the script, you should see verification output showing:
- 4 new tables created: `chat_messages`, `responder_locations`, `evidence_files`, `ai_predictions`
- Indexes created for performance
- RLS (Row Level Security) enabled on all tables

You can also verify in the **Table Editor**:
- Click **Table Editor** in the left sidebar
- You should see the 4 new tables listed

### 3. Enable Realtime (Important!)

The script attempts to enable realtime, but you should verify:

1. Go to **Database** → **Replication** in Supabase dashboard
2. Find these tables and ensure they're enabled for realtime:
   - `chat_messages` ✓
   - `responder_locations` ✓

### 4. Create Storage Bucket

The SQL script creates tables, but storage buckets must be created via the dashboard:

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Bucket name: `evidence-files`
4. Set to **Public bucket** (checked)
5. Click **Create bucket**

### 5. Set Storage Policies

After creating the bucket, set up access policies:

1. Click on the `evidence-files` bucket
2. Go to **Policies** tab
3. Click **New policy**

**Policy 1: Admins can upload evidence**
- Policy name: `Admins can upload evidence`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition:
```sql
bucket_id = 'evidence-files' AND
EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid()
)
```

**Policy 2: Admins can view evidence**
- Policy name: `Admins can view evidence`
- Allowed operation: `SELECT`
- Target roles: `authenticated`
- Policy definition:
```sql
bucket_id = 'evidence-files' AND
EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid()
)
```

## Tables Created

### 1. chat_messages
Real-time admin-to-admin communication
- Columns: id, admin_id, message, created_at
- RLS: Admins can view and insert messages
- Realtime: Enabled

### 2. responder_locations
Real-time responder tracking
- Columns: id, report_id, responder_id, latitude, longitude, status, created_at, updated_at
- RLS: Admins can view all, responders can update own
- Realtime: Enabled
- Trigger: Auto-update updated_at timestamp

### 3. evidence_files
Photo and video evidence management
- Columns: id, report_id, file_url, file_type, file_name, file_size, uploaded_by, annotations, created_at
- RLS: Admins can view and upload
- Storage: Links to evidence-files bucket

### 4. ai_predictions
AI-powered emergency classification
- Columns: id, report_id, predicted_type, severity, expected_response_time, risk_score, recommended_actions, confidence_score, created_at
- RLS: Admins can view and insert

### 5. admin_profiles (updated)
Added columns for responder tracking:
- last_seen (TIMESTAMPTZ) - For online status
- last_known_lat (DECIMAL) - Last known latitude
- last_known_lon (DECIMAL) - Last known longitude

## Helper Functions

### find_nearby_reports()
Finds reports within a specified radius (for duplicate detection)
- Parameters: lat, lon, radius_km, report_type, exclude_id
- Returns: Nearby reports with distance calculations

## Troubleshooting

### Error: "relation already exists"
If you see this error, the tables already exist. You can either:
1. Drop the existing tables first (⚠️ this will delete data)
2. Skip the CREATE TABLE statements

### Error: "permission denied"
Make sure you're running the script as a user with sufficient privileges (usually the project owner).

### Realtime not working
1. Check that realtime is enabled in Database → Replication
2. Verify the tables are listed and enabled
3. Try toggling realtime off and on again

## Next Steps

After completing the database setup:
1. ✅ Verify all tables exist in Table Editor
2. ✅ Verify realtime is enabled for chat_messages and responder_locations
3. ✅ Verify evidence-files storage bucket exists with policies
4. ✅ Test by inserting sample data
5. ➡️ Proceed to Task 2: Implement Auto-Refresh Toggle feature
