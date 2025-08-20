-- Test script for location partnerships system
-- Run this after executing create_location_owners_table.sql

-- 1. Check if the location_owners table was created successfully
SELECT 
  'Table Creation Check' as test_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_owners') 
    THEN 'PASSED' 
    ELSE 'FAILED' 
  END as result;

-- 2. Check if the migration was completed
SELECT 
  'Migration Check' as test_name,
  COUNT(*) as total_locations,
  COUNT(CASE WHEN migration_completed = true THEN 1 END) as migrated_locations,
  CASE 
    WHEN COUNT(CASE WHEN migration_completed = true THEN 1 END) > 0 
    THEN 'PASSED' 
    ELSE 'FAILED' 
  END as result
FROM locations;

-- 3. Check if location_owners has data
SELECT 
  'Data Migration Check' as test_name,
  COUNT(*) as total_relationships,
  COUNT(DISTINCT location_id) as unique_locations,
  COUNT(DISTINCT owner_id) as unique_owners,
  CASE 
    WHEN COUNT(*) > 0 
    THEN 'PASSED' 
    ELSE 'FAILED' 
  END as result
FROM location_owners;

-- 4. Test the get_location_owners function
-- Replace 'your-test-location-id' with an actual location ID from your database
SELECT 
  'Function Test' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'get_location_owners'
    ) 
    THEN 'PASSED' 
    ELSE 'FAILED' 
  END as result;

-- 5. Check RLS policies
SELECT 
  'RLS Policies Check' as test_name,
  COUNT(*) as total_policies,
  CASE 
    WHEN COUNT(*) >= 5 
    THEN 'PASSED' 
    ELSE 'FAILED' 
  END as result
FROM pg_policies 
WHERE tablename = 'location_owners';

-- 6. Sample data from location_owners
SELECT 
  'Sample Data' as test_name,
  lo.location_id,
  l.name as location_name,
  lo.owner_id,
  u.email as owner_email,
  lo.ownership_percentage,
  lo.is_primary_owner
FROM location_owners lo
JOIN locations l ON lo.location_id = l.id
JOIN auth.users u ON lo.owner_id = u.id
LIMIT 5;

-- 7. Check ownership percentages add up to 100% for each location
SELECT 
  'Ownership Validation' as test_name,
  location_id,
  l.name as location_name,
  SUM(ownership_percentage) as total_ownership,
  CASE 
    WHEN SUM(ownership_percentage) = 100.00 
    THEN 'PASSED' 
    ELSE 'FAILED - Total ownership should be 100%' 
  END as validation_result
FROM location_owners lo
JOIN locations l ON lo.location_id = l.id
GROUP BY location_id, l.name
ORDER BY l.name;

-- 8. Check if primary owners are properly set
SELECT 
  'Primary Owner Check' as test_name,
  location_id,
  l.name as location_name,
  COUNT(CASE WHEN is_primary_owner = true THEN 1 END) as primary_owners_count,
  CASE 
    WHEN COUNT(CASE WHEN is_primary_owner = true THEN 1 END) = 1 
    THEN 'PASSED' 
    ELSE 'FAILED - Each location should have exactly one primary owner' 
  END as validation_result
FROM location_owners lo
JOIN locations l ON lo.location_id = l.id
GROUP BY location_id, l.name
ORDER BY l.name;

