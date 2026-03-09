import os, json, time, re, glob
import pymupdf # type: ignore
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
OUTPUT_JSON = "output/extracted_data.json"

SLEEP_SECONDS = 10 if "flash" in MODEL_NAME else 30

# Schema for extracting data from PDFs
SCHEMA = {
    "Problem Statement": None,
    "Market Opportunity": None,
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
- You MAY rephrase content to meet formatting rules, but MUST NOT add new information.
- Convert all content into declarative statements.
- Do NOT copy questions, prompts, headings, or numbered instructions.
- Do NOT include interrogative words (what, who, how, why) or question marks.
- If a field is missing OR only appears as a question without an explicit answer, return null.
- Output MUST be valid JSON.
- Follow the schema exactly.
- Do NOT include rhetorical or question statements in the output.

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
    extraction_failures = 0

    n = len(pdf_data)
    
    print(f"\n=== Extracting data from {n} PDFs ===")
    
    for i, pdf in enumerate(pdf_data):
        print(f"\nExtracting {i+1}/{n}: {pdf['filename']}")
        
        extracted, p_tok, c_tok = extract_data_from_pdf_text(pdf["text"])
        total_prompt_tokens += p_tok
        total_response_tokens += c_tok
        
        if extracted is None:
            print(f"  [EXTRACTION FAILED]")
            extraction_failures += 1
            continue
        
        extracted["_source_file"] = pdf["filename"]
        results.append(extracted)
        
        problem = str(extracted.get('Problem Statement') or 'N/A')
        market = str(extracted.get('Market Opportunity') or 'N/A')
        print(f"  Problem Statement: {problem}")
        print(f"  Market Opportunity: {market}")
        print(f"  Tokens: prompt={p_tok}, response={c_tok}")
        
        time.sleep(SLEEP_SECONDS)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n=== Extraction Complete ===\n")
    print(f"Total Prompt Tokens: {total_prompt_tokens}")
    print(f"Total Response Tokens: {total_response_tokens}")
    print(f"Total Tokens: {total_prompt_tokens + total_response_tokens}")
    print(f"PDFs processed: {n}")
    print(f"Extraction failures: {extraction_failures}")
    print(f"Results saved to: {OUTPUT_JSON}")

if __name__ == "__main__":
    main(limit_first_n=10)