-- Test Responder Tracking Setup
-- Run these commands in Supabase SQL Editor to verify and test the responder tracking system

-- 1. Verify responders table exists and has data
SELECT * FROM responders ORDER BY type, responder_id;

-- 2. Check if responder_locations table has responder_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'responder_locations';

-- 3. Find a fire report to test with
SELECT id, type, status, latitude, longitude, created_at 
FROM reports 
WHERE type = 'fire' 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Assign FIRE001 to a specific report (replace YOUR_REPORT_ID with actual report ID)
-- Example: UPDATE responders SET current_report_id = '7efcce29-6847-41fb-be35-61735e888cc0', status = 'assigned' WHERE responder_id = 'FIRE001';
UPDATE responders 
SET current_report_id = 'YOUR_REPORT_ID', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';

-- 5. Verify assignment
SELECT r.responder_id, r.name, r.status, r.current_report_id, rep.type, rep.status as report_status
FROM responders r
LEFT JOIN reports rep ON r.current_report_id = rep.id
WHERE r.responder_id = 'FIRE001';

-- 6. Check responder locations (after starting tracking on iPhone)
SELECT 
  rl.*,
  r.responder_id,
  r.name,
  r.type,
  rep.type as report_type,
  rep.status as report_status
FROM responder_locations rl
JOIN responders r ON rl.responder_id = r.id
JOIN reports rep ON rl.report_id = rep.id
ORDER BY rl.updated_at DESC
LIMIT 10;

-- 7. Clear assignment (when done testing)
UPDATE responders 
SET current_report_id = NULL, 
    status = 'available' 
WHERE responder_id = 'FIRE001';

-- 8. Delete test location data (optional cleanup)
DELETE FROM responder_locations 
WHERE responder_id IN (
  SELECT id FROM responders WHERE responder_id = 'FIRE001'
);

-- 9. Check RLS policies on responder_locations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'responder_locations';

-- 10. Verify foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('responder_locations', 'responders');
