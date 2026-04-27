# Responder App - iPhone Testing Setup

## Quick Start Guide

### 1. Start the Development Server (Network Access)
```bash
cd frontend
npm run dev -- -H 0.0.0.0
```

This allows your iPhone to access the app over your local network.

### 2. Find Your Network IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (WiFi or Ethernet).

**Current Network IP:** `172.20.10.6`

### 3. Access on iPhone

**Responder Page URL:**
```
http://172.20.10.6:3000/responder
```

**Admin Dashboard URL (for tracking):**
```
http://172.20.10.6:3000/admin
```

### 4. Test Responder Login

Use one of these sample responder IDs:
- `FIRE001` - Fire Team Alpha
- `FIRE002` - Fire Team Bravo
- `MED001` - Ambulance Unit 1
- `MED002` - Ambulance Unit 2
- `POLICE001` - Patrol Unit 1
- `POLICE002` - Patrol Unit 2

### 5. Assign Responder to a Report

**Option A: Using SQL (Supabase Dashboard)**
```sql
-- Assign FIRE001 to a fire report
UPDATE responders 
SET current_report_id = 'YOUR_REPORT_ID', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';
```

**Option B: Using Admin Dashboard**
1. Open admin dashboard on desktop: `http://localhost:3000/admin`
2. View a report
3. Change status to "responding"
4. Manually assign responder in database

### 6. Test Location Tracking

**On iPhone (Responder Page):**
1. Login with responder ID (e.g., FIRE001)
2. You should see your assignment
3. Tap "🚀 Start Tracking"
4. Allow location permissions when prompted
5. Your GPS location will update every few seconds

**On Desktop (Admin Dashboard):**
1. Open the same report
2. Click "📍 Track Responders"
3. You should see the responder's location on the map
4. Distance will update in real-time

## Troubleshooting

### iPhone Can't Connect
- Make sure iPhone and computer are on the same WiFi network
- Check firewall settings (allow port 3000)
- Try restarting the dev server with `-H 0.0.0.0`

### Location Not Updating
- Make sure location permissions are enabled on iPhone
- Check browser console for errors
- Verify Supabase connection (check .env file)

### Responder Not Showing on Map
- Verify responder is assigned to the report
- Check that tracking is started on iPhone
- Refresh admin dashboard
- Check browser console for errors

## Database Schema

### Responders Table
```sql
CREATE TABLE responders (
  id UUID PRIMARY KEY,
  responder_id TEXT UNIQUE NOT NULL,  -- "FIRE001", "MED001", etc.
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'fire', 'medical', 'crime'
  phone_number TEXT,
  status TEXT DEFAULT 'available',
  current_report_id UUID REFERENCES reports(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Responder Locations Table
```sql
CREATE TABLE responder_locations (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports(id),
  responder_id UUID REFERENCES responders(id),  -- Links to responders table
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'en_route',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing Workflow

1. **Start servers:**
   ```bash
   # Terminal 1 - Frontend
   cd frontend
   npm run dev -- -H 0.0.0.0
   
   # Terminal 2 - Backend (if needed)
   cd backend
   npm run dev
   ```

2. **Open admin dashboard on desktop:**
   - http://localhost:3000/admin
   - Login as admin
   - Create or select a fire report

3. **Assign responder to report:**
   ```sql
   UPDATE responders 
   SET current_report_id = 'YOUR_REPORT_ID', 
       status = 'assigned' 
   WHERE responder_id = 'FIRE001';
   ```

4. **Open responder page on iPhone:**
   - http://172.20.10.6:3000/responder
   - Login with FIRE001
   - Start tracking

5. **View tracking on admin dashboard:**
   - Click "📍 Track Responders" on the report
   - See responder location update in real-time

## Current Test Report ID
```
7efcce29-6847-41fb-be35-61735e888cc0
```

## Sample SQL Commands

**Assign FIRE001 to test report:**
```sql
UPDATE responders 
SET current_report_id = '7efcce29-6847-41fb-be35-61735e888cc0', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';
```

**Check responder status:**
```sql
SELECT * FROM responders WHERE responder_id = 'FIRE001';
```

**Check responder locations:**
```sql
SELECT * FROM responder_locations 
WHERE report_id = '7efcce29-6847-41fb-be35-61735e888cc0'
ORDER BY updated_at DESC;
```

**Clear assignment:**
```sql
UPDATE responders 
SET current_report_id = NULL, 
    status = 'available' 
WHERE responder_id = 'FIRE001';
```
