-- Check the current schema and view definitions

-- 1. Check payroll.staff table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'payroll' 
AND table_name = 'staff'
ORDER BY ordinal_position;

-- 2. Check public.staff view definition
SELECT 
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'staff';

-- 3. Check if there are other tables that might contain staff details
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'payroll' 
AND table_name LIKE '%staff%';

-- 4. Check if there are any functions that return staff data
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%staff%';
