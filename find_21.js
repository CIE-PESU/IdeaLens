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

async function findThe21Teams() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("Searching for any table with exactly 21 rows in 'public' schema...");
    
    // We can't list tables via PostgREST, so we'll guess from common patterns and known tables
    const candidates = [
        'ai_evaluations2', 'human_evaluations2', 'human_evaluations_phase2',
        'ai_evaluation2', 'human_evaluation2', 'human_evaluation_phase2',
        'idealens_submissions2', 'shortlisted_teams', 'ignite_shortlist', 'shortlist'
    ];

    for (const table of candidates) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`✓ Table '${table}': ${count} rows found.`);
        }
    }
}

findThe21Teams();
