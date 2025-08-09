-- Test query to check for common vehicles
-- Replace 'your-location-id' with an actual location ID from your database

-- Check if there are vehicles in both manual and automatic logs
SELECT 
    'Manual logs count' as description,
    COUNT(*) as count
FROM "logs-man" m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
WHERE m.location_id = 'your-location-id'::UUID
  AND m.approval_status = 'approved'
  AND COALESCE(m.vehicle_number, v.number_plate) IS NOT NULL

UNION ALL

SELECT 
    'Automatic logs count' as description,
    COUNT(*) as count
FROM "logs-auto" a
LEFT JOIN vehicles v ON a.vehicle_id = v.id
WHERE a.location_id = 'your-location-id'::UUID
  AND v.number_plate IS NOT NULL

UNION ALL

SELECT 
    'Vehicles in both logs' as description,
    COUNT(DISTINCT m.vehicle_number) as count
FROM "logs-man" m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
INNER JOIN "logs-auto" a ON COALESCE(m.vehicle_number, v.number_plate) = a.vehicle_number
LEFT JOIN vehicles v2 ON a.vehicle_id = v2.id
WHERE m.location_id = 'your-location-id'::UUID
  AND a.location_id = 'your-location-id'::UUID
  AND m.approval_status = 'approved'
  AND COALESCE(m.vehicle_number, v.number_plate) IS NOT NULL
  AND a.vehicle_number IS NOT NULL;

-- Show some examples of vehicles that might be common
SELECT 
    COALESCE(m.vehicle_number, v.number_plate) as vehicle_number,
    'manual' as log_type,
    m.created_at
FROM "logs-man" m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
WHERE m.location_id = 'your-location-id'::UUID
  AND m.approval_status = 'approved'
  AND COALESCE(m.vehicle_number, v.number_plate) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "logs-auto" a2 
    LEFT JOIN vehicles v2 ON a2.vehicle_id = v2.id
    WHERE a2.location_id = 'your-location-id'::UUID
      AND COALESCE(m.vehicle_number, v.number_plate) = a2.vehicle_number
  )
LIMIT 5;
