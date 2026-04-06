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

    console.log("Listing tables in 'public' schema...");
    
    // Using a RPC or a query that typically works to see table names if the user has permissions
    // But anon typically can't see information_schema.
    // We'll try to guess based on common names or check the ones we suspect.

    const candidates = [
        'ai_evaluations', 'human_evaluations', 
        'ai_evaluation2', 'human_evaluation2',
        'ai_evaluation_2', 'human_evaluation_2',
        'human_evaluation_phase2', 'human_evaluations_phase2',
        'idealens_submissions2', 'teams'
    ];

    for (const table of candidates) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.message.includes('not find')) {
                console.log(`❌ ${table}: Missing`);
            } else {
                console.log(`⚠️ ${table}: Error ${error.code} - ${error.message}`);
            }
        } else {
            console.log(`✅ ${table}: Exists`);
        }
    }
}

listTables();
