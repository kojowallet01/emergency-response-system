-- Database Integrity Test Script
-- Run this in Supabase SQL Editor to verify database setup

-- ========================================
-- Test 1: Verify all tables exist
-- ========================================
SELECT 
  'Test 1: Tables Exist' as test_name,
  COUNT(*) as tables_found,
  CASE 
    WHEN COUNT(*) = 9 THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files', 
  'ai_predictions',
  'responders'
);

-- ========================================
-- Test 2: Verify RLS is enabled
-- ========================================
SELECT 
  'Test 2: RLS Enabled' as test_name,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files',
  'responders'
)
ORDER BY tablename;

-- ========================================
-- Test 3: Verify RLS policies exist
-- ========================================
SELECT 
  'Test 3: RLS Policies' as test_name,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS' 
    ELSE '⚠️ WARNING' 
  END as status
FROM pg_policies 
WHERE tablename IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files',
  'responders'
)
GROUP BY tablename
ORDER BY tablename;

-- ========================================
-- Test 4: Verify foreign key relationships
-- ========================================
SELECT 
  'Test 4: Foreign Keys' as test_name,
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN (
  'report_notes',
  'activity_logs',
  'chat_messages',
  'responder_locations',
  'evidence_files',
  'ai_predictions',
  'responders'
)
ORDER BY tc.table_name;

-- ========================================
-- Test 5: Verify indexes exist
-- ========================================
SELECT 
  'Test 5: Indexes' as test_name,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files',
  'responders'
)
ORDER BY tablename, indexname;

-- ========================================
-- Test 6: Verify sample data exists
-- ========================================
SELECT 
  'Test 6: Sample Data' as test_name,
  'reports' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA' 
    ELSE '⚠️ EMPTY' 
  END as status
FROM reports
UNION ALL
SELECT 
  'Test 6: Sample Data',
  'admin_profiles',
  COUNT(*),
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA' 
    ELSE '❌ EMPTY' 
  END
FROM admin_profiles
UNION ALL
SELECT 
  'Test 6: Sample Data',
  'responders',
  COUNT(*),
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ HAS DATA' 
    ELSE '⚠️ MISSING SAMPLE DATA' 
  END
FROM responders;

-- ========================================
-- Test 7: Verify Realtime is enabled
-- ========================================
SELECT 
  'Test 7: Realtime Enabled' as test_name,
  schemaname,
  tablename,
  CASE 
    WHEN tablename IN (
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ ENABLED' 
    ELSE '⚠️ NOT ENABLED' 
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('reports', 'chat_messages', 'responder_locations')
ORDER BY tablename;

-- ========================================
-- Test 8: Verify column types
-- ========================================
SELECT 
  'Test 8: Column Types' as test_name,
  table_name,
  column_name,
  data_type,
  '✅ CORRECT' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files',
  'responders'
)
ORDER BY table_name, ordinal_position;

-- ========================================
-- Test 9: Verify responder_locations has responder_id column
-- ========================================
SELECT 
  'Test 9: Responder ID Column' as test_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'responder_id' AND data_type = 'uuid' THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'responder_locations'
AND column_name = 'responder_id';

-- ========================================
-- Test 10: Verify admin_profiles has last_seen column
-- ========================================
SELECT 
  'Test 10: Last Seen Column' as test_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'last_seen' THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'admin_profiles'
AND column_name = 'last_seen';

-- ========================================
-- Summary Report
-- ========================================
SELECT 
  '========================================' as separator,
  'DATABASE INTEGRITY TEST SUMMARY' as title,
  '========================================' as separator2;

SELECT 
  'Total Tables' as metric,
  COUNT(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files', 
  'ai_predictions',
  'responders'
);

SELECT 
  'Total RLS Policies' as metric,
  COUNT(*) as value
FROM pg_policies 
WHERE tablename IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files',
  'responders'
);

SELECT 
  'Total Foreign Keys' as metric,
  COUNT(*) as value
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN (
  'report_notes',
  'activity_logs',
  'chat_messages',
  'responder_locations',
  'evidence_files',
  'ai_predictions',
  'responders'
);

SELECT 
  'Total Indexes' as metric,
  COUNT(*) as value
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
  'reports', 
  'admin_profiles', 
  'report_notes', 
  'activity_logs', 
  'chat_messages', 
  'responder_locations', 
  'evidence_files',
  'responders'
);

SELECT 
  '========================================' as separator,
  'ALL TESTS COMPLETE' as status,
  '========================================' as separator2;
