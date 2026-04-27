# Quick Start - Responder iPhone Testing

## 🚀 Start in 3 Steps

### Step 1: Start Server (On Computer)
```bash
cd frontend
npm run dev -- -H 0.0.0.0
```

Wait for: `ready - started server on 0.0.0.0:3000`

### Step 2: Assign Responder (Supabase SQL Editor)

**Get a Fire Report ID:**
```sql
SELECT id, type, status, latitude, longitude 
FROM reports 
WHERE type = 'fire' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Assign FIRE001 to that report:**
```sql
UPDATE responders 
SET current_report_id = 'PASTE_REPORT_ID_HERE', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';
```

### Step 3: Test on iPhone

1. **Open on iPhone:** `http://172.20.10.6:3000/responder`
2. **Login:** Enter `FIRE001`
3. **Start Tracking:** Tap "🚀 Start Tracking"
4. **Allow Location:** Tap "Allow" when prompted

### Step 4: View on Admin Dashboard

1. **Open on Computer:** `http://localhost:3000/admin`
2. **Open the same report** you assigned
3. **Click:** "📍 Track Responders"
4. **Watch:** Responder location update in real-time!

---

## 📱 What You Should See

### On iPhone (Responder App):
```
┌─────────────────────────────┐
│ Fire Team Alpha             │
│ [En Route]          [Logout]│
├─────────────────────────────┤
│ 🚨 Current Assignment       │
│ Type: Fire Emergency        │
│ Status: responding          │
│ Location: 5.6037°, -0.1870° │
│ 📍 1.23 km away             │
├─────────────────────────────┤
│ 📍 Location Tracking        │
│ [📍 Tracking Active]        │
│ [⏹ Stop Tracking]           │
│ Current: 5.6050°, -0.1880°  │
└─────────────────────────────┘
```

### On Desktop (Admin Dashboard):
```
┌─────────────────────────────────────────┐
│ 📍 Responder Tracking          [×]      │
├──────────────┬──────────────────────────┤
│ Active       │                          │
│ Responders   │      [MAP VIEW]          │
│              │                          │
│ ● Fire Team  │   🚨 Emergency Location  │
│   Alpha      │                          │
│   ID: FIRE001│   🚑 Responder (moving)  │
│   Status:    │                          │
│   En Route   │                          │
│   Distance:  │                          │
│   1.23 km    │                          │
└──────────────┴──────────────────────────┘
```

---

## ✅ Success Indicators

- ✅ iPhone shows "📍 Tracking Active"
- ✅ Admin dashboard shows responder in list
- ✅ Map shows both 🚨 and 🚑 markers
- ✅ Distance updates as you move
- ✅ No errors in browser console

---

## 🔧 Quick Fixes

**iPhone can't connect?**
```bash
# Check your IP address
ipconfig

# Use the IPv4 Address shown
# Example: http://192.168.1.100:3000/responder
```

**Location not updating?**
- Check iPhone location permissions (Settings > Safari > Location)
- Try Chrome or Firefox instead of Safari
- Make sure you're on the same WiFi network

**Responder not showing?**
```sql
-- Verify assignment
SELECT * FROM responders WHERE responder_id = 'FIRE001';

-- Check location records
SELECT * FROM responder_locations 
WHERE responder_id = (SELECT id FROM responders WHERE responder_id = 'FIRE001')
ORDER BY updated_at DESC LIMIT 5;
```

---

## 🧹 Cleanup After Testing

```sql
-- Clear assignment
UPDATE responders 
SET current_report_id = NULL, 
    status = 'available' 
WHERE responder_id = 'FIRE001';

-- (Optional) Delete test location data
DELETE FROM responder_locations 
WHERE responder_id = (SELECT id FROM responders WHERE responder_id = 'FIRE001');
```

---

## 📞 Test with Multiple Responders

Want to test with multiple responders? Repeat with different IDs:

```sql
-- Assign FIRE002
UPDATE responders 
SET current_report_id = 'SAME_REPORT_ID', 
    status = 'assigned' 
WHERE responder_id = 'FIRE002';
```

Then login on another device with `FIRE002`!

---

## 🎯 Current Test Report

**Report ID:** `7efcce29-6847-41fb-be35-61735e888cc0`

**Quick Assign:**
```sql
UPDATE responders 
SET current_report_id = '7efcce29-6847-41fb-be35-61735e888cc0', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';
```

---

## 📚 More Help

- Full checklist: `RESPONDER_TESTING_CHECKLIST.md`
- Setup guide: `RESPONDER_IPHONE_SETUP.md`
- Database tests: `database/test-responder-tracking.sql`
