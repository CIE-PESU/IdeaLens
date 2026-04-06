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

async function listTables() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("Probing accurate table names...");
    const candidates = [
        'ai_evaluations', 'ai_evaluation2', 
        'human_evaluations', 'human_evaluation2',
        'human_evaluation_phase2', 'human_evaluations_phase2',
        'idealens_submissions2', 'teams'
    ];

    const results = [];
    for (const table of candidates) {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (error) {
            results.push({ table, status: '❌ Missing', error: error.message });
        } else {
            results.push({ table, status: '✅ Exists' });
        }
    }
    console.table(results);
}

listTables();
