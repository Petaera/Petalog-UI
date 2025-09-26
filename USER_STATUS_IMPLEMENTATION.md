# User Status Implementation

This document explains the user status feature that controls whether users can log in to the system.

## Overview

The user status feature adds a `status` column to the `users` table that controls whether a user can log in. When `status` is `true`, the user can log in normally. When `status` is `false`, the user is blocked from logging in.

## Database Changes

### 1. Add Status Column

Run the migration script `add_status_column_to_users.sql` in your Supabase database:

```sql
-- Add status column to users table
ALTER TABLE users 
ADD COLUMN status BOOLEAN DEFAULT true NOT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN users.status IS 'Controls whether the user can log in. true = active, false = disabled';

-- Create an index on the status column for better query performance
CREATE INDEX idx_users_status ON users(status);
```

### 2. Column Details

- **Column Name**: `status`
- **Type**: `BOOLEAN`
- **Default Value**: `true` (all existing users remain active)
- **NOT NULL**: Yes (prevents null values)
- **Purpose**: Controls user login access

## Implementation Details

### Authentication Flow

1. **Login Process**:
   - User attempts to log in with email/password
   - System authenticates credentials with Supabase Auth
   - System queries `users` table to get user data including `status`
   - If user is NOT found in `users` table, login is blocked with "Your login is restricted" message
   - If `status = false`, login is blocked with "Your account has been disabled" message
   - If `status = true`, login proceeds normally

2. **Session Restoration**:
   - When user refreshes page or returns to app
   - System checks existing session
   - System queries `users` table to verify user exists and `status`
   - If user is NOT found in `users` table, user is signed out
   - If `status = false`, user is signed out
   - If `status = true`, user remains logged in

### Error Handling

- **Restricted Account**: Shows "Your login is restricted. Please contact support." (user not found in users table)
- **Disabled Account**: Shows "Your account has been disabled. Please contact support." (status = false)
- **Other Errors**: Shows generic "Login failed. Please check your credentials."

## Usage Examples

### Enable/Disable Users

```sql
-- Disable a user (prevent login)
UPDATE users SET status = false WHERE email = 'user@example.com';

-- Enable a user (allow login)
UPDATE users SET status = true WHERE email = 'user@example.com';

-- Check user status
SELECT email, status FROM users WHERE email = 'user@example.com';
```

### Manager Access Display

In the Manager Access page, users will see:
- **Active** badge (green) for users with `status = true`
- **Inactive** badge (gray) for users with `status = false`

The status is automatically updated when you change the `status` column in the database.

### Bulk Operations

```sql
-- Disable all users with a specific role
UPDATE users SET status = false WHERE role = 'worker';

-- Enable all users
UPDATE users SET status = true;
```

## Security Considerations

1. **Immediate Effect**: Status changes take effect immediately - disabled users are signed out on next request
2. **Session Invalidation**: Disabled users cannot maintain active sessions
3. **Default Behavior**: New users are created with `status = true` by default
4. **Admin Control**: Only database administrators can change user status

## Testing

### Test Cases

1. **Active User Login**: User with `status = true` can log in normally
2. **Disabled User Login**: User with `status = false` cannot log in
3. **Session Persistence**: Disabled user is signed out when page refreshes
4. **New User Creation**: New users are created with `status = true`
5. **Status Change**: User is immediately affected when status changes

### Test Commands

```sql
-- Test user creation (should be active by default)
INSERT INTO users (id, email, role) VALUES (gen_random_uuid(), 'test@example.com', 'owner');

-- Test status change
UPDATE users SET status = false WHERE email = 'test@example.com';

-- Verify status
SELECT email, status FROM users WHERE email = 'test@example.com';
```

## Migration Notes

- **Existing Users**: All existing users will have `status = true` due to the default value
- **No Data Loss**: This change is additive and doesn't affect existing functionality
- **Backward Compatibility**: The system gracefully handles users without the status column during migration
