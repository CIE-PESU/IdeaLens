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

async function checkSubmissions() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data: aiData } = await supabase.from("ai_evaluations2").select("team_name");
    const { data: humanData } = await supabase.from("human_evaluations2").select("team_name");
    
    // AI names as the base (the casing we will use for .in if possible)
    const aiNames = (aiData || []).map(s => s.team_name || "");
    const humanNamesLower = (humanData || []).map(s => (s.team_name || "").trim().toLowerCase()).filter(Boolean);
    const intersection = aiNames.filter(n => humanNamesLower.includes(n.trim().toLowerCase()));

    console.log("Intersection Count:", intersection.length);

    const { data: subData } = await supabase.from("idealens_submissions2").select("team_name");
    const subNamesLower = subData.map(d => (d.team_name || "").trim().toLowerCase());

    const finalShortlist = [];
    for (const name of intersection) {
        const nameTrimmedLower = name.trim().toLowerCase();
        const foundInSub = subData.filter(d => (d.team_name || "").trim().toLowerCase() === nameTrimmedLower);
        
        if (foundInSub.length > 0) {
            // Pick the official name from submissions (or AI)
            finalShortlist.push(foundInSub[0].team_name);
            console.log(`✅ '${name}' found in sub as '${foundInSub[0].team_name}'`);
        } else {
            console.log(`❌ '${name}' NOT FOUND in submissions even case-insensitive trimmed.`);
        }
    }

    console.log(`\nFinal shortlist count: ${finalShortlist.length}`);
}

checkSubmissions();
