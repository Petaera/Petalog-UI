import { createClient } from '@supabase/supabase-js';

// Use environment variables instead of hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://poqzxjhsdbwfnooftiwe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcXp4amhzZGJ3Zm5vb2Z0aXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MjI2MTMsImV4cCI6MjA2ODM5ODYxM30.qKLnvcnUBB1PBvUZ_p7Es0NOLjK2ixkMyeaF57C6yVA';

// Enhanced environment variable validation
const validateEnvironmentVariables = () => {
  const missingVars = [];
  const usingFallbacks = [];
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    missingVars.push('VITE_SUPABASE_URL');
    usingFallbacks.push('VITE_SUPABASE_URL');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    missingVars.push('VITE_SUPABASE_ANON_KEY');
    usingFallbacks.push('VITE_SUPABASE_ANON_KEY');
  }
  
  if (missingVars.length > 0) {
    console.error('🚨 CRITICAL: Missing required environment variables:', missingVars);
    console.error('🚨 This will cause authentication and database issues on Vercel!');
    console.error('🚨 Please set these variables in your Vercel dashboard.');
    console.error('🚨 Current environment:', import.meta.env.MODE);
    console.error('🚨 Using fallback values for:', usingFallbacks);
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  // Log current configuration (without exposing sensitive data)
  console.log('🔧 Supabase Configuration:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    environment: import.meta.env.MODE,
    isProduction: import.meta.env.PROD,
    isDevelopment: import.meta.env.DEV
  });
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    usingFallbacks
  };
};

// Validate environment variables on import
const envValidation = validateEnvironmentVariables();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'peta-parking-ui',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enhanced Supabase client with retry logic and validation
export const supabaseWithRetry = {
  ...supabase,
  from: (table: string) => {
    // Check if environment is properly configured
    if (!envValidation.isValid) {
      console.warn('⚠️ Using Supabase with fallback values - this may cause issues');
    }
    
    const originalFrom = supabase.from(table);
    
    return {
      ...originalFrom,
      select: (...args: any[]) => {
        return originalFrom.select(...args).withRetry({
          retries: 3,
          retryDelay: 1000,
          retryCondition: (error: any) => {
            // Retry on network errors or timeout errors
            return error?.message?.includes('network') || 
                   error?.message?.includes('timeout') ||
                   error?.message?.includes('suspended') ||
                   error?.code === 'NETWORK_ERROR';
          }
        });
      }
    };
  }
};

// Export validation status for debugging
export const getEnvironmentStatus = () => envValidation; 