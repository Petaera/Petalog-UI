import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://poqzxjhsdbwfnooftiwe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcXp4amhzZGJ3Zm5vb2Z0aXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MjI2MTMsImV4cCI6MjA2ODM5ODYxM30.qKLnvcnUBB1PBvUZ_p7Es0NOLjK2ixkMyeaF57C6yVA';

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

// Enhanced Supabase client with retry logic
export const supabaseWithRetry = {
  ...supabase,
  from: (table: string) => {
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