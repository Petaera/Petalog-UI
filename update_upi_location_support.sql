-- Update the owner_payment_details table to support location-specific UPI accounts
-- This script adds location_id support and updates existing UPI records

-- Add location_id column if it doesn't exist
ALTER TABLE owner_payment_details 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_owner_payment_details_location_id ON owner_payment_details(location_id);

-- Update existing UPI records to have a default location (for backward compatibility)
-- This will assign UPI accounts to the owner's first location
UPDATE owner_payment_details 
SET location_id = (
  SELECT l.id 
  FROM locations l 
  WHERE l.own_id = owner_payment_details.owner_id 
  LIMIT 1
)
WHERE payment_method = 'upi' 
AND location_id IS NULL;

-- Update RLS policies to allow proper access based on location
DROP POLICY IF EXISTS "Owners can view all payment details from their locations" ON owner_payment_details;
DROP POLICY IF EXISTS "Users can insert their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Users can update their own payment details" ON owner_payment_details;
DROP POLICY IF EXISTS "Users can delete their own payment details" ON owner_payment_details;

-- New policies for location-based access control
-- Owners can view payment details from locations they own
-- Managers can view payment details from their assigned location
CREATE POLICY "Users can view payment details from their accessible locations" ON owner_payment_details
  FOR SELECT USING (
    -- Owners can view payment details from locations theay own
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

-- Users can insert their own payment details
CREATE POLICY "Users can insert their own payment details" ON owner_payment_details
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own payment details
CREATE POLICY "Users can update their own payment details" ON owner_payment_details
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own payment details
CREATE POLICY "Users can delete their own payment details" ON owner_payment_details
  FOR DELETE USING (auth.uid() = owner_id);

-- Create a function to get UPI accounts for a specific location
CREATE OR REPLACE FUNCTION get_location_upi_accounts(location_uuid UUID)
RETURNS TABLE (
  id UUID,
  account_name TEXT,
  upi_id TEXT,
  is_active BOOLEAN,
  qr_code_url TEXT,
  location_id UUID,
  location_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    opd.id,
    opd.account_name,
    opd.upi_id,
    opd.is_active,
    opd.qr_code_url,
    opd.location_id,
    l.name as location_name
  FROM owner_payment_details opd
  LEFT JOIN locations l ON opd.location_id = l.id
  WHERE opd.payment_method = 'upi'
    AND opd.is_active = true
    AND opd.location_id = location_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_location_upi_accounts(UUID) TO authenticated;

-- Create a view for easier UPI account management
CREATE OR REPLACE VIEW upi_accounts_with_locations AS
SELECT 
  opd.id,
  opd.owner_id,
  opd.account_name,
  opd.upi_id,
  opd.is_active,
  opd.qr_code_url,
  opd.location_id,
  l.name as location_name,
  u.email as owner_email
FROM owner_payment_details opd
LEFT JOIN locations l ON opd.location_id = l.id
LEFT JOIN auth.users u ON opd.owner_id = u.id
WHERE opd.payment_method = 'upi';

-- Grant select permission on the view
GRANT SELECT ON upi_accounts_with_locations TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN owner_payment_details.location_id IS 'Location ID for location-specific payment methods like UPI';
COMMENT ON FUNCTION get_location_upi_accounts(UUID) IS 'Get all active UPI accounts for a specific location';
COMMENT ON VIEW upi_accounts_with_locations IS 'View for managing UPI accounts with location information';
