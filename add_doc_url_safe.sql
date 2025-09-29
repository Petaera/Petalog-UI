-- Safe approach to add doc_url support
-- Works with existing functions and schema

-- 1. Add doc_url column to payroll.staff table
ALTER TABLE payroll.staff ADD COLUMN IF NOT EXISTS doc_url text[];

-- 2. First, let's check what parameters the existing update_staff function accepts
-- We'll need to see the current function signature before modifying it

-- 3. Create a simple function to update just the doc_url field
-- This is safer than modifying the existing update_staff function
CREATE OR REPLACE FUNCTION update_staff_doc_url(
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION update_staff_doc_url TO authenticated;

-- 5. Test the column was added successfully
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'payroll' 
AND table_name = 'staff'
AND column_name = 'doc_url';
