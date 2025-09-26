-- Create public view for payroll_lines
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
    pl.updated_at,
    pp.month,
    pp.branch_id,
    s.name as staff_name,
    s.role_title
FROM payroll.payroll_lines pl
JOIN payroll.payroll_periods pp ON pp.id = pl.period_id
JOIN payroll.staff s ON s.id = pl.staff_id;

-- Grant permissions
GRANT SELECT ON public.payroll_lines TO authenticated;
GRANT SELECT ON public.payroll_lines TO anon;

-- Create RLS policy
ALTER VIEW public.payroll_lines ENABLE ROW LEVEL SECURITY;

-- Policy for branch-based access
CREATE POLICY "payroll_lines_branch_access" ON public.payroll_lines
FOR SELECT USING (
  branch_id IN (
    SELECT branch_id FROM payroll.staff WHERE id = auth.uid()
    UNION
    SELECT assigned_location FROM auth.users WHERE id = auth.uid() AND role = 'manager'
    UNION
    SELECT id FROM payroll.branches WHERE owner_id = auth.uid()
  )
);
