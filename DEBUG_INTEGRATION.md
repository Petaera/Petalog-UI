# Debug Panel Integration Guide

This guide will help you integrate the debug panel into your main application to diagnose the Vercel deployment issue where owners cannot see locations.

## 🚀 Quick Start

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
    selectedLocation={selectedLocation}
    onLocationChange={setSelectedLocation}
  />
)}
```

### 2. **Add Debug Route (Optional)**

Add a dedicated debug route to your router:

```tsx
import { DebugPage } from '@/pages/DebugPage';

// In your router configuration
{
  path: '/debug',
  element: <DebugPage />
}
```

## 🔍 What the Debug Panel Shows

The debug panel provides real-time information about:

- **Environment & Build Info**: Vite mode, environment variables, production status
- **User & Authentication**: User ID, role, email, authentication status
- **Location State**: Selected location, total locations, filtered locations, loading state
- **Database Connection**: Supabase connection test with detailed error information
- **State History**: Track state changes over time to identify timing issues
- **Troubleshooting Tips**: Common solutions for Vercel deployment issues

## 🎯 How to Use for Your Current Issue

### **Step 1: Deploy with Debug Panel**

1. Add the debug panel to your layout component
2. Deploy to Vercel
3. Log in as an owner user
4. Expand the debug panel to see all information

### **Step 2: Check Environment Variables**

The debug panel will show:
- ✅ **Supabase URL**: Should match your production Supabase project
- ✅ **Supabase Key**: Should be your production anon key
- **Build Mode**: Should show production settings

### **Step 3: Test Database Connection**

Click "Test Supabase Connection" to verify:
- Database connectivity from Vercel
- User authentication
- Basic query execution

### **Step 4: Monitor State Changes**

Watch the "State Change History" to see:
- When `selectedLocation` changes
- How many locations are loaded vs filtered
- User role detection

## 🚨 Common Issues & Solutions

### **Issue 1: Environment Variables Missing**

**Symptoms**: Debug panel shows "❌ Missing" for Supabase credentials
**Solution**: 
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Redeploy

### **Issue 2: Database Connection Fails**

**Symptoms**: Database test shows connection error
**Solution**:
1. Check if Supabase project is accessible from Vercel
2. Verify RLS policies allow owner access
3. Check for CORS restrictions

### **Issue 3: State Propagation Issues**

**Symptoms**: Layout shows location but Dashboard receives `undefined`
**Solution**:
1. Check component re-rendering order
2. Verify state management (Context, Redux, etc.)
3. Add error boundaries around location-dependent components

## 🔧 Advanced Debugging

### **Add More Detailed Logging**

Enhance the debug panel with additional information:

```tsx
// Add to DebugPanel component
const [detailedLogs, setDetailedLogs] = useState<string[]>([]);

useEffect(() => {
  const log = `[${new Date().toISOString()}] selectedLocation changed: ${JSON.stringify(selectedLocation)}`;
  setDetailedLogs(prev => [...prev, log].slice(-50));
}, [selectedLocation]);
```

### **Test Different User Roles**

Use the debug panel to compare:
- Owner user behavior
- Manager user behavior
- Guest user behavior

### **Monitor Network Requests**

Check browser DevTools Network tab for:
- Failed API calls
- CORS errors
- Authentication failures

## 📋 Debug Checklist

Before deploying the debug version:

- [ ] Debug panel component is imported
- [ ] Debug panel is conditionally rendered (development only)
- [ ] All required props are passed to DebugPanel
- [ ] Debug route is added (if using dedicated page)
- [ ] Environment variables are set in Vercel
- [ ] Supabase project is accessible from Vercel

## 🎯 Expected Debug Output

### **Working Locally (Owner)**
```
User Role: owner
Selected Location: 1
Total Locations: 2
Filtered Locations: 2
Database Connection: ✅ Success
```

### **Failing on Vercel (Owner)**
```
User Role: owner
Selected Location: undefined
Total Locations: 0
Filtered Locations: 0
Database Connection: ❌ Failed (check error details)
```

## 🚀 Next Steps After Debug

1. **Identify Root Cause**: Use debug panel to pinpoint the exact issue
2. **Fix Environment**: Update Vercel settings if needed
3. **Test Database**: Verify Supabase access and permissions
4. **Check Code**: Look for build/runtime differences
5. **Remove Debug**: Clean up debug code after issue is resolved

## 📞 Getting Help

If the debug panel reveals issues you can't resolve:

1. **Copy Debug Info**: Use the debug panel to export all information
2. **Check Vercel Logs**: Look at deployment and function logs
3. **Verify Supabase**: Test database access directly
4. **Compare Environments**: Document differences between local and Vercel

---

**Remember**: The debug panel is temporary and should be removed after the issue is resolved to avoid exposing sensitive information in production.
