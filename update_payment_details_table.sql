-- Update the owner_payment_details table to support both owners and managers
-- Add a user_role column to distinguish between owner and manager records

-- Add user_role column if it doesn't exist
ALTER TABLE owner_payment_details 
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'owner' CHECK (user_role IN ('owner', 'manager'));

-- Add location_id column to link payment details to specific locations
ALTER TABLE owner_payment_details 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Update existing records to have user_role = 'owner' (for backward compatibility)
UPDATE owner_payment_details 
SET user_role = 'owner' 
WHERE user_role IS NULL;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_owner_payment_details_location_id ON owner_payment_details(location_id);

-- Update RLS policies to allow proper access
DROP POLICY IF EXISTS "Owners can view their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can insert their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can update their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Owners can delete their own payment details" ON owner_payment_details;

-- New policies for better access control
-- Owners can view all payment details from their locations
CREATE POLICY "Owners can view all payment details from their locations" ON owner_payment_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM locations 
      WHERE locations.id = owner_payment_details.location_id 
      AND locations.own_id = auth.uid()
    )
  );

-- Users can insert their own payment details
CREATE POLICY "Users can insert their own payment details" ON owner_payment_details
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own payment details
CREATE POLICY "Users can update their own payment details" ON owner_payment_details
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own payment details
CREATE POLICY "Users can delete their own payment details" ON owner_payment_details
  FOR DELETE USING (auth.uid() = owner_id);

-- Owners can also update/delete payment details from their locations
CREATE POLICY "Owners can manage all payment details from their locations" ON owner_payment_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM locations 
      WHERE locations.id = owner_payment_details.location_id 
      AND locations.own_id = auth.uid()
    )
  );
