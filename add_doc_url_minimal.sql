-- Minimal approach to add doc_url support
-- Just add the column and update functions without changing existing structure

-- 1. Add doc_url column to payroll.staff table
ALTER TABLE payroll.staff ADD COLUMN IF NOT EXISTS doc_url text[];

-- 2. Create a simple function to update doc_url only
CREATE OR REPLACE FUNCTION update_staff_documents(
  staff_id_param uuid,
  doc_url_param text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payroll.staff
  SET
    doc_url = doc_url_param
  WHERE id = staff_id_param;
END;
$$;

-- 3. Create a function to get staff with documents
CREATE OR REPLACE FUNCTION get_staff_with_documents(branch_id_param uuid)
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION update_staff_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_with_documents TO authenticated;
