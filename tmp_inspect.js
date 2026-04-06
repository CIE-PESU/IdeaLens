const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
  console.log('Testing fetch from ai_evaluation2...');
  const { data, error } = await supabase
    .from('ai_evaluation2')
    .select('team_id')
    .limit(1);

  if (error) {
    console.error('Error fetching from ai_evaluation2:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success! Data:', data);
  }

  console.log('\nTesting fetch from idealens_submissions2...');
  const { data: subData, error: subError } = await supabase
    .from('idealens_submissions2')
    .select('id')
    .limit(1);

  if (subError) {
    console.error('Error fetching from idealens_submissions2:', JSON.stringify(subError, null, 2));
  } else {
    console.log('Success! Data:', subData);
  }
}

testFetch();
