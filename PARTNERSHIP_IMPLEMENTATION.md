# Location Partnership System Implementation Guide

This guide explains how to implement the new location partnership system that allows multiple owners to share the same location.

## Overview

The partnership system transforms the current one-to-many relationship (one owner, many locations) into a many-to-many relationship (many owners can share the same location). This enables business partnerships where multiple people can co-own and manage parking locations.

## Database Changes

### 1. Run the Migration Script

Execute the `create_location_owners_table.sql` script in your Supabase database:

```bash
# In your Supabase SQL editor, run:
\i create_location_owners_table.sql
```

This script will:
- Create a new `location_owners` table
- Migrate existing data from `locations.own_id`
- Set up Row Level Security (RLS) policies
- Create helper functions for managing partnerships

### 2. New Database Structure

#### `location_owners` Table
```sql
CREATE TABLE location_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ownership_percentage DECIMAL(5,2) DEFAULT 100.00,
  is_primary_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, owner_id)
);
```

#### Key Features:
- **Ownership Percentage**: Each partner has a defined ownership stake (0-100%)
- **Primary Owner**: One owner per location has full management rights
- **Unique Constraints**: Prevents duplicate owner-location relationships
- **Cascade Deletion**: Removing a location removes all ownership records

### 3. Helper Functions

The system provides several database functions:

- `get_location_owners(location_id)`: Get all owners for a specific location
- `user_owns_location(user_id, location_id)`: Check if a user owns a location
- `get_user_locations(user_id)`: Get all locations a user owns

## Frontend Implementation

### 1. New Components

#### `LocationPartnerships.tsx`
- Manages partnerships for a specific location
- Allows adding/removing partners
- Sets ownership percentages
- Primary owner controls

#### `LocationPartnershipsPage.tsx`
- Main page for managing partnerships
- Location selector
- Integration with existing navigation

### 2. Updated Components

#### `utils.ts`
- Modified `getLocationFilter()` to work with partnerships
- Uses `location_owners` table instead of `locations.own_id`

#### `AppSidebar.tsx`
- Added "Partnerships" navigation link
- Accessible to both owners and managers

### 3. Routing

Added new route in `App.tsx`:
```tsx
<Route 
  path="/location-partnerships" 
  element={
    <ProtectedRoute requiredRole={["owner", "manager"]}>
      <LocationPartnershipsPage />
    </ProtectedRoute>
  } 
/>
```

## How It Works

### 1. Adding Partners

1. **Primary Owner** navigates to Partnerships page
2. **Selects Location** from their owned locations
3. **Adds Partner** by email with ownership percentage
4. **System Validates** total ownership doesn't exceed 100%

### 2. Managing Partnerships

- **Primary Owner**: Can add/remove partners, adjust percentages
- **Partners**: Can view partnership details, adjust their own percentage
- **Ownership Control**: Total must equal 100% across all partners

### 3. Access Control

- **RLS Policies**: Ensure users only see their own partnerships
- **Role-Based Access**: Owners and managers can access based on ownership
- **Data Isolation**: Partners only see data for locations they own

## Migration Process

### 1. Automatic Migration

The script automatically:
- Creates the new table structure
- Migrates existing `locations.own_id` data
- Sets primary owners for existing locations
- Maintains backward compatibility

### 2. Verification

Run the test script to verify migration:
```bash
\i test_partnerships.sql
```

This will check:
- Table creation
- Data migration
- Function availability
- RLS policies
- Data integrity

## Usage Examples

### 1. Adding a New Partner

```typescript
// In LocationPartnerships component
const addPartner = async () => {
  const { error } = await supabase
    .from('location_owners')
    .insert([{
      location_id: locationId,
      owner_id: newPartnerId,
      ownership_percentage: 30,
      is_primary_owner: false
    }]);
};
```

### 2. Checking User Access

```typescript
// Using the helper function
const { data: userLocations } = await supabase
  .rpc('get_user_locations', { p_user_id: userId });
```

### 3. Location Filtering

```typescript
// Updated utility function automatically handles partnerships
const filter = getLocationFilter(user);
const filteredQuery = filter.query(baseQuery);
```

## Security Considerations

### 1. Row Level Security

- Users can only see their own partnerships
- Primary owners can manage partnerships for their locations
- Partners can only modify their own ownership percentage

### 2. Data Validation

- Ownership percentages must sum to 100%
- Only one primary owner per location
- Unique owner-location pairs

### 3. Access Control

- Primary owners have full management rights
- Partners have read access and limited modification rights
- Managers can view partnerships for their assigned location

## Testing

### 1. Database Tests

Run the test script to verify:
- Table structure
- Data migration
- Function availability
- Policy enforcement

### 2. Frontend Tests

Test the following scenarios:
- Adding new partners
- Removing partners
- Adjusting ownership percentages
- Access control for different user roles

### 3. Integration Tests

Verify that:
- Location filtering works with partnerships
- Reports include partnership data
- Navigation works correctly
- Error handling is robust

## Troubleshooting

### Common Issues

1. **Migration Failed**: Check if `locations` table has `own_id` column
2. **RLS Errors**: Ensure policies are created correctly
3. **Function Errors**: Verify function permissions are granted
4. **Frontend Errors**: Check component imports and routing

### Debug Queries

```sql
-- Check table structure
\d location_owners

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'location_owners';

-- Check function availability
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%location%';
```

## Future Enhancements

### 1. Advanced Features

- **Profit Sharing**: Automatic calculations based on ownership
- **Partnership Agreements**: Document management
- **Audit Trail**: Track partnership changes
- **Notifications**: Alert partners of changes

### 2. Integration Points

- **Financial Reports**: Include partnership breakdowns
- **Analytics**: Partnership performance metrics
- **API Endpoints**: External system integration
- **Mobile App**: Partnership management on mobile

## Support

For issues or questions:
1. Check the test script output
2. Verify database permissions
3. Review RLS policy configuration
4. Check component console logs

The partnership system is designed to be backward compatible, so existing functionality will continue to work while new partnership features become available.

