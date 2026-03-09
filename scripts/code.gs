const SUPABASE_URL = 
const SUPABASE_ANON_KEY = "";
function onFormSubmit(e) {

  const v = e.values;

  const data = {

    email: v[1] || null,
    team_name: v[2] || null,
    project_title: v[3] || null,
    track_vertical: v[4] || null,

    team_members: v[5] || null,
    primary_contact: v[6] || null,

    problem_statement_short: v[7] ? String(v[7]).substring(0, 500) : null,
    problem_description: v[8] || null,
    solution_statement_short: v[9] || null,
    solution_stage: v[10] || null,

    customer_segments_end_users: v[11] || null,
    customer_segments_paying_customers: v[12] || null,
    customer_segments_influencers: v[13] || null,
    customer_segments_partners: v[14] || null,

    customer_selection_reason: v[15] || null,
    critical_assumptions: v[16] || null,

    pretotypes_used: v[17] || null,
    pretotype_experiment_description: v[18] || null,

    users_interacted_count: v[19] ? parseInt(v[19]) : 0,

    key_insights_pivots: v[20] || null,
    target_geography: v[21] || null,

    tam: v[22] || null,
    sam: v[23] || null,
    som: v[24] || null,

    target_market_segments: v[25] || null,
    competitors: v[26] || null,
    competitor_positioning: v[27] || null,

    revenue_model_type: v[28] || null,
    revenue_model_description: v[29] || null,

    cost_structure: v[30] || null,

    customer_value_proposition: v[31] || null,
    investor_value_proposition: v[32] || null,
    team_advantage: v[33] || null,

    pitch_deck_pdf: v[34] || null,
    demo_link: v[35] || null,

    preferred_day_16_march: v[36] ? true : false,
    preferred_day_17_march: v[37] ? true : false,
    preferred_day_18_march: v[38] ? true : false,
    preferred_day_any: v[39] ? true : false,

    consent_box: true
  };

  const response = UrlFetchApp.fetch(
    SUPABASE_URL + "/rest/v1/idealens_submissions2",
    {
      method: "post",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    }
  );

  Logger.log("Response Code: " + response.getResponseCode());
  Logger.log("Response Body: " + response.getContentText());
}