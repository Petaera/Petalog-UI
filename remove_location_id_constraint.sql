-- Remove location_id constraint and make owner_payment_details table owner-based only
-- This means all locations owned by an owner will share the same payment details

-- First, drop the existing RLS policies that depend on location_id
DROP POLICY IF EXISTS "Owners can view all payment details from their locations" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can manage all payment details from their locations" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can view their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can insert their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can update their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can delete their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Users can view owner payment details" ON owner_payment_details;

-- Now drop the existing foreign key constraint if it exists
ALTER TABLE owner_payment_details 
DROP CONSTRAINT IF EXISTS owner_payment_details_location_id_fkey;

-- Drop the location_id column since we don't need it anymore
ALTER TABLE owner_payment_details 
DROP COLUMN IF EXISTS location_id;

-- Update existing records to ensure they're owner-based
UPDATE owner_payment_details 
SET user_role = 'owner' 
WHERE user_role IS NULL OR user_role = 'manager';

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'owner_payment_details' 
ORDER BY ordinal_position;

-- Check existing data
SELECT 
  id, 
  owner_id, 
  user_role, 
  payment_method,
  account_name
FROM owner_payment_details;

-- Create simple owner-based RLS policies
-- Owners can view their own payment details
CREATE POLICY "Owners can view their own payment details" ON owner_payment_details
  FOR SELECT USING (auth.uid() = owner_id);

-- Owners can insert their own payment details
CREATE POLICY "Owners can insert their own payment details" ON owner_payment_details
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own payment details
CREATE POLICY "Owners can update their own payment details" ON owner_payment_details
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their own payment details
CREATE POLICY "Owners can delete their own payment details" ON owner_payment_details
  FOR DELETE USING (auth.uid() = owner_id);

-- For now, we'll handle manager access in the application logic
-- rather than complex RLS policies
