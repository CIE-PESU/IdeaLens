import os, json, time, re, glob
import pandas as pd
import pymupdf  # type: ignore
from dotenv import load_dotenv
from openai import OpenAI # type: ignore

# ------------------ Setup ------------------
load_dotenv()

MODEL_NAME = "openai/gpt-4.1-mini"

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", ""),
        "X-Title": os.getenv("OPENROUTER_SITE_NAME", "pdf-extractor"),
    },
)

PDF_INPUT_DIR = "data/conf_input_pdfs"
OUTPUT_JSON = "output/scored_ideas.json"
OUTPUT_CSV = "output/scored_ideas.csv"

SLEEP_SECONDS = 2

# ------------------ Schema ------------------
SCHEMA = {
    "Team Name": None,
    "Team Representative Name": None,
    "Core Problem Statement": None,
    "Target Audience": None,
    "Cost of the Problem Headline Metric": None,
    "Category": None,
    "Number of Interviews Conducted": None,
    "Key Interview Insights": [],
    "Most Powerful Customer Quote": None,
    "Market Size TAM": None,
    "Market Size SAM": None,
    "Market Size SOM": None,
    "Cost of the Problem Notes": None,
    "Current Solutions": [],
    "Why Those Fail": [],
    "Identified Gap": None,
    "Desirability": None,
    "Feasability": None,
    "Viability": None,
    "DFV Cohesion": None,
    "Proposed Solution Direction": None,
    "Key Value Proposition": None,
    "Next Step With Support": None,
}

# ------------------ PDF Extraction ------------------
def extract_text_from_pdf(pdf_path):
    text_parts = []
    with pymupdf.open(pdf_path) as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)

def load_pdfs_from_directory(directory):
    pdf_files = glob.glob(os.path.join(directory, "*.pdf"))
    pdf_data = []
    for pdf_path in pdf_files:
        pdf_data.append({
            "filename": os.path.basename(pdf_path),
            "text": extract_text_from_pdf(pdf_path)
        })
    return pdf_data

# ------------------ JSON Parsing ------------------
JSON_BLOCK_RE = re.compile(
    r"(```json|```)\s*(\{[\s\S]*?\})\s*```",
    re.IGNORECASE
)

def extract_json(text):
    if not text:
        return None
    m = JSON_BLOCK_RE.search(text)
    if m:
        text = m.group(2)
    try:
        return json.loads(text.strip())
    except Exception:
        return None

# ------------------ Prompts ------------------
def build_extraction_prompt(text):
    schema_str = json.dumps(SCHEMA, indent=2)
    text = text[:8000] if len(text) > 8000 else text

    return [
        {
            "role": "user",
            "content": f"""
You are extracting structured data from a student project proposal.

Rules:
- Use ONLY information explicitly present in the text.
- If a field is missing, return null.
- Do NOT infer, guess, or embellish.
- Lists must be arrays.
- Output MUST be valid JSON.
- Follow the schema exactly.

TEXT:
{text}

RETURN JSON IN THIS EXACT FORMAT:
{schema_str}
"""
        }
    ]

def build_scoring_prompt(idea):
    return [
        {
            "role": "user",
            "content": f"""
You are an evaluator scoring student innovation ideas using DFV.

SCORING ANCHORS (be strict):

DESIRABILITY — evidence of real demand

9–10: Specific user (role + context); urgent/frequent pain; explicit evidence
      (interviews, quotes, quantified loss)
7–8: Clear user and real pain; some evidence; moderate urgency
5–6: Plausible user/problem; weak urgency or thin evidence
3–4: Vague user or generic problem; little evidence
1–2: No real user or demand

FEASIBILITY — technical realism for this team

9–10: Buildable now with existing tech; clear approach; low risk
7–8: Buildable with effort; known, manageable risks
5–6: Significant technical uncertainty; vague execution
3–4: Major feasibility gaps or unrealistic scope; high risk
1–2: Not realistically buildable

VIABILITY — economic or institutional survival

9–10: Clear customer & payer; credible revenue/funding; real market
7–8: Plausible monetization; assumptions need validation
5–6: Weak or unclear revenue model
3–4: Sustainability unclear or naive
1–2: No viable path

Most ideas score between 5 and 8. Avoid generosity.

IDEA:
{idea}

Return ONLY this JSON object:
{{
  "Desirability": <int 1-10>,
  "Feasibility": <int 1-10>,
  "Viability": <int 1-10>,
  "average": <float>,
  "rationale": ["<~10 words>", "<~10 words>", "<~10 words>"]
}}
"""
        }
    ]

# ------------------ OpenRouter Call ------------------
def openrouter_call(messages):
    res = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0,
        top_p=1,
    )

    txt = res.choices[0].message.content or ""
    usage = res.usage or {}

    return txt, usage.prompt_tokens or 0, usage.completion_tokens or 0

# ------------------ Extraction ------------------
def extract_data_from_pdf_text(text):
    msg = build_extraction_prompt(text)
    txt, p_toks, c_toks = openrouter_call(msg)
    return extract_json(txt), p_toks, c_toks

# ------------------ Validation ------------------
def validate_and_normalize(data):
    if data is None:
        return None

    normalized = {}
    for key, default in SCHEMA.items():
        val = data.get(key)
        if isinstance(default, list):
            if isinstance(val, list):
                normalized[key] = [str(v) for v in val if v]
            elif isinstance(val, str) and val.strip():
                normalized[key] = [val]
            else:
                normalized[key] = []
        else:
            normalized[key] = str(val).strip() if val not in (None, "") else None

    return normalized

# ------------------ Scoring ------------------
def score(idea):
    msg = build_scoring_prompt(idea)
    txt, p_toks, c_toks = openrouter_call(msg)
    parsed = extract_json(txt)

    if parsed is None:
        return {
            "Desirability": 5,
            "Feasibility": 5,
            "Viability": 5,
            "average": 5.0,
            "rationale": ["fallback", "json failed", "model failed"]
        }, p_toks, c_toks, True

    return parsed, p_toks, c_toks, False

# ------------------ Main ------------------
def main(limit_first_n=None):
    pdfs = load_pdfs_from_directory(PDF_INPUT_DIR)
    if limit_first_n:
        pdfs = pdfs[:limit_first_n]

    results = []
    total_p = total_c = fallbacks = extraction_failures = 0
    
    # Track tokens per team: {filename: {"extraction_p": int, "extraction_c": int, "scoring_p": int, "scoring_c": int}}
    team_tokens = {}

    print(f"Extracting {len(pdfs)} PDFs")

    extracted = []
    for pdf in pdfs:
        data, p, c = extract_data_from_pdf_text(pdf["text"])
        total_p += p
        total_c += c
        
        # Initialize token tracking for this team
        team_tokens[pdf["filename"]] = {
            "extraction_prompt": p,
            "extraction_completion": c,
            "scoring_prompt": 0,
            "scoring_completion": 0,
        }

        if not data:
            extraction_failures += 1
            continue

        norm = validate_and_normalize(data)
        norm["_source_file"] = pdf["filename"]
        extracted.append(norm)

        print(f"\n[PDF EXTRACTED]")
        print(f"File: {pdf['filename']}")

        time.sleep(SLEEP_SECONDS)

    print(f"Scoring {len(extracted)} ideas")

    for rec in extracted:
        idea = rec.get("Core Problem Statement")
        if not idea:
            fallbacks += 1
            continue

        scores, p, c, fb = score(idea)
        total_p += p
        total_c += c
        fallbacks += int(fb)
        
        # Add scoring tokens to team tracking
        source_file = rec.get("_source_file")
        if source_file in team_tokens:
            team_tokens[source_file]["scoring_prompt"] = p
            team_tokens[source_file]["scoring_completion"] = c

        rec.update({
            "Desirability_Score": scores["Desirability"],
            "Feasibility_Score": scores["Feasibility"],
            "Viability_Score": scores["Viability"],
            "average": scores["average"],
            "rationale": scores["rationale"],
        })

        print("\n=== DFV Evaluation Complete ===")
        print(f"Team: {rec.get('Team Name') or rec.get('_source_file')}")
        print(f"Desirability: {scores['Desirability']}")
        print(f"Feasibility: {scores['Feasibility']}")
        print(f"Viability: {scores['Viability']}")
        print(f"Average: {scores['average']}")
        print("Rationale:")
        for r in scores["rationale"]:
            print(f"  - {r}")
        print("==============================\n")

        results.append(rec)
        time.sleep(SLEEP_SECONDS)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    pd.DataFrame(results).to_csv(OUTPUT_CSV, index=False)

    print("Done.")
    print("\n" + "=" * 50)
    print("TOKEN USAGE BY TEAM")
    print("=" * 50)
    for filename, tokens in team_tokens.items():
        ext_total = tokens["extraction_prompt"] + tokens["extraction_completion"]
        score_total = tokens["scoring_prompt"] + tokens["scoring_completion"]
        team_total = ext_total + score_total
        print(f"\n{filename}:")
        print(f"  Extraction: {ext_total} (prompt: {tokens['extraction_prompt']}, completion: {tokens['extraction_completion']})")
        print(f"  Scoring:    {score_total} (prompt: {tokens['scoring_prompt']}, completion: {tokens['scoring_completion']})")
        print(f"  Total:      {team_total}")
    print("=" * 50)
    
    print("\nOVERALL METRICS:")
    print("Prompt tokens:", total_p)
    print("Completion tokens:", total_c)
    print("Total tokens:", total_p + total_c)
    print("Extraction failures:", extraction_failures)
    print("Scoring fallbacks:", fallbacks)

if __name__ == "__main__":
    main(limit_first_n=5)