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

async function verifyUserTables() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("Verifying User-Specified Tables...");
    const candidates = [
        'ai_evaluations2', 
        'human_evaluations2', 
        'human_evaluations_phase2'
    ];

    const results = [];
    for (const table of candidates) {
        const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            results.push({ table, status: '❌ Missing', error: error.message });
        } else {
            results.push({ table, status: '✅ Exists', rows: count });
        }
    }
    console.table(results);
}

verifyUserTables();
