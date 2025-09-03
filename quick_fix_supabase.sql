-- Quick Fix for Supabase Delete Permissions
-- Run this in your Supabase SQL Editor

-- Option 1: Quick Test - Temporarily disable RLS (for development only)
-- This will allow all operations without restrictions
ALTER TABLE "logs-man" DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS but fix permissions
-- First, enable RLS
-- ALTER TABLE "logs-man" ENABLE ROW LEVEL SECURITY;

-- Then create a simple policy that allows authenticated users to delete
-- CREATE POLICY "Allow authenticated users to delete logs" ON "logs-man"
-- FOR DELETE TO authenticated USING (true);

-- Option 3: Grant all permissions to authenticated role
GRANT ALL ON "logs-man" TO authenticated;

-- Option 4: Check current table permissions
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_name = 'logs-man';

-- Option 5: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'logs-man';

-- After running any of these, test the delete functionality in your app
-- If Option 1 works, then the issue was RLS policies
-- If it still doesn't work, the issue is elsewhere in the code
