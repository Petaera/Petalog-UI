-- Check for duplicate entries in logs-auto table
-- This query will help identify potential sources of duplicates

-- 1. Check for exact duplicate IDs (should not happen with proper primary keys)
SELECT 
    'Duplicate IDs' as check_type,
    id,
    COUNT(*) as count
FROM "logs-auto"
GROUP BY id
HAVING COUNT(*) > 1;

-- 2. Check for entries with same vehicle_id, entry_time, and location_id
-- (These might be legitimate duplicates or data entry errors)
SELECT 
    'Duplicate vehicle+time+location' as check_type,
    vehicle_id,
    entry_time,
    location_id,
    COUNT(*) as count,
    array_agg(id) as log_ids,
    array_agg(created_at) as created_times
FROM "logs-auto"
GROUP BY vehicle_id, entry_time, location_id
HAVING COUNT(*) > 1
ORDER BY entry_time DESC;

-- 3. Check for entries with very close timestamps (within 5 minutes) for same vehicle
-- (This might indicate system issues or rapid re-entry)
WITH time_based_duplicates AS (
    SELECT 
        a1.id as id1,
        a1.vehicle_id as vehicle_id1,
        a1.entry_time as entry_time1,
        a1.location_id as location_id1,
        a1.created_at as created_at1,
        a2.id as id2,
        a2.vehicle_id as vehicle_id2,
        a2.entry_time as entry_time2,
        a2.location_id as location_id2,
        a2.created_at as created_at2,
        EXTRACT(EPOCH FROM (a2.entry_time - a1.entry_time))/60 as time_diff_minutes
    FROM "logs-auto" a1
    JOIN "logs-auto" a2 ON 
        a1.vehicle_id = a2.vehicle_id 
        AND a1.location_id = a2.location_id
        AND a1.id < a2.id
        AND ABS(EXTRACT(EPOCH FROM (a2.entry_time - a1.entry_time))) < 300 -- 5 minutes in seconds
)
SELECT 
    'Close timestamps' as check_type,
    vehicle_id1,
    entry_time1,
    entry_time2,
    time_diff_minutes,
    id1,
    id2,
    created_at1,
    created_at2
FROM time_based_duplicates
ORDER BY time_diff_minutes ASC, entry_time1 DESC;

-- 4. Check for entries created at the exact same time
-- (This might indicate batch processing issues)
SELECT 
    'Same creation time' as check_type,
    created_at,
    COUNT(*) as count,
    array_agg(id) as log_ids,
    array_agg(vehicle_id) as vehicle_ids
FROM "logs-auto"
GROUP BY created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC;

-- 5. Check for entries with NULL or missing critical data
-- (These might cause display issues)
SELECT 
    'Missing critical data' as check_type,
    id,
    vehicle_id,
    entry_time,
    location_id,
    created_at
FROM "logs-auto"
WHERE 
    vehicle_id IS NULL 
    OR entry_time IS NULL 
    OR location_id IS NULL
ORDER BY created_at DESC;

-- 6. Summary of potential issues
SELECT 
    'Summary' as check_type,
    COUNT(*) as total_entries,
    COUNT(DISTINCT id) as unique_ids,
    COUNT(DISTINCT vehicle_id) as unique_vehicles,
    COUNT(DISTINCT location_id) as unique_locations,
    MIN(created_at) as earliest_entry,
    MAX(created_at) as latest_entry
FROM "logs-auto";

-- Check for timezone-related duplicates in logs-auto
-- This can help identify if the same entry is being processed with different timezone interpretations

-- 1. Check for entries with the same vehicle_id but different timezone interpretations
SELECT 
    'Timezone-related duplicates' as check_type,
    vehicle_id,
    location_id,
    COUNT(*) as count,
    array_agg(id) as log_ids,
    array_agg(entry_time) as entry_times,
    array_agg(entry_time AT TIME ZONE 'UTC') as entry_times_utc,
    array_agg(created_at) as created_times,
    array_agg(created_at AT TIME ZONE 'UTC') as created_times_utc
FROM "logs-auto"
GROUP BY vehicle_id, location_id
HAVING COUNT(*) > 1
ORDER BY vehicle_id, location_id;

-- 2. Check for entries with very close timestamps (within 1 minute) for the same vehicle
-- This might indicate timezone interpretation issues
SELECT 
    'Close timestamps (potential timezone issue)' as check_type,
    a1.vehicle_id,
    a1.location_id,
    a1.id as log1_id,
    a2.id as log2_id,
    a1.entry_time as log1_entry_time,
    a2.entry_time as log2_entry_time,
    a1.entry_time AT TIME ZONE 'UTC' as log1_entry_time_utc,
    a2.entry_time AT TIME ZONE 'UTC' as log2_entry_time_utc,
    a1.created_at as log1_created_at,
    a2.created_at as log2_created_at,
    EXTRACT(EPOCH FROM (a1.entry_time - a2.entry_time)) as time_diff_seconds
FROM "logs-auto" a1
INNER JOIN "logs-auto" a2 ON a1.vehicle_id = a2.vehicle_id 
    AND a1.location_id = a2.location_id
    AND a1.id < a2.id
WHERE ABS(EXTRACT(EPOCH FROM (a1.entry_time - a2.entry_time))) < 60  -- Within 1 minute
ORDER BY a1.vehicle_id, a1.location_id, a1.entry_time;

-- 3. Check for entries with the same vehicle_id and location_id but different date interpretations
-- This can happen when the same timestamp is interpreted as different dates due to timezone
SELECT 
    'Same timestamp, different date interpretation' as check_type,
    vehicle_id,
    location_id,
    entry_time,
    entry_time::DATE as entry_date,
    entry_time AT TIME ZONE 'UTC'::DATE as entry_date_utc,
    COUNT(*) as count,
    array_agg(id) as log_ids
FROM "logs-auto"
GROUP BY vehicle_id, location_id, entry_time, entry_time::DATE, entry_time AT TIME ZONE 'UTC'::DATE
HAVING COUNT(*) > 1
ORDER BY vehicle_id, location_id, entry_time;

-- 4. Check for entries where entry_time and created_at have different date interpretations
SELECT 
    'Different date interpretations' as check_type,
    id,
    vehicle_id,
    location_id,
    entry_time,
    entry_time::DATE as entry_date,
    created_at,
    created_at::DATE as created_date,
    CASE 
        WHEN entry_time::DATE != created_at::DATE THEN 'DIFFERENT DATES'
        ELSE 'SAME DATE'
    END as date_comparison
FROM "logs-auto"
WHERE entry_time IS NOT NULL
ORDER BY vehicle_id, location_id, entry_time;

-- 5. Summary of timezone-related issues
SELECT 
    'Timezone summary' as check_type,
    COUNT(*) as total_entries,
    COUNT(DISTINCT vehicle_id) as unique_vehicles,
    COUNT(DISTINCT location_id) as unique_locations,
    MIN(entry_time) as earliest_entry,
    MAX(entry_time) as latest_entry,
    MIN(entry_time AT TIME ZONE 'UTC') as earliest_entry_utc,
    MAX(entry_time AT TIME ZONE 'UTC') as latest_entry_utc
FROM "logs-auto"
WHERE entry_time IS NOT NULL;

-- 6. Check for the specific timezone duplicate issue described by the user
-- Look for entries that appear to be the same but with different timestamps (5 hour difference)
SELECT 
    '5-hour timezone difference duplicates' as check_type,
    a1.vehicle_id,
    a1.location_id,
    a1.id as log1_id,
    a2.id as log2_id,
    a1.entry_time as log1_entry_time,
    a2.entry_time as log2_entry_time,
    a1.entry_time AT TIME ZONE 'UTC' as log1_entry_time_utc,
    a2.entry_time AT TIME ZONE 'UTC' as log2_entry_time_utc,
    a1.created_at as log1_created_at,
    a2.created_at as log2_created_at,
    EXTRACT(EPOCH FROM (a1.entry_time - a2.entry_time)) / 3600 as time_diff_hours,
    EXTRACT(EPOCH FROM (a1.entry_time - a2.entry_time)) as time_diff_seconds
FROM "logs-auto" a1
INNER JOIN "logs-auto" a2 ON a1.vehicle_id = a2.vehicle_id 
    AND a1.location_id = a2.location_id
    AND a1.id < a2.id
WHERE ABS(EXTRACT(EPOCH FROM (a1.entry_time - a2.entry_time)) / 3600) BETWEEN 4.5 AND 5.5  -- Around 5 hours
ORDER BY a1.vehicle_id, a1.location_id, a1.entry_time;

-- 7. Check for entries with the same vehicle_id but different timezone interpretations
-- This can happen when the same logical entry is stored with different timezone offsets
SELECT 
    'Same vehicle, different timezone offsets' as check_type,
    vehicle_id,
    location_id,
    COUNT(*) as count,
    array_agg(id) as log_ids,
    array_agg(entry_time) as entry_times,
    array_agg(entry_time AT TIME ZONE 'UTC') as entry_times_utc,
    array_agg(EXTRACT(TIMEZONE_HOUR FROM entry_time)) as timezone_hours,
    array_agg(EXTRACT(TIMEZONE_MINUTE FROM entry_time)) as timezone_minutes
FROM "logs-auto"
WHERE entry_time IS NOT NULL
GROUP BY vehicle_id, location_id
HAVING COUNT(*) > 1
ORDER BY vehicle_id, location_id;
