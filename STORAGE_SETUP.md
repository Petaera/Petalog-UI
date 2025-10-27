# Location Logo Storage Setup Guide

This guide explains how to set up Supabase storage for location logo uploads.

## Prerequisites

- Access to your Supabase project dashboard
- SQL Editor access in Supabase

## Setup Steps

### Step 1: Run the Database Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `add_logo_url_to_locations.sql`
5. Click **Run** to execute the migration

This will add the `logo_url` column to the `locations` table.

### Step 2: Create the Storage Bucket

1. Stay in the **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `create_logo_storage_bucket.sql`
4. Click **Run** to execute

This will:
- Create a public `uploads` bucket
- Set file size limit to 5MB
- Allow only image files (PNG, JPEG, JPG, GIF, WEBP)
- Configure policies for authenticated users to upload, update, and delete files
- Allow public read access to uploaded logos

### Step 3: Verify Setup

You can verify the setup by:

1. Going to **Storage** in your Supabase dashboard
2. You should see the `uploads` bucket listed
3. Click on it to view files (it will be empty initially)

## Alternative Manual Setup

If you prefer to set up the bucket through the Supabase UI:

### Via Supabase Dashboard

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Configure as follows:
   - **Name**: `uploads`
   - **Public bucket**: ✅ Yes (check this)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/gif, image/webp`
4. Click **Create bucket**

### Set Up Storage Policies

After creating the bucket, go to **Storage** → **Policies** and create these policies:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload logo images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);
```

#### Policy 2: Allow public read access
```sql
CREATE POLICY "Allow public read access to logo images"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);
```

#### Policy 3: Allow authenticated users to update
```sql
CREATE POLICY "Allow authenticated users to update logo images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);
```

#### Policy 4: Allow authenticated users to delete
```sql
CREATE POLICY "Allow authenticated users to delete logo images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'location-logos'
);
```

## File Structure

Uploaded logos will be stored in:
```
uploads/
└── location-logos/
    ├── {locationId}-{timestamp}.{ext}
    ├── {locationId}-{timestamp}.{ext}
    └── ...
```

## Usage

Once set up:
1. Go to **Profile Settings** in the application
2. Select your location from the dropdown (if you have multiple locations)
3. Click **Upload Logo**
4. Select an image file (PNG, JPG, GIF, or WEBP up to 2MB)
5. The logo will appear in the sidebar next to "PetaLog"

## Troubleshooting

### Error: "Bucket not found"
Run the `create_logo_storage_bucket.sql` file in the Supabase SQL Editor.

### Error: "new row violates row-level security policy"
Make sure you've created the storage policies as described above.

### Error: "File size too large"
Reduce the image size to under 2MB before uploading.

### Logo not appearing in sidebar
1. Check browser console for errors
2. Verify the logo URL is saved in the `locations` table
3. Ensure the `logo_url` column exists in the `locations` table

## Security Considerations

- Only authenticated users can upload, update, or delete logo images
- Public users can read/display the logos
- File sizes are limited to 2MB on the client side and 5MB on the server
- Only image files are allowed

