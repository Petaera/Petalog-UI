// Debug script for location selection issue on Vercel
// Run this in the browser console on your Vercel deployment

console.log('🔍 Starting location issue debug...');

// Check environment variables
const envCheck = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  mode: import.meta.env.MODE,
  isProduction: import.meta.env.PROD
};

console.log('Environment Variables:', envCheck);

// Check localStorage
const userId = localStorage.getItem('supabase.auth.token') ? 'Found' : 'Not found';
console.log('Local Storage Auth Token:', userId);

// Check if user is logged in
const checkUserStatus = () => {
  // This will work if you have access to the auth context
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools available');
  }
  
  // Check for any user-related data in localStorage
  const keys = Object.keys(localStorage);
  const userKeys = keys.filter(key => key.includes('user') || key.includes('auth'));
  console.log('User-related localStorage keys:', userKeys);
  
  userKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value ? 'Has value' : 'Empty');
    } catch (e) {
      console.log(`${key}: Error reading`);
    }
  });
};

// Check network requests
const checkNetworkRequests = () => {
  if (performance && performance.getEntriesByType) {
    const requests = performance.getEntriesByType('resource');
    const supabaseRequests = requests.filter(req => 
      req.name.includes('supabase') || req.name.includes('poqzxjhsdbwfnooftiwe')
    );
    console.log('Supabase network requests:', supabaseRequests.length);
    supabaseRequests.forEach(req => {
      console.log('Request:', req.name, 'Status:', req.transferSize > 0 ? 'Success' : 'Failed');
    });
  }
};

// Check for errors in console
const checkConsoleErrors = () => {
  const originalError = console.error;
  const errors = [];
  
  console.error = (...args) => {
    errors.push(args);
    originalError.apply(console, args);
  };
  
  console.log('Console error interceptor active');
  
  // Return function to check errors
  return () => {
    console.error = originalError;
    console.log('Captured errors:', errors.length);
    errors.forEach((error, index) => {
      console.log(`Error ${index + 1}:`, error);
    });
    return errors;
  };
};

// Run all checks
console.log('Running comprehensive checks...');
checkUserStatus();
checkNetworkRequests();

const errorChecker = checkConsoleErrors();

// Wait a bit then check for errors
setTimeout(() => {
  const errors = errorChecker();
  console.log('🔍 Debug complete. Check the output above for issues.');
  
  if (errors.length > 0) {
    console.log('🚨 Found errors that may be causing the issue');
  }
  
  if (envCheck.supabaseUrl === '❌ Missing' || envCheck.supabaseKey === '❌ Missing') {
    console.log('🚨 CRITICAL: Environment variables are missing!');
    console.log('🚨 This is likely the cause of your Vercel issue.');
    console.log('🚨 Fix: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel dashboard');
  }
}, 2000);
