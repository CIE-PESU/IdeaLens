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

async function verify() {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log("--- DASHBOARD FETCH LOGIC VERIFICATION ---");
    
    // 1. Fetch AI
    const { data: aiData } = await supabase.from("ai_evaluations2").select("team_name");
    const aiNames = (aiData || []).map(s => (s.team_name || "").trim()).filter(Boolean);
    
    // 2. Fetch Human
    const { data: humanData } = await supabase.from("human_evaluations2").select("team_name");
    const humanNamesRaw = (humanData || []).map(s => (s.team_name || "").trim()).filter(Boolean);
    
    // 3. Intersection
    const humanNamesLower = humanNamesRaw.map(n => n.toLowerCase());
    const intersectionNames = aiNames.filter(name => humanNamesLower.includes(name.toLowerCase()));
    
    console.log("AI Count:", aiData.length);
    console.log("Human Count:", humanData.length);
    console.log("Intersection Count:", intersectionNames.length);

    if (intersectionNames.length === 21) {
        console.log("✅ SUCCESS: Intersection count is exactly 21.");
    } else {
        console.log("❌ FAILURE: Intersection count is", intersectionNames.length);
    }

    // 4. Fetch Submissions
    const { data: subData } = await supabase
        .from("idealens_submissions2")
        .select("id, team_name")
        .in("team_name", intersectionNames);
    
    console.log("Final Submissions Count:", subData.length);
    if (subData.length === 21) {
        console.log("✅ SUCCESS: Final rendered cards count is exactly 21.");
    } else if (subData.length > 21) {
        console.log("⚠️ WARNING: More than 21 submissions found. This might mean duplicate team names in submissions table.");
        const counts = {};
        subData.forEach(s => counts[s.team_name] = (counts[s.team_name] || 0) + 1);
        console.log("Duplicates:", Object.entries(counts).filter(([n, c]) => c > 1));
    } else {
        console.log("❌ FAILURE: Final rendered cards count is", subData.length);
    }
}

verify();
