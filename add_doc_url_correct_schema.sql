-- Add document support to payroll.staff table and functions
-- Based on actual schema: id, name, role_title, is_active, branch_id

-- 1. Add doc_url column to the actual payroll.staff table
ALTER TABLE payroll.staff ADD COLUMN IF NOT EXISTS doc_url text[];

-- 2. Drop existing functions first (since we're changing the return type)
DROP FUNCTION IF EXISTS get_staff_by_branch(uuid);
DROP FUNCTION IF EXISTS get_staff_by_ids(uuid[]);
DROP FUNCTION IF EXISTS update_staff(uuid, text, text, text, date, numeric, text, boolean, text);

-- 3. Create or replace update_staff function to support doc_url
-- Note: Only updating fields that exist in the actual schema
CREATE OR REPLACE FUNCTION update_staff(
  staff_id_param uuid,
  name_param text DEFAULT NULL,
  role_title_param text DEFAULT NULL,
  is_active_param boolean DEFAULT NULL,
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
    is_active = COALESCE(is_active_param, is_active),
    doc_url = COALESCE(doc_url_param, doc_url)
  WHERE id = staff_id_param;
END;
$$;

-- 4. Create get_staff_by_branch function with doc_url
-- Only including fields that exist in the actual schema
CREATE OR REPLACE FUNCTION get_staff_by_branch(branch_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  role_title text,
  is_active boolean,
  branch_id uuid,
  doc_url text[]
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
    s.is_active,
    s.branch_id,
    COALESCE(s.doc_url, ARRAY[]::text[]) as doc_url
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
  is_active boolean,
  branch_id uuid,
  doc_url text[]
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
    s.is_active,
    s.branch_id,
    COALESCE(s.doc_url, ARRAY[]::text[]) as doc_url
  FROM payroll.staff s
  WHERE s.id = ANY(staff_ids)
  ORDER BY s.name;
END;
$$;

-- 6. Update the public.staff view to include doc_url
-- Only including fields that exist in the actual schema
CREATE OR REPLACE VIEW public.staff AS
SELECT 
  s.id,
  s.name,
  s.role_title,
  s.is_active,
  s.branch_id,
  COALESCE(s.doc_url, ARRAY[]::text[]) as doc_url
FROM payroll.staff s;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION update_staff TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_branch TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_ids TO authenticated;

-- 8. Grant permissions on the view
GRANT SELECT ON public.staff TO authenticated;
