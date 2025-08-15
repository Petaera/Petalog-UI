-- Fix Supabase permissions and RLS policies for logs-man table
-- This script will enable proper delete operations for authenticated users

-- 1. First, let's check if RLS is enabled on the logs-man table
-- If RLS is enabled, we need to create proper policies

-- 2. Create a policy that allows users to delete logs they have access to
-- This policy will work for both owners and managers

-- Policy for owners: Can delete logs from locations they own
CREATE POLICY "Users can delete logs from their owned locations" ON "logs-man"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM locations 
    WHERE locations.id = "logs-man".location_id 
    AND locations.own_id = auth.uid()
  )
);

-- Policy for managers: Can delete logs from their assigned location
CREATE POLICY "Managers can delete logs from their assigned location" ON "logs-man"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'manager'
    AND users.assigned_location = "logs-man".location_id
  )
);

-- Policy for users who created the log: Can delete their own logs
CREATE POLICY "Users can delete logs they created" ON "logs-man"
FOR DELETE USING (
  "logs-man".created_by = auth.uid()
);

-- 3. Also ensure we have proper SELECT policies for the delete operation to work
-- The delete operation needs to be able to read the log first

-- Policy for reading logs (needed for delete operations)
CREATE POLICY "Users can read logs from their accessible locations" ON "logs-man"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM locations 
    WHERE locations.id = "logs-man".location_id 
    AND (
      -- Owner can read from their locations
      locations.own_id = auth.uid()
      OR
      -- Manager can read from their assigned location
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'manager'
        AND users.assigned_location = "logs-man".location_id
      )
    )
  )
);

-- 4. Ensure the table has RLS enabled (this is usually enabled by default)
-- If you need to enable it manually:
-- ALTER TABLE "logs-man" ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions to the authenticated role
GRANT ALL ON "logs-man" TO authenticated;

-- 6. Create a function to check if user can delete a specific log
CREATE OR REPLACE FUNCTION can_delete_log(log_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "logs-man" lm
    JOIN locations loc ON loc.id = lm.location_id
    WHERE lm.id = log_id
    AND (
      -- Owner can delete from their locations
      loc.own_id = auth.uid()
      OR
      -- Manager can delete from their assigned location
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'manager'
        AND users.assigned_location = lm.location_id
      )
      OR
      -- User can delete logs they created
      lm.created_by = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Alternative: If you want to temporarily disable RLS for testing
-- (Only use this for development/testing, never in production)
-- ALTER TABLE "logs-man" DISABLE ROW LEVEL SECURITY;

-- 8. Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'logs-man';

-- 9. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'logs-man';
