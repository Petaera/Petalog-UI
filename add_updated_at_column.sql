-- Add updated_at column to logs-man table
ALTER TABLE "logs-man" 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add a trigger to automatically update the updated_at column when a row is modified
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_logs_man_updated_at 
    BEFORE UPDATE ON "logs-man" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 