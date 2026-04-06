const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// No node-fetch needed if using a version that has it OR if we use a different approach.
// But wait, I'll use a dynamic import for node-fetch if available or just try with what's there.

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

async function run() {
    console.log('Using URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
    // Try to use global fetch if exists
    if (typeof fetch === 'undefined') {
        console.log('Global fetch is UNDEFINED. Attempting to use node-fetch...');
        try {
            global.fetch = require('node-fetch');
        } catch (e) {
            console.log('node-fetch not installed. Fetch will fail.');
        }
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data, error } = await supabase.from('ai_evaluations').select('*').limit(1);
    if (error) {
        console.error('FETCH ERROR:', error.message);
    } else {
        console.log('FETCH SUCCESS:', data);
    }
}

run();
