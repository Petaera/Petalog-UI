import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testComparisonData() {
  try {
    console.log('Testing get_comparison_data function...');
    
    // You'll need to replace this with an actual location_id from your database
    const locationId = 'YOUR_LOCATION_ID';
    
    const { data, error } = await supabase.rpc('get_comparison_data', {
      p_location_id: locationId,
      p_filter_date: null, // No date filter for testing
    });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Raw data:', data);
    console.log('Data length:', data?.length);
    
    if (data && data.length > 0) {
      const logTypeCounts = data.reduce((acc, log) => {
        acc[log.log_type] = (acc[log.log_type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Log type counts:', logTypeCounts);
      
      // Show some examples of each type
      const examples = {};
      data.forEach(log => {
        if (!examples[log.log_type]) {
          examples[log.log_type] = [];
        }
        if (examples[log.log_type].length < 3) {
          examples[log.log_type].push({
            vehicle_number: log.vehicle_number,
            entry_time: log.entry_time,
            log_type: log.log_type
          });
        }
      });
      
      console.log('Examples by type:', examples);
    } else {
      console.log('No data returned');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testComparisonData();
