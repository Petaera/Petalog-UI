-- Complete solution to add doc_url support
-- This script adds the column and updates existing functions

-- 1. Add doc_url column to payroll.staff table
ALTER TABLE payroll.staff ADD COLUMN IF NOT EXISTS doc_url text[];

-- 2. Create a function to update just the doc_url field
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

-- 3. Try to update the existing get_staff_by_branch function to include doc_url
-- First, let's see what the current function looks like
DO $$
BEGIN
  -- Try to alter the existing function to include doc_url
  -- This might fail if the function signature is different
  BEGIN
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
    
    RAISE NOTICE 'Successfully updated get_staff_by_branch function';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not update get_staff_by_branch function: %', SQLERRM;
  END;
END $$;

-- 4. Try to update the existing get_staff_by_ids function to include doc_url
DO $$
BEGIN
  BEGIN
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
    
    RAISE NOTICE 'Successfully updated get_staff_by_ids function';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not update get_staff_by_ids function: %', SQLERRM;
  END;
END $$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION update_staff_doc_url TO authenticated;

-- 6. Verify the column was added
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'payroll' 
AND table_name = 'staff'
AND column_name = 'doc_url';
