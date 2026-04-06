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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const tables = [
    'ai_evaluation2', 
    'human_evaluation2', 
    'human_evaluation_phase2', 
    'ai_evaluations', 
    'human_evaluations', 
    'idealens_submissions2'
];

async function verify() {
    for (const table of tables) {
        console.log(`Checking table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ ${table} Error: ${error.code} - ${error.message} (${error.hint || ''})`);
        } else {
            console.log(`✅ ${table} Success! (Rows: ${data.length})`);
        }
    }
}

verify();
