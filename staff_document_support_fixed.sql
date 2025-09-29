-- Add document support to staff table and functions
-- This script handles the case where staff might be a view

-- First, let's check if staff is a view and find the underlying table
-- If staff is a view, we need to add the column to the underlying table

-- Check if staff is a view
DO $$
DECLARE
    is_view boolean;
    underlying_table text;
BEGIN
    -- Check if staff is a view
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = 'payroll' 
        AND table_name = 'staff'
    ) INTO is_view;
    
    IF is_view THEN
        RAISE NOTICE 'staff is a view, need to find underlying table';
        -- Try to find the underlying table by checking the view definition
        SELECT source_table INTO underlying_table
        FROM (
            SELECT 
                CASE 
                    WHEN view_definition LIKE '%FROM%' THEN 
                        regexp_replace(
                            regexp_replace(view_definition, '.*FROM\s+(\w+\.)?(\w+)', '\2', 'g'),
                            '.*JOIN\s+(\w+\.)?(\w+)', '\2', 'g'
                        )
                    ELSE 'staff'
                END as source_table
            FROM information_schema.views 
            WHERE table_schema = 'payroll' 
            AND table_name = 'staff'
        ) t
        WHERE source_table IS NOT NULL
        LIMIT 1;
        
        RAISE NOTICE 'Underlying table might be: %', underlying_table;
    ELSE
        RAISE NOTICE 'staff is a table, can add column directly';
    END IF;
END $$;

-- Try to add doc_url column to payroll.staff (if it's a table)
-- If this fails, we'll need to find the actual underlying table
DO $$
BEGIN
    ALTER TABLE payroll.staff ADD COLUMN IF NOT EXISTS doc_url text[];
    RAISE NOTICE 'Successfully added doc_url column to payroll.staff';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add column to payroll.staff: %', SQLERRM;
        -- The table might be in a different schema or be a view
        -- We'll need to check the actual structure
END $$;

-- Alternative: Try adding to public.staff if payroll.staff is a view
DO $$
BEGIN
    ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS doc_url text[];
    RAISE NOTICE 'Successfully added doc_url column to public.staff';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add column to public.staff: %', SQLERRM;
END $$;

-- Create or replace update_staff function to support doc_url
-- This function will work regardless of whether staff is a table or view
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
  -- Try to update payroll.staff first
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
    
    -- If no rows were updated, try public.staff
    IF NOT FOUND THEN
      UPDATE public.staff
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
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error updating staff: %', SQLERRM;
  END;
END;
$$;

-- Update get_staff_by_branch function to include doc_url
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

-- Update get_staff_by_ids function to include doc_url
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_staff TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_branch TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_ids TO authenticated;
