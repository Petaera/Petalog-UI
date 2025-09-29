-- Check permissions and policies for payroll tables

-- 1. Check what tables exist in payroll schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'payroll';

-- 2. Check RLS policies on payroll tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'payroll';

-- 3. Check if payroll.staff has the doc_url column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'payroll' 
AND table_name = 'staff'
ORDER BY ordinal_position;

-- 4. Test if we can query payroll.staff
SELECT COUNT(*) as staff_count FROM payroll.staff LIMIT 1;
