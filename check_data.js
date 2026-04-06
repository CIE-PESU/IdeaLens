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

async function checkData() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const tables = ['ai_evaluations', 'human_evaluations', 'idealens_submissions2'];

    for (const table of tables) {
        const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' });
        if (error) {
            console.log(`❌ ${table} Error: ${error.message}`);
        } else {
            console.log(`✅ ${table}: ${count} rows found.`);
            if (count > 0) {
                console.log(`Sample Team ID: ${data[0].team_id || data[0].idea_id || data[0].id}`);
            }
        }
    }
}

checkData();
