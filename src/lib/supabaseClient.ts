import { createClient } from '@supabase/supabase-js';

// Request tracking for cancellation
const activeRequests = new Map<string, AbortController>();

/**
 * Validate environment variables and provide detailed error messages
 */
function validateEnvironmentVariables() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is missing!');
    console.error('   This will cause the app to fail on Vercel deployment.');
    console.error('   Please set VITE_SUPABASE_URL in your Vercel environment variables.');
    console.error('   Current value:', supabaseUrl);
  }

  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is missing!');
    console.error('   This will cause the app to fail on Vercel deployment.');
    console.error('   Please set VITE_SUPABASE_ANON_KEY in your Vercel environment variables.');
    console.error('   Current value:', supabaseAnonKey);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🚨 CRITICAL: Missing required environment variables!');
    console.error('   The app will use fallback values but may not work properly.');
    console.error('   Please check your Vercel deployment settings.');
  } else {
    console.log('✅ Environment variables are properly configured');
  }
}

// Validate environment variables on import
validateEnvironmentVariables();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://poqzxjhsdbwfnooftiwe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcXp4amhzZGJ3Zm5vb2Z0aXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MjI2MTMsImV4cCI6MjA2ODM5ODYxM30.qKLnvcnUBB1PBvUZ_p7Es0NOLjK2ixkMyeaF57C6yVA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'peta-parking-ui'
    }
  }
});

/**
 * Enhanced query function with request cancellation and rate limiting
 */
export async function enhancedQuery<T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  requestId: string,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { timeout = 30000, retries = 3, retryDelay = 1000 } = options;

  // Cancel any existing request with the same ID
  if (activeRequests.has(requestId)) {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      console.log(`🔄 Cancelled previous request: ${requestId}`);
    }
  }

  // Create new abort controller
  const controller = new AbortController();
  activeRequests.set(requestId, controller);

  // Set timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.log(`⏰ Request timeout: ${requestId}`);
  }, timeout);

  try {
    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (controller.signal.aborted) {
          throw new Error('Request was cancelled');
        }

        const result = await queryFn();
        
        // Clear timeout and remove from active requests
        clearTimeout(timeoutId);
        activeRequests.delete(requestId);
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError' || controller.signal.aborted) {
          console.log(`❌ Request aborted: ${requestId}`);
          break;
        }
        
        if (attempt < retries) {
          console.log(`🔄 Retry attempt ${attempt}/${retries} for ${requestId}:`, error.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // Clear timeout and remove from active requests
    clearTimeout(timeoutId);
    activeRequests.delete(requestId);
    
    throw lastError;
  } catch (error: any) {
    // Ensure cleanup
    clearTimeout(timeoutId);
    activeRequests.delete(requestId);
    throw error;
  }
}

/**
 * Cancel all active requests
 */
export function cancelAllRequests() {
  activeRequests.forEach((controller, requestId) => {
    controller.abort();
    console.log(`🔄 Cancelled request: ${requestId}`);
  });
  activeRequests.clear();
}

/**
 * Get count of active requests
 */
export function getActiveRequestCount() {
  return activeRequests.size;
}

/**
 * Get environment status for debugging
 */
export function getEnvironmentStatus() {
  return {
    hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasSupabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'FALLBACK_VALUE',
    activeRequests: activeRequests.size,
    timestamp: new Date().toISOString()
  };
} 