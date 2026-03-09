import os, json, time, re, glob
import pandas as pd
import pymupdf
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

MODEL_NAME = "gemini-2.5-flash"

generation_config = types.GenerateContentConfig(
    temperature=0,
    top_p=1,
    top_k=1,
    response_mime_type="application/json",
)

PDF_INPUT_DIR = "data/conf_input_pdfs"
OUTPUT_JSON = "output/scored_ideas.json"
OUTPUT_CSV = "output/scored_ideas.csv"

SLEEP_SECONDS = 10 if "flash" in MODEL_NAME else 30

# Schema for extracting data from PDFs
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

# ---------- PDF Extraction ----------
def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using PyMuPDF."""
    text_parts = []
    with pymupdf.open(pdf_path) as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)

def load_pdfs_from_directory(directory):
    """Load all PDFs from directory and extract text."""
    pdf_files = glob.glob(os.path.join(directory, "*.pdf"))
    pdf_data = []
    for pdf_path in pdf_files:
        text = extract_text_from_pdf(pdf_path)
        pdf_data.append({
            "filename": os.path.basename(pdf_path),
            "text": text
        })
    return pdf_data

# ---------- JSON parsing ----------
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

# ---------- PDF Extraction Prompt ----------
def build_extraction_prompt(text):
    """Build prompt to extract structured data from PDF text."""
    schema_str = json.dumps(SCHEMA, indent=2)
    # Truncate text to minimize tokens (keep first 8000 chars)
    text = text[:8000] if len(text) > 8000 else text
    return {
        "role": "user",
        "parts": [f"""You are extracting structured data from a student project proposal.

Rules:
- Use ONLY information explicitly present in the text.
- If a field is missing, return null.
- Do NOT infer, guess, or embellish.
- Lists should be arrays.
- Output MUST be valid JSON.
- Follow the schema exactly.

TEXT:
{text}

RETURN JSON IN THIS EXACT FORMAT:
{schema_str}"""]
    }

# ---------- Gemini call ----------
def gemini_call(msg):
    res = client.models.generate_content(
        model=MODEL_NAME,
        contents=msg["parts"],
        config=generation_config,
    )
    usage = getattr(res, "usage_metadata", None)
    p = getattr(usage, "prompt_token_count", 0) if usage else 0
    c = getattr(usage, "candidates_token_count", 0) if usage else 0
    return res.text or "", p, c

# ---------- PDF Data Extraction ----------
def extract_data_from_pdf_text(text):
    """Use Gemini to extract structured data from PDF text."""
    msg = build_extraction_prompt(text)
    txt, p_toks, c_toks = gemini_call(msg)
    parsed = extract_json(txt)
    return parsed, p_toks, c_toks

# ---------- Validation and Normalization ----------
def validate_and_normalize(data):
    """Validate and normalize extracted data before scoring."""
    if data is None:
        return None
    
    normalized = {}
    for key, default_val in SCHEMA.items():
        val = data.get(key)
        # Ensure lists remain lists
        if isinstance(default_val, list):
            if val is None:
                normalized[key] = []
            elif isinstance(val, list):
                normalized[key] = [str(v) for v in val if v]
            elif isinstance(val, str):
                normalized[key] = [val] if val.strip() else []
            else:
                normalized[key] = []
        else:
            # String fields
            if val is None or val == "":
                normalized[key] = None
            else:
                normalized[key] = str(val).strip()
    
    return normalized

# ---------- Scoring Prompt ----------
def build_scoring_prompt(idea):
    return {
        "role": "user",
        "parts": [f"""
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
"""]
    }

# ---------- Scoring ----------
def score(idea):
    msg = build_scoring_prompt(idea)
    txt, p_toks, c_toks = gemini_call(msg)
    parsed = extract_json(txt)

    fallback = False
    if parsed is None:
        fallback = True
        parsed = {
            "Desirability": 5,
            "Feasibility": 5,
            "Viability": 5,
            "average": 5.0,
            "rationale": ["fallback", "json parse failed", "model failed"]
        }

    return parsed, p_toks, c_toks, fallback

# ---------- Main ----------
def main(limit_first_n=None):
    # Load and extract text from PDFs
    print("Loading PDFs ~")
    pdf_data = load_pdfs_from_directory(PDF_INPUT_DIR)
    
    if not pdf_data:
        print(f"No PDFs found in {PDF_INPUT_DIR}")
        return
    
    if limit_first_n:
        pdf_data = pdf_data[:limit_first_n]

    results = []
    total_prompt_tokens = 0
    total_response_tokens = 0
    fallbacks = 0
    extraction_failures = 0
    file_token_usage = {}  # Track tokens per file

    n = len(pdf_data)
    
    # Phase 1: Extract structured data from PDFs
    print(f"\n=== Phase 1: Extracting data from {n} PDFs ===")
    extracted_records = []
    
    for i, pdf in enumerate(pdf_data):
        print(f"\nExtracting {i+1}/{n}: {pdf['filename']}")
        
        extracted, p_tok, c_tok = extract_data_from_pdf_text(pdf["text"])
        total_prompt_tokens += p_tok
        total_response_tokens += c_tok
        
        if extracted is None:
            print(f"  [EXTRACTION FAILED]")
            extraction_failures += 1
            continue
        
        # Validate and normalize
        normalized = validate_and_normalize(extracted)
        if normalized is None:
            print(f"  [VALIDATION FAILED]")
            extraction_failures += 1
            continue
        
        normalized["_source_file"] = pdf["filename"]
        extracted_records.append(normalized)
        
        filename = pdf["filename"]
        
        # Initialize file token tracking with extraction tokens
        file_token_usage[filename] = {
            "extraction_prompt_tokens": p_tok,
            "extraction_response_tokens": c_tok,
            "scoring_prompt_tokens": 0,
            "scoring_response_tokens": 0,
            "total_prompt_tokens": p_tok,
            "total_response_tokens": c_tok,
            "total_tokens": p_tok + c_tok
        }
        
        print(f"  File: {filename}")
        print(f"  Extraction tokens: prompt={p_tok}, response={c_tok}")
        
        time.sleep(SLEEP_SECONDS)
    
    # Phase 2: Score each extracted record
    print(f"\n=== Phase 2: Scoring {len(extracted_records)} ideas ===")
    
    for i, record in enumerate(extracted_records):
        idea = record.get("Core Problem Statement")
        filename = record.get("_source_file", f"Idea {i+1}")
        team = record.get("Team Name") or filename
        
        if not idea:
            print(f"\nSkipping {i+1}/{len(extracted_records)} — No problem statement for {filename}")
            fallbacks += 1
            record.update({
                "Desirability_Score": None,
                "Feasibility_Score": None,
                "Viability_Score": None,
                "average": None,
                "rationale": ["no problem statement"]
            })
            results.append(record)
            continue

        print(f"\nScoring Idea {i+1}/{len(extracted_records)} — File: {filename}")

        scores, p_tok, c_tok, fb = score(idea)

        total_prompt_tokens += p_tok
        total_response_tokens += c_tok
        fallbacks += int(fb)

        # Update file token usage with scoring tokens
        if filename in file_token_usage:
            file_token_usage[filename]["scoring_prompt_tokens"] = p_tok
            file_token_usage[filename]["scoring_response_tokens"] = c_tok
            file_token_usage[filename]["total_prompt_tokens"] += p_tok
            file_token_usage[filename]["total_response_tokens"] += c_tok
            file_token_usage[filename]["total_tokens"] += p_tok + c_tok

        print(f"Prompt tokens: {p_tok}, Response tokens: {c_tok}")

        # Merge scores into record (rename to avoid conflict with extracted fields)
        record["Desirability_Score"] = scores.get("Desirability")
        record["Feasibility_Score"] = scores.get("Feasibility")
        record["Viability_Score"] = scores.get("Viability")
        record["average"] = scores.get("average")
        record["rationale"] = scores.get("rationale")
        
        # Print scores
        print(f"  Desirability: {record['Desirability_Score']}")
        print(f"  Feasibility: {record['Feasibility_Score']}")
        print(f"  Viability: {record['Viability_Score']}")
        print(f"  Average: {record['average']}")
        print(f"  Rationale: {record['rationale']}")
        
        results.append(record)

        time.sleep(SLEEP_SECONDS)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    pd.DataFrame(results).to_csv(OUTPUT_CSV, index=False)

    print("\n=== Batch Processing Complete ===\n")
    print("=== Token Usage Summary ===")
    print(f"Total Prompt Tokens: {total_prompt_tokens}")
    print(f"Total Completion Tokens: {total_response_tokens}")
    print(f"Total Tokens: {total_prompt_tokens + total_response_tokens}")
    print(f"PDFs processed: {n}")
    print(f"Extraction failures: {extraction_failures}")
    print(f"Scoring fallbacks: {fallbacks}")
    
    print("\n=== Token Usage Per File ===")
    print("-" * 100)
    print(f"{'Filename':<40} {'Extraction':<20} {'Scoring':<20} {'Total':<20}")
    print(f"{'':<40} {'(Prompt/Response)':<20} {'(Prompt/Response)':<20} {'(Prompt/Response)':<20}")
    print("-" * 100)
    
    for filename, tokens in file_token_usage.items():
        ext_str = f"{tokens['extraction_prompt_tokens']}/{tokens['extraction_response_tokens']}"
        score_str = f"{tokens['scoring_prompt_tokens']}/{tokens['scoring_response_tokens']}"
        total_str = f"{tokens['total_prompt_tokens']}/{tokens['total_response_tokens']}"
        print(f"{filename[:39]:<40} {ext_str:<20} {score_str:<20} {total_str:<20}")
    
    print("-" * 100)
    print(f"\n{'Filename':<40} {'Total Tokens Used':<20}")
    print("-" * 60)
    for filename, tokens in file_token_usage.items():
        print(f"{filename[:39]:<40} {tokens['total_tokens']:<20}")
    print("-" * 60)

if __name__ == "__main__":
    main(limit_first_n=5)