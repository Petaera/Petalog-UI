-- Apply the manager UPI access fix
-- Run this script in your Supabase SQL editor

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Owners can view all payment details from their locations" ON owner_payment_details;
DROP POLICY IF EXISTS "Users can view payment details from their accessible locations" ON owner_payment_details;

-- Step 2: Create a simple policy that works for both owners and managers
CREATE POLICY "owners_and_managers_can_view_payment_details" ON owner_payment_details
  FOR SELECT USING (
    -- Owners can view their own payment details
    (auth.uid() = owner_id)
    OR
    -- Managers can view payment details from their assigned location
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role ILIKE '%manager%'
      AND users.assigned_location = owner_payment_details.location_id
    )
  );

-- Step 3: Verify the policy was created
SELECT 'Policy check' as status, count(*) as policy_count
FROM pg_policies 
WHERE tablename = 'owner_payment_details' 
AND policyname = 'owners_and_managers_can_view_payment_details';

-- Step 4: Test with a sample query (this should work for managers)
SELECT 'Sample UPI accounts' as status, count(*) as upi_count
FROM owner_payment_details 
WHERE payment_method = 'upi' AND is_active = true;
