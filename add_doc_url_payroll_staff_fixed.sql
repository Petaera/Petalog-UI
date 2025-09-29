-- Add document support to payroll.staff table and functions
-- Since payroll.staff is the editable table and public.staff is a view

-- 1. Add doc_url column to the actual payroll.staff table
ALTER TABLE payroll.staff ADD COLUMN IF NOT EXISTS doc_url text[];

-- 2. Drop existing functions first (since we're changing the return type)
DROP FUNCTION IF EXISTS get_staff_by_branch(uuid);
DROP FUNCTION IF EXISTS get_staff_by_ids(uuid[]);
DROP FUNCTION IF EXISTS update_staff(uuid, text, text, text, date, numeric, text, boolean, text);

-- 3. Create or replace update_staff function to support doc_url
CREATE OR REPLACE FUNCTION update_staff(
  staff_id_param uuid,
  name_param text DEFAULT NULL,
  role_title_param text DEFAULT NULL,
  contact_param text DEFAULT NULL,
  date_of_joining_param date DEFAULT NULL,
  monthly_salary_param numeric DEFAULT NULL,
  default_payment_mode_param text DEFAULT NULL,
  is_active_param boolean DEFAULT NULL,
  dp_url_param text DEFAULT NULL,
  doc_url_param text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payroll.staff
  SET
    name = COALESCE(name_param, name),
    role_title = COALESCE(role_title_param, role_title),
    contact = COALESCE(contact_param, contact),
    date_of_joining = COALESCE(date_of_joining_param, date_of_joining),
    monthly_salary = COALESCE(monthly_salary_param, monthly_salary),
    default_payment_mode = COALESCE(default_payment_mode_param, default_payment_mode),
    is_active = COALESCE(is_active_param, is_active),
    dp_url = COALESCE(dp_url_param, dp_url),
    doc_url = COALESCE(doc_url_param, doc_url),
    updated_at = NOW()
  WHERE id = staff_id_param;
END;
$$;

-- 4. Create get_staff_by_branch function with doc_url
CREATE OR REPLACE FUNCTION get_staff_by_branch(branch_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  role_title text,
  contact text,
  date_of_joining date,
  monthly_salary numeric,
  default_payment_mode text,
  is_active boolean,
  dp_url text,
  doc_url text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.role_title,
    s.contact,
    s.date_of_joining,
    s.monthly_salary,
    s.default_payment_mode,
    s.is_active,
    s.dp_url,
    COALESCE(s.doc_url, ARRAY[]::text[]) as doc_url,
    s.created_at,
    s.updated_at
  FROM payroll.staff s
  WHERE s.branch_id = branch_id_param
  ORDER BY s.name;
END;
$$;

-- 5. Create get_staff_by_ids function with doc_url
CREATE OR REPLACE FUNCTION get_staff_by_ids(staff_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  role_title text,
  contact text,
  date_of_joining date,
  monthly_salary numeric,
  default_payment_mode text,
  is_active boolean,
  dp_url text,
  doc_url text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.role_title,
    s.contact,
    s.date_of_joining,
    s.monthly_salary,
    s.default_payment_mode,
    s.is_active,
    s.dp_url,
    COALESCE(s.doc_url, ARRAY[]::text[]) as doc_url,
    s.created_at,
    s.updated_at
  FROM payroll.staff s
  WHERE s.id = ANY(staff_ids)
  ORDER BY s.name;
END;
$$;

-- 6. Update the public.staff view to include doc_url
-- This will make the doc_url available through the public view as well
CREATE OR REPLACE VIEW public.staff AS
SELECT 
  s.id,
  s.name,
  s.role_title,
  s.contact,
  s.date_of_joining,
  s.monthly_salary,
  s.default_payment_mode,
  s.is_active,
  s.dp_url,
  COALESCE(s.doc_url, ARRAY[]::text[]) as doc_url,
  s.created_at,
  s.updated_at,
  s.branch_id
FROM payroll.staff s;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION update_staff TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_branch TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_ids TO authenticated;

-- 8. Grant permissions on the view
GRANT SELECT ON public.staff TO authenticated;
