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

async function checkPolicyDef() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("Investigating RLS Policy definition for 'human_evaluations_phase2'...");
    
    // We can't query pg_policies directly via Supabase client usually, but we can try to see if any rows are returned with a broad select
    const { data, error, count } = await supabase.from('human_evaluations_phase2').select('*', { count: 'exact', head: true });
    
    if (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.message.includes("does not exist")) {
            console.log("Table 'human_evaluations_phase2' does not exist In public schema.");
        }
    } else {
        console.log(`✅ Table exists. visible count for anon role: ${count}`);
    }
}

checkPolicyDef();
