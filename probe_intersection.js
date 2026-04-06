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

async function probe() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("--- AI Evaluations 2 ---");
    const { data: aiData, error: aiError } = await supabase.from('ai_evaluations2').select('team_id, team_name');
    if (aiError) console.error(aiError);
    else {
        console.log(`Count: ${aiData.length}`);
        console.log("Sample IDs:", aiData.slice(0, 5).map(d => d.team_id));
        console.log("Sample Names:", aiData.slice(0, 5).map(d => d.team_name));
    }

    console.log("\n--- Human Evaluations 2 ---");
    const { data: humanData, error: humanError } = await supabase.from('human_evaluations2').select('idea_id, team_name');
    if (humanError) console.error(humanError);
    else {
        console.log(`Count: ${humanData.length}`);
        console.log("Sample IDs:", humanData.slice(0, 5).map(d => d.idea_id));
        console.log("Sample Names:", humanData.slice(0, 5).map(d => d.team_name));
    }

    console.log("\n--- Submissions 2 ---");
    const { data: subData, error: subError } = await supabase.from('idealens_submissions2').select('id, team_name');
    if (subError) console.error(subError);
    else {
        console.log(`Count: ${subData.length}`);
        console.log("Sample IDs:", subData.slice(0, 5).map(d => d.id));
        console.log("Sample Names:", subData.slice(0, 5).map(d => d.team_name));
    }

    if (aiData && humanData) {
        const aiIds = aiData.map(d => d.team_id).filter(Boolean);
        const humanIds = humanData.map(d => d.idea_id).filter(Boolean);
        const intersection = aiIds.filter(id => humanIds.includes(id));
        console.log(`\nIntersection Count (by ID): ${intersection.length}`);
        
        const aiNames = aiData.map(d => (d.team_name || "").toLowerCase().trim()).filter(Boolean);
        const humanNames = humanData.map(d => (d.team_name || "").toLowerCase().trim()).filter(Boolean);
        const nameIntersection = aiNames.filter(name => humanNames.includes(name));
        console.log(`Intersection Count (by Name): ${nameIntersection.length}`);
    }
}

probe();
