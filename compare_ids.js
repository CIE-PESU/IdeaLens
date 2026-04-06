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

async function compareIds() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("Comparing IDs between 'human_evaluations_phase2' and 'idealens_submissions2'...");
    
    // Get phase 2 IDs
    const { data: p2Data, error: p2Error } = await supabase.from('human_evaluations_phase2').select('idea_id');
    if (p2Error) {
        console.log(`❌ Phase 2 Error: ${p2Error.message}`);
        return;
    }
    const p2Ids = (p2Data || []).map(d => d.idea_id).filter(Boolean);
    console.log(`- Phase 2 IDs found: ${p2Ids.length}`);
    if (p2Ids.length > 0) console.log(`  Sample P2 ID: ${p2Ids[0]}`);

    // Get submissions IDs
    const { data: subData, error: subError } = await supabase.from('idealens_submissions2').select('id').limit(10);
    if (subError) {
        console.log(`❌ Submissions Error: ${subError.message}`);
        return;
    }
    const subIds = (subData || []).map(d => d.id);
    console.log(`- Submissions sample IDs: ${subIds.length}`);
    if (subIds.length > 0) console.log(`  Sample Sub ID: ${subIds[0]}`);

    // Check intersection
    const intersection = p2Ids.filter(id => subIds.includes(id));
    console.log(`- Sample Intersection: ${intersection.length} (Check limited to 10 submissions)`);

    // Full match check (no limit for submissions IDs)
    const { data: allSubData } = await supabase.from('idealens_submissions2').select('id');
    const allSubIds = (allSubData || []).map(d => d.id);
    const fullIntersection = p2Ids.filter(id => allSubIds.includes(id));
    console.log(`- Full Match Intersection: ${fullIntersection.length} teams`);
}

compareIds();
