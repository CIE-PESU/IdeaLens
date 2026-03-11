
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkRLS() {
    console.log("Checking data access for 'idealens_submissions2'...");
    const { data, error, count } = await supabase
        .from('idealens_submissions2')
        .select('*', { count: 'exact' });

    if (error) {
        console.error("❌ Query error:", error.message);
    } else {
        console.log(`✅ Query successful! Rows found: ${data.length}, Count: ${count}`);
        if (data.length === 0) {
            console.log("⚠️ Table is empty OR RLS is blocking access (returning 0 rows).");
            console.log("Hint: If the table has data in the dashboard, you likely need to add a SELECT policy for the 'anon' role.");
        } else {
            console.log("First row ID:", data[0].id);
            console.log("First row Team Name:", data[0].team_name);
        }
    }
}

checkRLS();
