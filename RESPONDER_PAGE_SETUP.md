# Responder Mobile Page - Setup Guide

## What Was Created

### ✅ Database Table: `responders`
- Stores responder information (ID, name, type, phone, status)
- Sample responders: FIRE001, FIRE002, MED001, MED002, POLICE001, POLICE002
- Tracks current assignment and status

### ✅ Mobile Page: `/responder`
- Simple login with Responder ID
- Shows current assignment details
- GPS tracking with start/stop controls
- Status updates (En Route, On Scene)
- Distance calculation to emergency
- Auto-arrival detection (within 0.5km)

## Setup Steps

### 1. Run the SQL to Create Responders Table
```bash
# Go to Supabase SQL Editor
# Copy and paste: database/create-responders-table.sql
# Click "Run"
```

This creates:
- `responders` table with sample data
- RLS policies
- Indexes for performance

### 2. Test the Responder Page
```
http://localhost:3000/responder
```

### 3. Login with Sample Responder IDs
- **FIRE001** - Fire Team Alpha
- **FIRE002** - Fire Team Bravo
- **MED001** - Ambulance Unit 1
- **MED002** - Ambulance Unit 2
- **POLICE001** - Patrol Unit 1
- **POLICE002** - Patrol Unit 2

## How It Works

### For Admins (Assigning Responders):
1. Admin needs to assign a responder to a report
2. Update the responder's `current_report_id` in database
3. Responder will see the assignment when they login

### For Responders (In the Field):
1. Open `http://localhost:3000/responder` on mobile
2. Enter Responder ID (e.g., FIRE001)
3. See current assignment
4. Click "🚀 Start Tracking"
5. Allow location permission
6. Location updates every 10 seconds
7. Admin dashboard shows responder on map in real-time!

## Features

### Automatic Features:
- ✅ GPS tracking every 10 seconds
- ✅ Distance calculation to emergency
- ✅ Auto-status change to "On Scene" when within 0.5km
- ✅ Real-time updates to admin dashboard
- ✅ Persistent login (localStorage)

### Manual Controls:
- 🚀 Start/Stop tracking
- 🚗 Update status to "En Route"
- ✅ Update status to "On Scene"
- 🚪 Logout

## Testing Flow

### Step 1: Assign Responder (Admin Side)
Run this SQL to assign FIRE001 to a report:
```sql
-- Get a report ID first
SELECT id, type FROM reports LIMIT 1;

-- Assign responder to that report
UPDATE responders
SET current_report_id = 'YOUR_REPORT_ID_HERE',
    status = 'assigned'
WHERE responder_id = 'FIRE001';
```

### Step 2: Responder Logs In
1. Open `/responder` on mobile
2. Enter: **FIRE001**
3. Click Login
4. See assignment details

### Step 3: Start Tracking
1. Click "🚀 Start Tracking"
2. Allow location permission
3. See distance updating

### Step 4: Admin Views Map
1. Admin opens the report
2. Clicks "📍 Track Responders"
3. Sees FIRE001's location on map in real-time!

## Database Schema

### `responders` table:
```
id                UUID (primary key)
responder_id      TEXT (unique) - e.g., "FIRE001"
name              TEXT - e.g., "Fire Team Alpha"
type              TEXT - fire, medical, crime
phone_number      TEXT
status            TEXT - available, assigned, en_route, on_scene, unavailable
current_report_id UUID (references reports)
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### `responder_locations` table (updated):
```
id            UUID
report_id     UUID (references reports)
responder_id  UUID (references responders) - NEW!
admin_id      UUID (references auth.users) - for admin tracking
latitude      DECIMAL
longitude     DECIMAL
status        TEXT
updated_at    TIMESTAMPTZ
```

## Mobile Optimization

The page is mobile-friendly:
- ✅ Responsive design
- ✅ Large touch targets
- ✅ Dark theme (easy on eyes)
- ✅ Simple interface
- ✅ Works on any smartphone browser

## Next Steps

1. **Run the SQL** to create responders table
2. **Assign a responder** to a test report
3. **Open `/responder`** on your phone or browser
4. **Login and start tracking**
5. **View on admin dashboard** in real-time!

## Production Considerations

For production, you'll want to:
- Add proper authentication (not just ID-based)
- Add responder registration flow
- Add push notifications for new assignments
- Add navigation to emergency location
- Add incident details and notes
- Add photo/video upload from scene
- Add communication with dispatch

But for now, this gives you a working responder tracking system!
