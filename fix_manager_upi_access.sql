-- Fix RLS policy for manager UPI account access
-- SIMPLE LOGIC: Managers can access UPI accounts from their assigned location

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Owners can view all payment details from their locations" ON owner_payment_details;

-- Create new policy that allows both owners and managers to access payment details
CREATE POLICY "Users can view payment details from their accessible locations" ON owner_payment_details
  FOR SELECT USING (
    -- Owners can view payment details from locations they own
    (auth.uid() = owner_id)
    OR
    -- Managers can view payment details from their assigned location
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager'
      AND users.assigned_location = owner_payment_details.location_id
    )
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'owner_payment_details' 
AND policyname = 'Users can view payment details from their accessible locations';
