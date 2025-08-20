-- Create table for location-owner relationships (many-to-many)
-- This allows multiple owners to share the same location (partnerships)

CREATE TABLE IF NOT EXISTS location_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ownership_percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  is_primary_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, owner_id) -- Prevent duplicate owner-location pairs
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_location_owners_location_id ON location_owners(location_id);
CREATE INDEX IF NOT EXISTS idx_location_owners_owner_id ON location_owners(owner_id);
CREATE INDEX IF NOT EXISTS idx_location_owners_primary ON location_owners(is_primary_owner);

-- Enable Row Level Security
ALTER TABLE location_owners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Owners can view their location relationships
CREATE POLICY "Owners can view their location relationships" ON location_owners
  FOR SELECT USING (auth.uid() = owner_id);

-- Owners can view location relationships for locations they own
CREATE POLICY "Owners can view relationships for their locations" ON location_owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM location_owners lo2
      WHERE lo2.location_id = location_owners.location_id
      AND lo2.owner_id = auth.uid()
    )
  );

-- Owners can insert new location relationships for locations they own
CREATE POLICY "Owners can add partners to their locations" ON location_owners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM location_owners lo2
      WHERE lo2.location_id = location_owners.location_id
      AND lo2.owner_id = auth.uid()
    )
  );

-- Owners can update their own location relationships
CREATE POLICY "Owners can update their own relationships" ON location_owners
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their own location relationships
CREATE POLICY "Owners can remove themselves from locations" ON location_owners
  FOR DELETE USING (auth.uid() = owner_id);

-- Grant permissions to authenticated users
GRANT ALL ON location_owners TO authenticated;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_location_owners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_owners_updated_at
  BEFORE UPDATE ON location_owners
  FOR EACH ROW
  EXECUTE FUNCTION update_location_owners_updated_at();

-- Now we need to migrate existing data from the current locations.own_id structure
-- This will preserve existing ownership while adding support for partnerships

-- First, let's add a temporary column to track the migration
ALTER TABLE locations ADD COLUMN IF NOT EXISTS migration_completed BOOLEAN DEFAULT false;

-- Insert existing owner-location relationships into the new table
INSERT INTO location_owners (location_id, owner_id, ownership_percentage, is_primary_owner)
SELECT 
  id as location_id,
  own_id as owner_id,
  100.00 as ownership_percentage,
  true as is_primary_owner
FROM locations 
WHERE own_id IS NOT NULL 
  AND migration_completed = false
  AND NOT EXISTS (
    SELECT 1 FROM location_owners 
    WHERE location_owners.location_id = locations.id 
    AND location_owners.owner_id = locations.own_id
  );

-- Mark migrated locations
UPDATE locations 
SET migration_completed = true 
WHERE own_id IS NOT NULL;

-- Create a view for backward compatibility (optional - can be removed later)
CREATE OR REPLACE VIEW locations_with_owners AS
SELECT 
  l.*,
  array_agg(lo.owner_id) as owner_ids,
  array_agg(lo.ownership_percentage) as ownership_percentages,
  array_agg(lo.is_primary_owner) as is_primary_owners
FROM locations l
LEFT JOIN location_owners lo ON l.id = lo.location_id
GROUP BY l.id, l.name, l.address, l.created_at, l.own_id, l.migration_completed;

-- Create a function to get all owners for a location
CREATE OR REPLACE FUNCTION get_location_owners(p_location_id UUID)
RETURNS TABLE(
  owner_id UUID,
  ownership_percentage DECIMAL(5,2),
  is_primary_owner BOOLEAN,
  owner_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lo.owner_id,
    lo.ownership_percentage,
    lo.is_primary_owner,
    u.email as owner_email
  FROM location_owners lo
  JOIN auth.users u ON lo.owner_id = u.id
  WHERE lo.location_id = p_location_id
  ORDER BY lo.is_primary_owner DESC, lo.ownership_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user owns a location
CREATE OR REPLACE FUNCTION user_owns_location(p_user_id UUID, p_location_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM location_owners 
    WHERE owner_id = p_user_id AND location_id = p_location_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all locations for a user
CREATE OR REPLACE FUNCTION get_user_locations(p_user_id UUID)
RETURNS TABLE(
  location_id UUID,
  location_name TEXT,
  ownership_percentage DECIMAL(5,2),
  is_primary_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lo.location_id,
    l.name as location_name,
    lo.ownership_percentage,
    lo.is_primary_owner
  FROM location_owners lo
  JOIN locations l ON lo.location_id = l.id
  WHERE lo.owner_id = p_user_id
  ORDER BY lo.is_primary_owner DESC, lo.ownership_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_location_owners(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_owns_location(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_locations(UUID) TO authenticated;

-- Verify the migration
SELECT 
  'Migration Summary' as info,
  COUNT(*) as total_locations,
  COUNT(CASE WHEN own_id IS NOT NULL THEN 1 END) as locations_with_owners,
  COUNT(CASE WHEN migration_completed = true THEN 1 END) as migrated_locations
FROM locations;

SELECT 
  'Location Owners Summary' as info,
  COUNT(*) as total_relationships,
  COUNT(DISTINCT location_id) as unique_locations,
  COUNT(DISTINCT owner_id) as unique_owners
FROM location_owners;
