-- Create table for owner payment details
CREATE TABLE IF NOT EXISTS owner_payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'upi', 'cash', 'check', 'other')),
  account_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  upi_id TEXT,
  qr_code_url TEXT,
  qr_code_file_path TEXT,
  additional_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_owner_payment_details_owner_id ON owner_payment_details(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_payment_details_active ON owner_payment_details(is_active);

-- Enable Row Level Security
ALTER TABLE owner_payment_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Owners can only see their own payment details
CREATE POLICY "Owners can view their own payment details" ON owner_payment_details
  FOR SELECT USING (auth.uid() = owner_id);

-- Owners can insert their own payment details
CREATE POLICY "Owners can insert their own payment details" ON owner_payment_details
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own payment details
CREATE POLICY "Owners can update their own payment details" ON owner_payment_details
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their own payment details
CREATE POLICY "Owners can delete their own payment details" ON owner_payment_details
  FOR DELETE USING (auth.uid() = owner_id);

-- Grant permissions to authenticated users
GRANT ALL ON owner_payment_details TO authenticated;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_owner_payment_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_owner_payment_details_updated_at
  BEFORE UPDATE ON owner_payment_details
  FOR EACH ROW
  EXECUTE FUNCTION update_owner_payment_details_updated_at();

-- Insert sample data (optional - for testing)
-- INSERT INTO owner_payment_details (owner_id, payment_method, account_name, account_number, bank_name, ifsc_code)
-- VALUES ('your-owner-id-here', 'bank_transfer', 'Sample Account', '1234567890', 'Sample Bank', 'SMPL0001234');
