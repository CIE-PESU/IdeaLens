import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const id = "c808c995-6905-43ba-aecf-b8a8bc32893e"; // from the user's URL
    console.log("Testing insert for team ID:", id);
    const { data, error } = await supabase
        .from("human_evaluations")
        .insert({
            idea_id: id,
            team_name: "Test Team",
            desirability_score: 5,
            feasibility_score: 5,
            viability_score: 5,
            overall_comments: "",
            evaluated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Insert failed with error:", JSON.stringify(error, null, 2));
        console.error("Error object keys:", Object.keys(error));
        console.error("Raw error:", error);
    } else {
        console.log("Insert successful:", data);
    }
}

testInsert();
