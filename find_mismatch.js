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

async function findMismatch() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data: aiData } = await supabase.from("ai_evaluations2").select("team_name");
    const { data: humanData } = await supabase.from("human_evaluations2").select("team_name");
    
    const aiNames = (aiData || []).map(s => s.team_name || "");
    const humanNames = (humanData || []).map(s => s.team_name || "");
    const intersection = aiNames.filter(n => humanNames.map(h => h.trim().toLowerCase()).includes(n.trim().toLowerCase()));

    console.log("Intersection Names (from AI):", intersection.length);

    const { data: subData } = await supabase.from("idealens_submissions2").select("team_name");
    const subNames = subData.map(d => d.team_name || "");

    const missingInSub = [];
    for (const name of intersection) {
        if (!subNames.includes(name)) {
            missingInSub.push(name);
        }
    }

    console.log("Names in intersection but not EXACTLY in submissions:", missingInSub);
    
    for (const name of missingInSub) {
        const trimmed = name.trim();
        const found = subNames.find(sn => sn.trim().toLowerCase() === trimmed.toLowerCase());
        console.log(`- '${name}' trimmed:'${trimmed}' matches in sub as: '${found}'`);
    }
}

findMismatch();
