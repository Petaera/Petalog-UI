-- Add status column to users table
-- This column will control whether a user can log in or not

-- Add the status column with default value true
ALTER TABLE users 
ADD COLUMN status BOOLEAN DEFAULT true NOT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN users.status IS 'Controls whether the user can log in. true = active, false = disabled';

-- Create an index on the status column for better query performance
CREATE INDEX idx_users_status ON users(status);

-- Optional: Update any existing users to have status = true (they should already be true due to default)
-- UPDATE users SET status = true WHERE status IS NULL;
