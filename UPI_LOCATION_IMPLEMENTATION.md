# UPI Location-Specific Implementation

This document explains the implementation of location-specific UPI accounts in the Peta Parking UI system.

## Overview

Previously, UPI accounts were shared across all locations owned by an owner. With this update, UPI accounts are now location-specific, allowing owners to assign different UPI accounts to different locations. The system now also includes partnership locations, so owners can manage UPI accounts for locations they co-own with partners.

## Key Changes

### 1. Database Structure Updates

- Added `location_id` column to `owner_payment_details` table
- Created indexes for location-based queries
- Updated RLS policies for location-based access control
- Created helper functions and views for UPI account management
- Support for partnership locations via `location_owners` table

### 2. Frontend Updates

#### Manager Access Page (`src/pages/ManagerAccess.tsx`)
- Added location selector dropdown for UPI accounts
- Updated payment details form to require location selection for UPI
- Modified table to display location information
- Updated validation to ensure location is selected for UPI accounts
- **NEW**: Location dropdown now includes both owned and partnership locations

#### UPI Accounts Hook (`src/hooks/useUpiAccounts.ts`)
- Added location filtering for managers (only show UPI accounts for their assigned location)
- Enhanced data structure to include location information
- Updated queries to fetch location details
- **NEW**: Now fetches UPI accounts from both owned and partnership locations
- **NEW**: Accepts `selectedLocation` parameter to filter UPI accounts based on toolbar selection

#### Entry Components
- Updated UPI account selection displays to show location information
- Enhanced user experience with location context

## Database Migration

Run the following SQL script in your Supabase database:

```bash
# In your Supabase SQL editor, run:
\i update_upi_location_support.sql
```

This script will:
1. Add the `location_id` column to existing tables
2. Update existing UPI records with default locations
3. Create necessary indexes and policies
4. Set up helper functions and views

## User Experience Changes

### For Owners
- **Before**: UPI accounts were shared across all locations
- **After**: UPI accounts are location-specific
- Each UPI account must be assigned to a specific location
- Can still have multiple UPI accounts per location
- Bank transfer and other payment methods remain shared
- **NEW**: Can now manage UPI accounts for partnership locations they co-own

### For Managers
- **Before**: Could see all UPI accounts from the owner
- **After**: Only see UPI accounts assigned to their specific location
- Better security and clarity about which payment methods they can use

## Implementation Details

### Location Selection
- Location dropdown appears when UPI payment method is selected
- Only shows locations the owner has access to (owned + partnerships)
- Required field for UPI accounts
- **NEW**: Automatically includes partnership locations from `location_owners` table
- **NEW**: UPI accounts are dynamically filtered based on the selected location in the toolbar

### Data Validation
- UPI accounts must have a location assigned
- Form validation prevents submission without location selection
- Backward compatibility maintained for existing records

### Security
- Managers can only access UPI accounts for their assigned location
- RLS policies enforce location-based access control
- Owners maintain full control over their UPI accounts

## Benefits

1. **Better Organization**: UPI accounts are clearly associated with specific locations
2. **Improved Security**: Managers only see relevant payment methods
3. **Flexibility**: Different locations can have different UPI accounts
4. **Scalability**: Easy to manage multiple locations with different payment setups
5. **Audit Trail**: Clear tracking of which UPI account was used at which location
6. **Partnership Support**: Co-owners can manage UPI accounts for shared locations
7. **Unified Management**: Single interface for both owned and partnership locations
8. **Dynamic Filtering**: UPI accounts automatically update based on toolbar location selection

## Testing

### Test Scenarios
1. **Owner creates UPI account**: Verify location selection is required
2. **Manager access**: Verify only location-specific UPI accounts are visible
3. **Multiple locations**: Verify different UPI accounts can be assigned to different locations
4. **Existing data**: Verify backward compatibility for existing UPI accounts
5. **Partnership locations**: Verify UPI accounts can be created for partnership locations
6. **Mixed ownership**: Verify both owned and partnership locations appear in dropdown
7. **Toolbar location change**: Verify UPI accounts update when toolbar location changes
8. **UPI account reset**: Verify UPI account selection resets when location changes

### Test Cases
- [ ] UPI account creation with location selection
- [ ] UPI account editing with location changes
- [ ] Manager access to location-specific UPI accounts
- [ ] Validation errors for missing location
- [ ] Display of location information in UPI selection dropdowns
- [ ] Partnership locations appear in location dropdown
- [ ] UPI accounts can be created for partnership locations
- [ ] Mixed ownership locations (owned + partnerships) display correctly
- [ ] UPI accounts filter based on toolbar location selection
- [ ] UPI account selection resets when toolbar location changes
- [ ] Dynamic UPI account updates across all entry components

## Future Enhancements

1. **Bulk Operations**: Add/remove UPI accounts for multiple locations
2. **Location Templates**: Pre-configure UPI accounts for new locations
3. **Analytics**: Track UPI usage by location
4. **Notifications**: Alert owners when UPI accounts need attention

## Troubleshooting

### Common Issues
1. **Location not showing in dropdown**: Check user permissions and location access
2. **UPI accounts not loading**: Verify RLS policies are correctly applied
3. **Validation errors**: Ensure location is selected for UPI payment method

### Debug Steps
1. Check browser console for errors
2. Verify database policies are active
3. Test with different user roles
4. Check location assignments in database

## Support

For issues or questions regarding this implementation:
1. Check the database migration script
2. Verify RLS policies are correctly applied
3. Test with different user roles and permissions
4. Review the updated component code
