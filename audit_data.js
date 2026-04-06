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

async function auditData() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const tables = ['ai_evaluations2', 'human_evaluations2', 'human_evaluations_phase2', 'idealens_submissions2'];
    
    console.log("Auditing Phase 2 Table Data...");
    for (const table of tables) {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Table ${table}: ${error.message}`);
        } else {
            console.log(`✅ Table ${table}: ${count} rows`);
            // Check first row for UUID column names
            const { data: firstRow } = await supabase.from(table).select('*').limit(1);
            if (firstRow && firstRow.length > 0) {
                console.log(`   Columns: ${Object.keys(firstRow[0]).join(', ')}`);
            }
        }
    }
}

auditData();
