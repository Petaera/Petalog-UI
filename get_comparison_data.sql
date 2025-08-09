CREATE OR REPLACE FUNCTION get_comparison_data(
    p_location_id UUID,
    p_filter_date DATE
)
RETURNS TABLE(
    id TEXT,
    vehicle_number TEXT,
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    log_type TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH manual_logs AS (
        SELECT
            m.id::TEXT,
            COALESCE(m.vehicle_number, v.number_plate) AS vehicle_number,
            -- Normalize entry_time to avoid timezone issues
            CASE 
                WHEN m.entry_time IS NOT NULL THEN m.entry_time AT TIME ZONE 'UTC'
                ELSE m.created_at AT TIME ZONE 'UTC'
            END AS entry_time,
            CASE 
                WHEN m.exit_time IS NOT NULL THEN m.exit_time AT TIME ZONE 'UTC'
                WHEN m.approved_at IS NOT NULL THEN m.approved_at AT TIME ZONE 'UTC'
                ELSE NULL
            END AS exit_time,
            'manual' AS log_type,
            m.created_at AT TIME ZONE 'UTC' AS created_at
        FROM "logs-man" m
        LEFT JOIN vehicles v ON m.vehicle_id = v.id
        WHERE m.location_id = p_location_id
          AND m.approval_status = 'approved'
          AND (p_filter_date IS NULL OR 
               CASE 
                   WHEN m.entry_time IS NOT NULL THEN m.entry_time::DATE = p_filter_date
                   ELSE m.created_at::DATE = p_filter_date
               END)
          AND COALESCE(m.vehicle_number, v.number_plate) IS NOT NULL
    ),
    automatic_logs AS (
        SELECT
            a.id::TEXT,
            v.number_plate AS vehicle_number,
            -- Normalize entry_time to avoid timezone issues
            CASE 
                WHEN a.entry_time IS NOT NULL THEN a.entry_time AT TIME ZONE 'UTC'
                ELSE a.created_at AT TIME ZONE 'UTC'
            END AS entry_time,
            CASE 
                WHEN a.exit_time IS NOT NULL THEN a.exit_time AT TIME ZONE 'UTC'
                ELSE NULL
            END AS exit_time,
            'automatic' AS log_type,
            a.created_at AT TIME ZONE 'UTC' AS created_at
        FROM "logs-auto" a
        LEFT JOIN vehicles v ON a.vehicle_id = v.id
        WHERE a.location_id = p_location_id
          AND (p_filter_date IS NULL OR 
               CASE 
                   WHEN a.entry_time IS NOT NULL THEN a.entry_time::DATE = p_filter_date
                   ELSE a.created_at::DATE = p_filter_date
               END)
          AND v.number_plate IS NOT NULL
    ),
    -- Find vehicles that appear in both manual and automatic logs
    -- Use more precise matching to avoid timezone-related duplicates
    common_vehicles AS (
        SELECT DISTINCT m.vehicle_number
        FROM manual_logs m
        INNER JOIN automatic_logs a ON m.vehicle_number = a.vehicle_number
        WHERE m.vehicle_number IS NOT NULL 
          AND a.vehicle_number IS NOT NULL
          -- Additional check: ensure the timestamps are reasonably close (within 24 hours)
          AND ABS(EXTRACT(EPOCH FROM (m.entry_time - a.entry_time))) < 86400
    ),
    -- Get common vehicle entries with better deduplication
    common_entries AS (
        SELECT DISTINCT ON (m.vehicle_number)
            m.id::TEXT,
            m.vehicle_number,
            m.entry_time,
            m.exit_time,
            'common' AS log_type,
            m.created_at
        FROM manual_logs m
        INNER JOIN common_vehicles cv ON m.vehicle_number = cv.vehicle_number
        ORDER BY m.vehicle_number, m.created_at DESC
    ),
    -- Get manual-only entries (vehicles that don't appear in automatic logs)
    manual_only AS (
        SELECT
            m.id::TEXT,
            m.vehicle_number,
            m.entry_time,
            m.exit_time,
            'manual' AS log_type,
            m.created_at
        FROM manual_logs m
        LEFT JOIN common_vehicles cv ON m.vehicle_number = cv.vehicle_number
        WHERE cv.vehicle_number IS NULL
    ),
    -- Get automatic-only entries (vehicles that don't appear in manual logs)
    automatic_only AS (
        SELECT
            a.id::TEXT,
            a.vehicle_number,
            a.entry_time,
            a.exit_time,
            'automatic' AS log_type,
            a.created_at
        FROM automatic_logs a
        LEFT JOIN common_vehicles cv ON a.vehicle_number = cv.vehicle_number
        WHERE cv.vehicle_number IS NULL
    )
    -- Combine all three types of entries with final deduplication
    SELECT DISTINCT ON (vehicle_number, DATE(entry_time))
        id,
        vehicle_number,
        entry_time,
        exit_time,
        log_type,
        created_at
    FROM (
        SELECT * FROM common_entries
        UNION ALL
        SELECT * FROM manual_only
        UNION ALL
        SELECT * FROM automatic_only
    ) combined_logs
    ORDER BY vehicle_number, DATE(entry_time), created_at DESC;
END;
$$ LANGUAGE plpgsql;
