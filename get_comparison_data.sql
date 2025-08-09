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
            COALESCE(m.entry_time, m.created_at) AS entry_time,
            COALESCE(m.exit_time, m.approved_at) AS exit_time,
            'manual' AS log_type,
            m.created_at
        FROM "logs-man" m
        LEFT JOIN vehicles v ON m.vehicle_id = v.id
        WHERE m.location_id = p_location_id
          AND m.approval_status = 'approved'
          AND (p_filter_date IS NULL OR COALESCE(m.entry_time, m.created_at)::DATE = p_filter_date)
          AND COALESCE(m.vehicle_number, v.number_plate) IS NOT NULL
    ),
    automatic_logs AS (
        SELECT
            a.id::TEXT,
            v.number_plate AS vehicle_number,
            COALESCE(a.entry_time, a.created_at) AS entry_time,
            a.exit_time,
            'automatic' AS log_type,
            a.created_at
        FROM "logs-auto" a
        LEFT JOIN vehicles v ON a.vehicle_id = v.id
        WHERE a.location_id = p_location_id
          AND (p_filter_date IS NULL OR COALESCE(a.entry_time, a.created_at)::DATE = p_filter_date)
          AND v.number_plate IS NOT NULL
    ),
    -- Find vehicles that appear in both manual and automatic logs
    common_vehicles AS (
        SELECT DISTINCT m.vehicle_number
        FROM manual_logs m
        INNER JOIN automatic_logs a ON m.vehicle_number = a.vehicle_number
        WHERE m.vehicle_number IS NOT NULL AND a.vehicle_number IS NOT NULL
    ),
    -- Combine all logs and mark common ones
    all_logs AS (
        SELECT 
            id,
            vehicle_number,
            entry_time,
            exit_time,
            log_type,
            created_at
        FROM manual_logs
        
        UNION ALL
        
        SELECT 
            id,
            vehicle_number,
            entry_time,
            exit_time,
            log_type,
            created_at
        FROM automatic_logs
    )
    SELECT
        al.id,
        al.vehicle_number,
        al.entry_time,
        al.exit_time,
        CASE
            WHEN cv.vehicle_number IS NOT NULL THEN 'common'
            ELSE al.log_type
        END AS log_type,
        al.created_at
    FROM all_logs al
    LEFT JOIN common_vehicles cv ON al.vehicle_number = cv.vehicle_number
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;
