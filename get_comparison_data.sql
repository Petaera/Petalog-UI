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
    ),
    combined_logs AS (
        SELECT * FROM manual_logs
        UNION ALL
        SELECT * FROM automatic_logs
    ),
    common_vehicles AS (
        SELECT cl.vehicle_number
        FROM combined_logs cl
        GROUP BY cl.vehicle_number
        HAVING COUNT(DISTINCT cl.log_type) > 1
    )
    SELECT
        c.id,
        c.vehicle_number,
        c.entry_time,
        c.exit_time,
        CASE
            WHEN cv.vehicle_number IS NOT NULL THEN 'common'
            ELSE c.log_type
        END AS log_type,
        c.created_at
    FROM combined_logs c
    LEFT JOIN common_vehicles cv ON c.vehicle_number = cv.vehicle_number;
END;
$$ LANGUAGE plpgsql;
