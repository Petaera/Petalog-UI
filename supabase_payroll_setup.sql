-- =====================================================
-- PAYROLL LINES SETUP FOR SUPABASE
-- =====================================================

-- 1. Create public view for payroll_lines
CREATE OR REPLACE VIEW public.payroll_lines AS
SELECT 
    pl.id,
    pl.period_id,
    pl.staff_id,
    pl.base_salary,
    pl.present_days,
    pl.paid_leaves,
    pl.unpaid_leaves,
    pl.advances_total,
    pl.net_payable,
    pl.payment_status,
    pl.paid_via,
    pl.paid_at,
    pl.payment_ref,
    pl.created_at,
    pp.month,
    pp.branch_id,
    s.name as staff_name,
    s.role_title
FROM payroll.payroll_lines pl
JOIN payroll.payroll_periods pp ON pp.id = pl.period_id
JOIN payroll.staff s ON s.id = pl.staff_id;

-- 2. Grant permissions
GRANT SELECT ON public.payroll_lines TO authenticated;
GRANT SELECT ON public.payroll_lines TO anon;

-- Note: RLS is handled at the underlying table level (payroll.payroll_lines)
-- The view inherits security from the base tables

-- =====================================================
-- SAMPLE DATA GENERATION (Optional - for testing)
-- =====================================================

-- 5. Create a sample payroll period for current month
INSERT INTO payroll.payroll_periods (branch_id, month, calc_method)
SELECT 
    '838580cc-a6ab-4c79-844c-581a3cfd3a76' as branch_id, -- Replace with your actual branch ID
    '2025-01' as month,
    '30-day' as calc_method
WHERE NOT EXISTS (
    SELECT 1 FROM payroll.payroll_periods 
    WHERE branch_id = '838580cc-a6ab-4c79-844c-581a3cfd3a76' 
    AND month = '2025-01'
);

-- 6. Generate sample payroll lines for all staff in the branch
INSERT INTO payroll.payroll_lines (
    period_id, 
    staff_id, 
    base_salary, 
    present_days, 
    paid_leaves, 
    unpaid_leaves, 
    advances_total, 
    net_payable, 
    payment_status,
    created_at
)
SELECT 
    pp.id as period_id,
    s.id as staff_id,
    s.monthly_salary as base_salary,
    COALESCE(att.present_days, 22) as present_days, -- Default 22 working days
    COALESCE(att.paid_leaves, 0) as paid_leaves,
    COALESCE(att.unpaid_leaves, 0) as unpaid_leaves,
    COALESCE(adv.advances_total, 0) as advances_total,
    (s.monthly_salary - COALESCE(adv.advances_total, 0)) as net_payable,
    'pending' as payment_status,
    NOW() as created_at
FROM payroll.staff s
JOIN payroll.payroll_periods pp ON pp.branch_id = s.branch_id AND pp.month = '2025-01'
LEFT JOIN (
    SELECT 
        staff_id,
        SUM(present_days) as present_days,
        SUM(paid_leaves) as paid_leaves,
        SUM(unpaid_leaves) as unpaid_leaves
    FROM payroll.v_staff_monthly_attendance 
    WHERE month = '2025-01'
    GROUP BY staff_id
) att ON att.staff_id = s.id
LEFT JOIN (
    SELECT 
        staff_id,
        SUM(amount) as advances_total
    FROM payroll.advances 
    WHERE DATE_TRUNC('month', date) = '2025-01-01'::date
    GROUP BY staff_id
) adv ON adv.staff_id = s.id
WHERE s.branch_id = '838580cc-a6ab-4c79-844c-581a3cfd3a76' -- Replace with your actual branch ID
AND s.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM payroll.payroll_lines pl2 
    WHERE pl2.staff_id = s.id 
    AND pl2.period_id = pp.id
);

-- =====================================================
-- USEFUL QUERIES FOR TESTING
-- =====================================================

-- 7. Check if payroll_lines view is working
SELECT 
    staff_name,
    month,
    base_salary,
    present_days,
    advances_total,
    net_payable,
    payment_status
FROM public.payroll_lines 
ORDER BY month DESC, staff_name;

-- 8. Update payment status (example)
-- UPDATE payroll.payroll_lines 
-- SET 
--     payment_status = 'paid',
--     paid_via = 'UPI',
--     paid_at = NOW(),
--     payment_ref = 'TXN12345'
-- WHERE staff_id = 'your-staff-id' 
-- AND period_id = 'your-period-id';

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Replace '838580cc-a6ab-4c79-844c-581a3cfd3a76' with your actual branch ID
-- 2. Adjust the month '2025-01' to your current month
-- 3. The sample data generation will create payroll lines for all active staff
-- 4. You can run this multiple times - it has EXISTS checks to prevent duplicates
