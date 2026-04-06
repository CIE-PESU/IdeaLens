const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        envVars[key] = value;
    }
});

async function checkFinalColumns() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("Checking columns for 'ai_evaluations2'...");
    const { data, error } = await supabase.from('ai_evaluations2').select('*').limit(1);
    if (error) {
        console.log(`❌ Error: ${error.message}`);
    } else if (data.length > 0) {
        console.log("Columns in 'ai_evaluations2':", Object.keys(data[0]));
    } else {
        console.log("ai_evaluations2 is empty, cannot determine columns directly. Trying a different method.");
        // Try to get one row from any other table to see if we can deduce naming patterns
    }
}

checkFinalColumns();
