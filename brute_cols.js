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

async function bruteForceCols() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const tables = ['ai_evaluations2', 'human_evaluations2', 'human_evaluations_phase2'];
    const candidates = ['idea_id', 'team_id', 'id', 'idea_uuid', 'submission_id'];

    console.log("Brute-forcing column names for Phase 2 tables...");
    
    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        for (const col of candidates) {
            const { error } = await supabase.from(table).select(col).limit(1);
            if (!error) {
                console.log(`✅ Column '${col}' EXISTS in ${table}`);
            } else if (error.code === '42703') {
                // Column not found
            } else {
                console.log(`⚠ Unexpected error for ${col}: ${error.message}`);
            }
        }
    }
}

bruteForceCols();
