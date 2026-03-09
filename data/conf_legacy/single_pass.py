import os, json, sys, re, uuid
from dotenv import load_dotenv
from openai import OpenAI  # type: ignore

# ------------------ Setup ------------------
load_dotenv()

MODEL_NAME = "openai/gpt-4.1-mini"

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", ""),
        "X-Title": os.getenv("OPENROUTER_SITE_NAME", "single-pass-scorer"),
    },
)

HEADERS = [
    "team_profile",
    "problem_statement",
    "customer_validation",
    "competitive_landscape",
    "market_opportunity",
    "solution",
    "business_model",
    # Fallback: also accept legacy key
    "startup_profile",
]

evaluation_id = uuid.uuid4()

# ------------------ JSON Parsing ------------------
JSON_BLOCK_RE = re.compile(
    r"(```json|```)\s*(\{[\s\S]*?\})\s*```",
    re.IGNORECASE,
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


# ------------------ Prompt ------------------
PROMPT_PATH = "data/prompt.txt"


def load_prompt_file(path):
    """Load prompt.txt and return (version, template) tuple."""
    with open(path, "r") as f:
        raw = f.read()
    header, _, body = raw.partition("---PROMPT---")
    version = ""
    for line in header.splitlines():
        if line.strip().lower().startswith("version:"):
            version = line.split(":", 1)[1].strip()
            break
    return version, body.strip()


def build_scoring_prompt(idea_json, team_name="", problem_title=""):
    idea_str = json.dumps(idea_json, indent=2)
    version, template = load_prompt_file(PROMPT_PATH)
    print(f"Prompt version: {version}")
    content = template.replace("{team_name}", team_name)
    content = content.replace("{problem_title}", problem_title)
    content = content.replace("{idea}", idea_str)
    return [{"role": "user", "content": content}]


# ------------------ OpenRouter Call ------------------
def openrouter_call(messages):
    res = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0,
        top_p=1,
    )
    txt = res.choices[0].message.content or ""
    usage = res.usage
    prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
    completion_tokens = getattr(usage, "completion_tokens", 0) or 0
    return txt, prompt_tokens, completion_tokens


# ------------------ Main ------------------
def main():

    json_path = 'data/conf_input_jsons/input.json'

    with open(json_path, "r") as f:
        data = json.load(f)

    # Build the idea payload from the expected headers
    idea = {}
    for header in HEADERS:
        if header in data:
            idea[header] = data[header]

    if not idea:
        print("No matching headers found in the input JSON.")
        sys.exit(1)

    # Extract team name and problem title from input data
    team_name = (
        data.get("team_profile", {}).get("name")
        or data.get("startup_profile", {}).get("name")
        or os.path.basename(json_path)
    )
    problem_title = (
        data.get("problem_statement", {}).get("core_issue", "")[:120]
        if isinstance(data.get("problem_statement"), dict)
        else ""
    )
    print(f"Scoring: {team_name}")

    messages = build_scoring_prompt(idea, team_name=team_name, problem_title=problem_title)
    raw, prompt_tokens, completion_tokens = openrouter_call(messages)
    total_tokens = prompt_tokens + completion_tokens

    scores = extract_json(raw)

    if scores is None:
        print("Failed to parse model response.")
        print("Raw response:", raw)
        sys.exit(1)

    # Display results
    print("\n=== Ideathon Evaluation ===")
    print(f"Team:           {team_name}")
    print(f"Problem Title:  {problem_title}")
    print("UUID:",evaluation_id)
    print()
    print(f"Desirability:   {scores.get('desirability', 'N/A')}/10")
    print(f"Feasibility:    {scores.get('feasibility', 'N/A')}/10")
    print(f"Viability:      {scores.get('viability', 'N/A')}/10")
    print()
    print("--- Qualitative Signals ---")
    print(f"Market Context Confidence:      {scores.get('market_context_confidence', '')}")
    print(f"Execution Readiness Confidence: {scores.get('execution_readiness_confidence', '')}")
    print()
    print(f"Overall Observations: {scores.get('overall_observations', '')}")
    print("===========================\n")

    print("=== Token Usage ===")
    print(f"Prompt tokens:     {prompt_tokens}")
    print(f"Completion tokens: {completion_tokens}")
    print(f"Total tokens:      {total_tokens}")
    print("===================")


if __name__ == "__main__":
    main()
