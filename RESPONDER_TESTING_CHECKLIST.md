# Responder Tracking - iPhone Testing Checklist

## Pre-Testing Setup

### 1. Start Development Server
```bash
cd frontend
npm run dev -- -H 0.0.0.0
```

**Expected Output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 2. Verify Network IP
```bash
ipconfig
```

**Current IP:** `172.20.10.6`

### 3. Verify Database Setup

Run in Supabase SQL Editor:
```sql
-- Check responders exist
SELECT * FROM responders ORDER BY type, responder_id;

-- Check responder_locations has responder_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'responder_locations';
```

**Expected:** 6 responders (FIRE001, FIRE002, MED001, MED002, POLICE001, POLICE002)

## Testing Steps

### Phase 1: Desktop Setup (Admin Dashboard)

1. **Open Admin Dashboard**
   - URL: `http://localhost:3000/admin`
   - Login with admin credentials
   - ✅ Dashboard loads successfully

2. **Select or Create Fire Report**
   - Click on a fire emergency report
   - Note the Report ID (you'll need this)
   - ✅ Report details modal opens

3. **Assign Responder to Report**
   - Open Supabase SQL Editor
   - Run:
     ```sql
     UPDATE responders 
     SET current_report_id = 'YOUR_REPORT_ID', 
         status = 'assigned' 
     WHERE responder_id = 'FIRE001';
     ```
   - ✅ Query executes successfully

4. **Verify Assignment**
   ```sql
   SELECT r.responder_id, r.name, r.status, r.current_report_id
   FROM responders r
   WHERE r.responder_id = 'FIRE001';
   ```
   - ✅ Shows assigned status and report ID

### Phase 2: iPhone Setup (Responder App)

5. **Connect iPhone to Same WiFi**
   - Ensure iPhone is on same network as computer
   - ✅ Connected to same WiFi

6. **Open Responder Page on iPhone**
   - URL: `http://172.20.10.6:3000/responder`
   - ✅ Page loads on iPhone

7. **Login as Responder**
   - Enter: `FIRE001`
   - Tap "Login"
   - ✅ Login successful
   - ✅ Assignment details displayed

8. **Verify Assignment Display**
   - Check assignment card shows:
     - Type: Fire Emergency
     - Status: (report status)
     - Location coordinates
   - ✅ All details correct

9. **Enable Location Tracking**
   - Tap "🚀 Start Tracking"
   - Allow location permissions when prompted
   - ✅ "📍 Tracking Active" displayed
   - ✅ Current coordinates shown

### Phase 3: Real-Time Tracking Verification

10. **Check Admin Dashboard**
    - On desktop, click "📍 Track Responders" button
    - ✅ Responder tracking modal opens

11. **Verify Responder Appears in List**
    - Check "Active Responders" section
    - Should show:
      - Name: "Fire Team Alpha"
      - ID: FIRE001
      - Status: en_route (orange indicator)
      - Distance: X.XX km
    - ✅ Responder listed correctly

12. **Verify Map Display**
    - Check map shows:
      - Red emergency marker (🚨)
      - Green/orange responder marker (🚑)
    - ✅ Both markers visible

13. **Test Real-Time Updates**
    - Move with iPhone (walk around)
    - Watch admin dashboard
    - ✅ Responder marker moves on map
    - ✅ Distance updates automatically
    - ✅ Updates happen within 5-10 seconds

14. **Test Status Updates**
    - On iPhone, tap "🚗 En Route" button
    - Check admin dashboard
    - ✅ Status changes to "En Route"
    - ✅ Indicator turns orange

15. **Test Arrival Detection**
    - If possible, get within 500m of emergency location
    - OR manually update location in database:
      ```sql
      UPDATE responder_locations
      SET latitude = (SELECT latitude FROM reports WHERE id = 'YOUR_REPORT_ID'),
          longitude = (SELECT longitude FROM reports WHERE id = 'YOUR_REPORT_ID'),
          status = 'on_scene'
      WHERE responder_id = (SELECT id FROM responders WHERE responder_id = 'FIRE001');
      ```
    - ✅ Status automatically changes to "On Scene"
    - ✅ Indicator turns green
    - ✅ Distance shows ~0.00 km

### Phase 4: Data Verification

16. **Check Database Records**
    ```sql
    SELECT 
      rl.*,
      r.responder_id,
      r.name,
      r.type
    FROM responder_locations rl
    JOIN responders r ON rl.responder_id = r.id
    WHERE r.responder_id = 'FIRE001'
    ORDER BY rl.updated_at DESC
    LIMIT 5;
    ```
    - ✅ Location records exist
    - ✅ Timestamps are recent
    - ✅ Coordinates are valid

17. **Verify Realtime Subscription**
    - Check browser console on admin dashboard
    - Should see: "Subscribed to responder-locations-{report_id}"
    - ✅ Subscription active

### Phase 5: Cleanup

18. **Stop Tracking on iPhone**
    - Tap "⏹ Stop Tracking"
    - ✅ Tracking stopped
    - ✅ "Start Tracking" button reappears

19. **Logout from Responder App**
    - Tap "Logout"
    - ✅ Returns to login screen

20. **Clear Assignment**
    ```sql
    UPDATE responders 
    SET current_report_id = NULL, 
        status = 'available' 
    WHERE responder_id = 'FIRE001';
    ```
    - ✅ Responder available for next assignment

## Troubleshooting Guide

### Issue: iPhone Can't Connect

**Symptoms:** Page doesn't load on iPhone

**Solutions:**
1. Verify both devices on same WiFi
2. Check firewall settings (allow port 3000)
3. Restart dev server with `-H 0.0.0.0`
4. Try different IP address (run `ipconfig` again)

### Issue: Location Not Updating

**Symptoms:** Tracking active but location doesn't change

**Solutions:**
1. Check location permissions on iPhone (Settings > Safari > Location)
2. Try using Chrome or Firefox on iPhone instead of Safari
3. Check browser console for errors
4. Verify Supabase connection (check .env file)
5. Check network connectivity

### Issue: Responder Not Showing on Map

**Symptoms:** Admin dashboard doesn't show responder

**Solutions:**
1. Verify responder is assigned: `SELECT * FROM responders WHERE responder_id = 'FIRE001'`
2. Check location records exist: `SELECT * FROM responder_locations WHERE responder_id = (SELECT id FROM responders WHERE responder_id = 'FIRE001')`
3. Refresh admin dashboard
4. Check browser console for errors
5. Verify realtime subscription is active

### Issue: Database Errors

**Symptoms:** "Foreign key violation" or similar errors

**Solutions:**
1. Verify responder_id column exists in responder_locations:
   ```sql
   ALTER TABLE responder_locations
   ADD COLUMN IF NOT EXISTS responder_id UUID REFERENCES responders(id) ON DELETE CASCADE;
   ```
2. Check RLS policies allow inserts
3. Verify responder exists in responders table

### Issue: Distance Not Calculating

**Symptoms:** Distance shows "Calculating..." or NaN

**Solutions:**
1. Verify report has valid coordinates
2. Check responder location has valid coordinates
3. Refresh admin dashboard
4. Check calculateDistance function in code

## Success Criteria

✅ All 20 testing steps completed successfully
✅ Real-time location updates working
✅ Distance calculation accurate
✅ Status changes reflected immediately
✅ Map displays both markers correctly
✅ No console errors
✅ Database records created properly

## Test Report Template

```
Date: _______________
Tester: _______________
Device: iPhone _______________
iOS Version: _______________

Results:
- Desktop Setup: ✅ / ❌
- iPhone Connection: ✅ / ❌
- Login: ✅ / ❌
- Location Tracking: ✅ / ❌
- Real-Time Updates: ✅ / ❌
- Map Display: ✅ / ❌
- Status Updates: ✅ / ❌
- Database Records: ✅ / ❌

Issues Found:
1. _______________
2. _______________

Notes:
_______________
```

## Quick Reference

**Responder IDs:**
- FIRE001, FIRE002 (Fire)
- MED001, MED002 (Medical)
- POLICE001, POLICE002 (Crime)

**URLs:**
- Admin: `http://localhost:3000/admin` (desktop)
- Responder: `http://172.20.10.6:3000/responder` (iPhone)

**Key SQL Commands:**
```sql
-- Assign
UPDATE responders SET current_report_id = 'ID', status = 'assigned' WHERE responder_id = 'FIRE001';

-- Check
SELECT * FROM responders WHERE responder_id = 'FIRE001';

-- Clear
UPDATE responders SET current_report_id = NULL, status = 'available' WHERE responder_id = 'FIRE001';
```
