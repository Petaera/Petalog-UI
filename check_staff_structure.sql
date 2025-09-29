-- Check the structure of the staff table/view
-- This will help us understand how to add the doc_url column

-- 1. Check if staff is a table or view
SELECT 
    table_type,
    table_schema,
    table_name
FROM information_schema.tables 
WHERE table_name = 'staff';

-- 2. If it's a view, show the view definition
SELECT 
    view_definition
FROM information_schema.views 
WHERE table_schema = 'payroll' 
AND table_name = 'staff';

-- 3. Check what columns currently exist in staff
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'payroll' 
AND table_name = 'staff'
ORDER BY ordinal_position;

-- 4. Check if there are any underlying tables that staff might be based on
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'payroll' 
AND (table_name LIKE '%staff%' OR table_name LIKE '%employee%' OR table_name LIKE '%worker%');
