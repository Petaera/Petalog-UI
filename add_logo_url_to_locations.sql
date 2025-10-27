-- Add logo_url column to locations table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.locations.logo_url IS 'URL of the location logo image stored in Supabase storage';

