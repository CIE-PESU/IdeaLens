import os, json, time, math
from datetime import datetime

from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client, Client

# ===================== CONFIG =====================
load_dotenv()

MODEL_LLM = "openai/gpt-4.1-mini"

client_llm = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase credentials not found in .env")
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    print(f"SUPABASE_KEY: {'SET' if SUPABASE_KEY else 'NOT SET'}")
    supabase = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ Supabase client initialized")
    except Exception as e:
        print(f"ERROR initializing Supabase: {e}")
        supabase = None

# ===================== PROMPTS =====================

SCORING_PROMPT = """
You are an evaluator scoring student innovation ideas.

SCORING ANCHORS (be strict):

DESIRABILITY — evidence of real demand
9–10: Specific user + urgent pain + explicit evidence
7–8: Clear user and pain; some evidence
5–6: Plausible but thin evidence
3–4: Vague or generic
1–2: No real demand

FEASIBILITY — technical realism
9–10: Buildable now; clear approach; low risk
7–8: Buildable with effort
5–6: Significant uncertainty
3–4: Major gaps
1–2: Not feasible

VIABILITY — sustainability
9–10: Clear customer & revenue
7–8: Plausible monetization
5–6: Weak model
3–4: Naive
1–2: No path

Use ONLY the evidence below.
Do not infer missing info.
Each submission field is provided explicitly in `Field: Value` format.
Treat values like `NULL` as missing information.

EVIDENCE:
{evidence}

Return ONLY this JSON:
{{
  "Desirability": <int>,
  "Feasibility": <int>,
  "Viability": <int>,
  "average": <float>,
  "rationale": ["<~10 words>", "<~10 words>", "<~10 words>"],
  "market_context_signal": "<20 words describing market understanding>",
  "execution_readiness_signal": "<20 words describing team's execution ability>"
}}

Note: market_context_signal = assessment of market understanding in ~20 words
      execution_readiness_signal = assessment of team's ability to execute in ~20 words
"""

# ===================== HELPERS =====================

def safe_parse_or_fallback(text, fallback):
    try:
        return json.loads(text), False
    except Exception:
        return fallback, True


def truncate_to_2_decimals(value, default=5.0):
    """Truncate numeric values to 2 decimal places (no rounding)."""
    try:
        number = float(value)
    except Exception:
        number = float(default)
    return math.trunc(number * 100) / 100


def build_evidence(submission: dict) -> str:
    """Build explicit field-by-field evidence from idealens_submissions2 entry."""
    print("  [build_evidence] Extracting fields from submission...")
    parts = []
    
    # Map all idealens_submissions2 fields to readable labels.
    field_map = {
        "id": "Submission ID",
        "submitted_at": "Submitted At",
        "email": "Email",
        "team_members": "Team Members",
        "team_name": "Team Name",
        "project_title": "Project Title",
        "track_vertical": "Track Vertical",
        "primary_contact": "Primary Contact",
        "problem_statement_short": "Problem Statement (Short)",
        "problem_description": "Problem Description",
        "solution_statement_short": "Solution Statement (Short)",
        "solution_stage": "Solution Stage",
        "customer_segments_end_users": "Customer Segments - End Users",
        "customer_segments_paying_customers": "Customer Segments - Paying Customers",
        "customer_segments_influencers": "Customer Segments - Influencers",
        "customer_segments_partners": "Customer Segments - Partners",
        "customer_selection_reason": "Customer Selection Reason",
        "critical_assumptions": "Critical Assumptions",
        "pretotypes_used": "Pretotypes Used",
        "pretotype_experiment_description": "Pretotype Experiment Description",
        "users_interacted_count": "Users Interacted Count",
        "key_insights_pivots": "Key Insights / Pivots",
        "target_geography": "Target Geography",
        "tam": "TAM",
        "sam": "SAM",
        "som": "SOM",
        "target_market_segments": "Target Market Segments",
        "competitors": "Competitors",
        "competitor_positioning": "Competitor Positioning",
        "revenue_model_type": "Revenue Model Type",
        "revenue_model_description": "Revenue Model Description",
        "cost_structure": "Cost Structure",
        "customer_value_proposition": "Customer Value Proposition",
        "investor_value_proposition": "Investor Value Proposition",
        "team_advantage": "Team Advantage",
        "pitch_deck_pdf": "Pitch Deck PDF",
        "demo_link": "Demo Link",
        "preferred_day_16_march": "Preferred Day - 16 March",
        "preferred_day_17_march": "Preferred Day - 17 March",
        "preferred_day_18_march": "Preferred Day - 18 March",
        "preferred_day_any": "Preferred Day - Any",
        "consent_box": "Consent Box",
        "created_at": "Created At",
    }

    def normalize_value(value):
        if value is None:
            return "NULL"
        if isinstance(value, bool):
            return "true" if value else "false"
        as_text = str(value).strip()
        return as_text if as_text else "NULL"

    # Include every mapped field explicitly, even when missing.
    for key, label in field_map.items():
        parts.append(f"{label}: {normalize_value(submission.get(key))}")
    
    # Include any additional fields not in the schema map for visibility.
    for key, value in submission.items():
        if key not in field_map:
            parts.append(f"{key}: {normalize_value(value)}")
    
    evidence = "\n---\n".join(parts)
    print(f"  [build_evidence] Extracted {len(parts)} fields, {len(evidence)} chars")
    return evidence


def get_existing_evaluations() -> set:
    """Fetch all team_ids that already have evaluations."""
    print("  [get_existing_evaluations] Querying ai_evaluations table...")
    if not supabase:
        print("  [get_existing_evaluations] No Supabase client")
        return set()
    
    try:
        response = supabase.table("ai_evaluations").select("team_id").execute()
        team_ids = {row["team_id"] for row in response.data}
        print(f"  [get_existing_evaluations] Found {len(team_ids)} existing evaluations")
        return team_ids
    except Exception as e:
        print(f"✗ Failed to fetch existing evaluations: {e}")
        return set()


def get_pending_submissions(existing_team_ids: set) -> list:
    """Fetch submissions from idealens_submissions2 that don't have evaluations."""
    print("  [get_pending_submissions] Querying idealens_submissions2 table...")
    if not supabase:
        print("  [get_pending_submissions] No Supabase client")
        return []
    
    try:
        response = supabase.table("idealens_submissions2").select("*").execute()
        submissions = response.data
        print(f"  [get_pending_submissions] Found {len(submissions)} total submissions")
        
        # Filter out submissions that already have evaluations.
        pending = [s for s in submissions if s.get("id") not in existing_team_ids]
        print(f"  [get_pending_submissions] {len(pending)} need evaluation")
        return pending
    except Exception as e:
        print(f"✗ Failed to fetch idealens_submissions2: {e}")
        return []


def score_submission(submission: dict) -> dict:
    """Score a single submission using LLM."""
    team_name = submission.get('team_name', 'Unknown')
    team_id = submission.get('id') or submission.get('team_id', 'unknown')
    print(f"\n→ Scoring: {team_name} ({team_id})")
    
    evidence = build_evidence(submission)[:6000]
    print(f"  [score_submission] Evidence truncated to {len(evidence)} chars")
    print(f"  [score_submission] Calling LLM ({MODEL_LLM})...")
    
    res = client_llm.chat.completions.create(
        model=MODEL_LLM,
        messages=[
            {"role": "user", "content": SCORING_PROMPT.format(evidence=evidence)}
        ],
        temperature=0,
    )
    
    raw = res.choices[0].message.content or ""
    
    fallback = {
        "Desirability": 5,
        "Feasibility": 5,
        "Viability": 5,
        "average": 5.0,
        "rationale": ["fallback", "json", "failed"],
        "market_context_signal": "Unable to assess market understanding due to parsing error.",
        "execution_readiness_signal": "Unable to assess execution readiness due to parsing error.",
    }
    
    parsed, failed = safe_parse_or_fallback(raw, fallback)
    parsed["average"] = truncate_to_2_decimals(parsed.get("average", 5.0), default=5.0)
    
    if failed:
        print("  [score_submission] ⚠ JSON parse failed, using fallback scores")
    else:
        print(f"  [score_submission] Scores: D={parsed.get('Desirability')}, F={parsed.get('Feasibility')}, V={parsed.get('Viability')}")
    
    # Token accounting
    usage = res.usage or {}
    parsed["_tokens"] = {
        "prompt": usage.prompt_tokens or 0,
        "completion": usage.completion_tokens or 0,
        "total": (usage.prompt_tokens or 0) + (usage.completion_tokens or 0),
    }
    parsed["_json_failed"] = failed
    
    return parsed


def save_evaluation(submission: dict, parsed: dict):
    """Save evaluation to ai_evaluations table."""
    print("  [save_evaluation] Preparing data for Supabase...")
    team_id = submission.get("id") or submission.get("team_id")
    team_name = submission.get("team_name", "Unknown")
    
    evaluation_data = {
        "team_id": team_id,
        "evaluator_type": "AI",
        "team_name": team_name,
        "model_name": MODEL_LLM,
        "prompt_version": "0.5",
        "desirability_score": parsed.get("Desirability", 5),
        "feasibility_score": parsed.get("Feasibility", 5),
        "viability_score": parsed.get("Viability", 5),
        "market_context_signal": parsed.get("market_context_signal", "N/A"),
        "execution_readiness_signal": parsed.get("execution_readiness_signal", "N/A"),
        "evaluation_json": parsed,
        "tokens_used": parsed.get("_tokens", {}).get("total", 0),
        "evaluated_at": datetime.utcnow().isoformat(),
    }
    
    if supabase:
        try:
            supabase.table("ai_evaluations").insert(evaluation_data).execute()
            print(f"✓ Saved evaluation for {team_name} ({team_id})")
        except Exception as e:
            print(f"✗ Failed to save evaluation for {team_name}: {e}")
    else:
        print(f"⊘ Skipping Supabase upload (client not initialized)")


# ===================== MAIN =====================

def main():
    if not supabase:
        print("✗ Cannot proceed without Supabase connection")
        return
    
    print("Fetching existing evaluations...")
    existing_team_ids = get_existing_evaluations()
    print(f"  Found {len(existing_team_ids)} existing evaluations")
    
    print("Fetching pending submissions...")
    pending = get_pending_submissions(existing_team_ids)
    print(f"  Found {len(pending)} submissions needing evaluation")
    
    if not pending:
        print("\n✓ All submissions have been evaluated!")
        return
    
    results = {}
    total = len(pending)
    
    for i, submission in enumerate(pending, 1):
        print(f"\n{'='*50}")
        print(f"Processing {i}/{total}")
        print(f"{'='*50}")
        team_id = submission.get("id") or submission.get("team_id", "unknown")
        team_name = submission.get("team_name", team_id)
        
        # Score the submission
        parsed = score_submission(submission)
        print(f"  [main] Scoring complete for {team_name}")
        parsed["_team_name"] = team_name
        results[team_id] = parsed
        
        # Save to ai_evaluations
        save_evaluation(submission, parsed)
        
        print(f"  [main] Waiting 1s (rate limit)...")
        time.sleep(1)  # Rate limiting
    
    # Print results summary
    print("\n=== FINAL RESULTS ===\n")
    
    for team_id, r in results.items():
        print(f"Team ID: {team_id}")
        print(f"Team Name: {r.get('_team_name', 'Unknown')}")
        print(f"  Desirability: {r['Desirability']}")
        print(f"  Feasibility:  {r['Feasibility']}")
        print(f"  Viability:    {r['Viability']}")
        print(f"  Average:      {r['average']:.2f}")
        
        market_signal = r.get('market_context_signal', 'N/A')
        exec_signal = r.get('execution_readiness_signal', 'N/A')
        print(f"  Market Context: {market_signal}")
        print(f"  Execution Readiness: {exec_signal}")
        
        toks = r.get("_tokens", {})
        print(
            f"  Tokens → prompt: {toks.get('prompt', 0)}, "
            f"completion: {toks.get('completion', 0)}, "
            f"total: {toks.get('total', 0)}"
        )
        
        if r.get("_json_failed"):
            print("  ⚠ JSON fallback used")
        
        print("-" * 40)


if __name__ == "__main__":
    main()