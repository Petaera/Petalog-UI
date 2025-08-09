# Debug Panel Integration Guide

This guide will help you integrate the debug panel into your existing Peta Parking UI to investigate the "no location selected" issue for owners on Vercel.

## 🚀 Quick Integration

### 1. **Add Debug Panel to Your Layout Component**

In your main layout component (likely `src/components/layout/Layout.tsx`), add the debug panel temporarily:

```tsx
import { DebugPanel } from '@/components/debug/DebugPanel';

// Add this inside your Layout component, after the header
{process.env.NODE_ENV === 'development' && (
  <DebugPanel
    user={user}
    locations={locations}
    filteredLocations={filteredLocations}
    isLoading={isLoading}
    error={error}
  />
)}
```

### 2. **Add Debug Route (Optional)**

Add a debug route to your router for easier access:

```tsx
// In your router configuration
import { DebugPage } from '@/pages/DebugPage';

// Add this route
{
  path: '/debug',
  element: <DebugPage />
}
```

### 3. **Environment Check**

The debug panel will automatically detect if you're on:
- ✅ Localhost (development)
- 🌐 Vercel (production)
- 🔍 Other hosting

## 🔍 What the Debug Panel Shows

### **Environment Information**
- Vite mode and Node environment
- Supabase environment variables status
- Current host (localhost vs Vercel)
- Timestamp of debug session

### **User Information**
- User ID, email, role
- `own_id` and `assigned_location` values
- Whether user data is loaded

### **Location Information**
- Total locations fetched
- Filtered locations count
- Loading and error states
- Filter logic applied

### **Database Connection Test**
- Test Supabase connection
- Show connection errors
- Display query results

## 🎯 How to Use for Your Issue

### **Step 1: Deploy Debug Version**
1. Add the debug panel to your layout
2. Deploy to Vercel
3. Login as an owner user

### **Step 2: Check Debug Output**
Look for these key indicators:

```
❌ User.own_id: Not loaded
❌ Total Locations: 0
❌ Filtered Locations: 0
❌ Database connection failed
```

### **Step 3: Compare Local vs Vercel**
- Run the same debug on localhost
- Compare the values
- Look for differences in:
  - Environment variables
  - User data
  - Location data
  - Database responses

## 🚨 Common Issues & Solutions

### **Issue 1: Environment Variables Missing**
```
❌ Supabase URL: Missing
❌ Supabase Key: Missing
```
**Solution:** Check Vercel environment variables

### **Issue 2: User Data Not Loading**
```
❌ User Loaded: No
❌ Own ID: Not loaded
```
**Solution:** Check authentication flow and user table

### **Issue 3: Locations Not Fetching**
```
✅ User Loaded: Yes
❌ Total Locations: 0
❌ Error: Yes
```
**Solution:** Check RLS policies and database permissions

### **Issue 4: Filtering Logic Failing**
```
✅ Total Locations: 5
❌ Filtered Locations: 0
✅ User Role: owner
```
**Solution:** Check if `user.own_id` matches `locations.own_id`

## 🔧 Troubleshooting Steps

### **1. Check Vercel Environment Variables**
```bash
# Go to Vercel Dashboard
# Project Settings → Environment Variables
# Ensure these are set:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **2. Verify Supabase RLS Policies**
```sql
-- Check if locations table has proper RLS
SELECT * FROM pg_policies WHERE tablename = 'locations';

-- Ensure owner can see their locations
CREATE POLICY "Owners can view their locations" ON locations
FOR SELECT USING (own_id = auth.uid());
```

### **3. Test Database Connection**
Use the debug panel's "Test Database Connection" button to verify:
- Supabase connection works
- Basic queries succeed
- User permissions are correct

### **4. Check Production Database Schema**
Ensure your production database has:
- Same table structure as local
- Same RLS policies
- Same data relationships

## 📊 Expected Debug Output

### **Working Owner (Localhost)**
```
✅ User Loaded: Yes
✅ Own ID: uuid-123
✅ Total Locations: 3
✅ Filtered Locations: 2
✅ Database connection successful
```

### **Broken Owner (Vercel)**
```
✅ User Loaded: Yes
❌ Own ID: null (or different value)
❌ Total Locations: 0
❌ Filtered Locations: 0
❌ Database connection failed
```

## 🎯 Next Steps After Debug

1. **Identify the root cause** using debug panel
2. **Fix the specific issue** (env vars, RLS, schema, etc.)
3. **Test the fix** on Vercel
4. **Remove debug panel** from production code
5. **Monitor for future issues**

## 🚀 Deployment Commands

```bash
# Build and deploy to Vercel
npm run build:vercel
vercel --prod

# Or use Vercel CLI
vercel --prod
```

## 📝 Debug Panel Removal

After fixing the issue, remove the debug panel:

```tsx
// Remove this from your layout
{process.env.NODE_ENV === 'development' && (
  <DebugPanel ... />
)}

// And remove the debug route
```

---

**Need Help?** The debug panel will show you exactly what's different between localhost and Vercel. Focus on the red ❌ indicators to identify the problem!
