-- Add status column to users table (single statement version)
-- This column will control whether a user can log in or not

DO $$
BEGIN
    -- Add the status column with default value true
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true NOT NULL;
    
    -- Add a comment to explain the column
    COMMENT ON COLUMN users.status IS 'Controls whether the user can log in. true = active, false = disabled';
    
    -- Create an index on the status column for better query performance
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    
    RAISE NOTICE 'Status column added successfully to users table';
END $$;
