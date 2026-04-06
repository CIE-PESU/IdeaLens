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

async function findMissing() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data: aiData } = await supabase.from("ai_evaluations2").select("team_name");
    const { data: humanData } = await supabase.from("human_evaluations2").select("team_name");
    const { data: subData } = await supabase.from("idealens_submissions2").select("team_name");

    const aiNames = (aiData || []).map(s => (s.team_name || "").trim()).filter(Boolean);
    const humanNamesLower = (humanData || []).map(s => (s.team_name || "").trim().toLowerCase()).filter(Boolean);
    const subNamesLower = (subData || []).map(s => (s.team_name || "").trim().toLowerCase()).filter(Boolean);

    const intersection = aiNames.filter(name => humanNamesLower.includes(name.toLowerCase()));
    console.log("Intersection Names (21):", intersection);

    const missingInSub = intersection.filter(name => !subNamesLower.includes(name.toLowerCase()));
    console.log("Missing in Submissions (by lower case):", missingInSub);

    const missingInSubStrict = intersection.filter(name => !subData.map(d => (d.team_name || "").trim()).includes(name));
    console.log("Missing in Submissions (by strict match):", missingInSubStrict);
}

findMissing();
