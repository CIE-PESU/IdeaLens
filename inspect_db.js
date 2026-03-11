
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
    // Check ai_evaluations
    const { data: aiData, error: aiError } = await supabase.from('ai_evaluations').select('*').limit(1);
    if (aiError) {
        console.log("ai_evaluations Error:", aiError.message);
    } else if (aiData && aiData.length > 0) {
        console.log("ai_evaluations Columns:", Object.keys(aiData[0]).join(', '));
        console.log("ai_evaluations Row Sample:", JSON.stringify(aiData[0]));
    } else {
        console.log("ai_evaluations is EMPTY.");
    }

    // Check human_evaluations
    const { data: humanData, error: humanError } = await supabase.from('human_evaluations').select('*').limit(1);
    if (humanError) {
        console.log("human_evaluations Error:", humanError.message);
    } else if (humanData && humanData.length > 0) {
        console.log("human_evaluations Columns:", Object.keys(humanData[0]).join(', '));
        console.log("human_evaluations Row Sample:", JSON.stringify(humanData[0]));
    } else {
        console.log("human_evaluations is EMPTY.");
    }

    // Check idealens_submissions2 (for ref)
    const { data: subData, error: subError } = await supabase.from('idealens_submissions2').select('*').limit(1);
    if (subError) {
        console.log("idealens_submissions2 Error:", subError.message);
    } else if (subData && subData.length > 0) {
        console.log("idealens_submissions2 Columns:", Object.keys(subData[0]).join(', '));
        console.log("idealens_submissions2 Row Sample:", JSON.stringify(subData[0]));
    } else {
        console.log("idealens_submissions2 is EMPTY.");
    }

    // Check idea_submissions (old?)
    const { data: oldData, error: oldError } = await supabase.from('idea_submissions').select('*').limit(1);
    if (oldError) {
        console.log("idea_submissions Error:", oldError.message);
    } else if (oldData && oldData.length > 0) {
        console.log("idea_submissions is NOT empty.");
    } else {
        console.log("idea_submissions is EMPTY or missing.");
    }
}

inspect().catch(e => console.log("CATCH:", e.message));
