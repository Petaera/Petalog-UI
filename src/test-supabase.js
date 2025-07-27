// Quick test to verify Supabase connection and table access
import { supabase } from './lib/supabaseClient.ts';

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('Auth status:', authError ? 'Not authenticated' : 'Authenticated');
    console.log('User:', authData?.user?.email || 'No user');
    
    // Test each table individually
    const tables = ['vehicles', 'logs-man', 'locations', 'Service_prices', 'users'];
    
    for (const table of tables) {
      console.log(`\n📊 Testing table: ${table}`);
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.error(`❌ Error accessing ${table}:`, error);
        } else {
          console.log(`✅ ${table} accessible - Total records: ${count}`);
          if (data && data.length > 0) {
            console.log(`📋 Sample record from ${table}:`, data[0]);
          }
        }
      } catch (err) {
        console.error(`💥 Exception accessing ${table}:`, err);
      }
    }
    
  } catch (error) {
    console.error('💥 Critical error:', error);
  }
}

// Run the test
testSupabaseConnection();
