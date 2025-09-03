-- Fix the location_id foreign key constraint issue
-- Make location_id nullable and update the constraint

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE owner_payment_details 
DROP CONSTRAINT IF EXISTS owner_payment_details_location_id_fkey;

-- Make location_id nullable (it should already be nullable, but let's make sure)
ALTER TABLE owner_payment_details 
ALTER COLUMN location_id DROP NOT NULL;

-- Re-add the foreign key constraint with proper handling for NULL values
ALTER TABLE owner_payment_details 
ADD CONSTRAINT owner_payment_details_location_id_fkey 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Update existing records to have NULL location_id for owners
UPDATE owner_payment_details 
SET location_id = NULL 
WHERE user_role = 'owner' AND location_id IS NOT NULL;

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
  location_id, 
  payment_method 
FROM owner_payment_details;
