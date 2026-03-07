const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkConstraints() {
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'human_evaluations' });
    if (error) {
        // If RPC doesn't exist, try a raw query if possible or just guess
        console.log("RPC Error:", error.message);

        // Alternative: Try to just insert and see what happens if we don't use onConflict
        // Or check if there are multiple records for one idea_id
        const { data: records } = await supabase.from('human_evaluations').select('idea_id').limit(10);
        console.log("Records sample idea_id:", records);
    } else {
        console.log("Constraints:", data);
    }
}

// Since I can't easily add RPCs, I'll try to just fetch the table definition if I can't find it.
// Actually, let's just use the 'idea_id' but without the onConflict if it's failing, 
// OR check if 'idea_id' is indeed the right column name.
checkConstraints();
