import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# ------------------ Config ------------------
CSV_PATH = "data/conf_grade_comparisons.csv"

# ------------------ Load data ------------------
df = pd.read_csv(CSV_PATH)

# Normalize evaluator names just in case
df["evaluator"] = df["evaluator"].str.lower()

# Split by evaluator
human = df[df.evaluator == "human"].set_index("team_name")
gemini = df[df.evaluator == "gemini"].set_index("team_name")
openai = df[df.evaluator == "openai"].set_index("team_name")

# Keep only teams present in all three
common = human.index.intersection(gemini.index).intersection(openai.index)
human = human.loc[common]
gemini = gemini.loc[common]
openai = openai.loc[common]

print(f"Loaded {len(common)} teams with human + gemini + openai scores")

# ------------------ Helper: deviation plot ------------------
def plot_deviation(metric, title):
    plt.figure()
    plt.scatter(human[metric], gemini[metric] - human[metric], label="Gemini")
    plt.scatter(human[metric], openai[metric] - human[metric], label="OpenAI")
    plt.axhline(0)
    plt.xlabel(f"Human {metric.capitalize()} Score")
    plt.ylabel("Model − Human")
    plt.title(title)
    plt.legend()
    plt.show()

# ------------------ 1. Deviation from human (per metric) ------------------
plot_deviation("desirability", "Desirability Deviation from Human Scores")
plot_deviation("feasibility", "Feasibility Deviation from Human Scores")
plot_deviation("viability", "Viability Deviation from Human Scores")
plot_deviation("average", "Average Score Deviation from Human Scores")

# ------------------ 2. Token usage per team (bar graph) ------------------
token_df = pd.DataFrame({
    "Gemini": gemini["tokens_used"],
    "OpenAI": openai["tokens_used"]
})

plt.figure()
token_df.plot(kind="bar")
plt.ylabel("Tokens Used")
plt.title("Token Usage per Team: Gemini vs OpenAI")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.show()

# ------------------ 3. Absolute error distribution (average) ------------------
plt.figure()
plt.hist((gemini["average"] - human["average"]).abs(), alpha=0.6, label="Gemini")
plt.hist((openai["average"] - human["average"]).abs(), alpha=0.6, label="OpenAI")
plt.xlabel("Absolute Error vs Human (Average Score)")
plt.ylabel("Count")
plt.legend()
plt.title("Absolute Error Distribution vs Human Scores")
plt.show()

# ------------------ 4. Mean bias by metric ------------------
metrics = ["desirability", "feasibility", "viability", "average"]

bias = pd.DataFrame({
    "Gemini": [(gemini[m] - human[m]).mean() for m in metrics],
    "OpenAI": [(openai[m] - human[m]).mean() for m in metrics],
}, index=metrics)

plt.figure()
bias.plot(kind="bar")
plt.axhline(0)
plt.ylabel("Mean (Model − Human)")
plt.title("Mean Bias by Metric")
plt.show()

# ------------------ 5. Cost vs error correlation ------------------
plt.figure()
plt.scatter(gemini["tokens_used"], (gemini["average"] - human["average"]).abs(), label="Gemini")
plt.scatter(openai["tokens_used"], (openai["average"] - human["average"]).abs(), label="OpenAI")
plt.xlabel("Tokens Used")
plt.ylabel("Absolute Error vs Human (Average)")
plt.title("Does Higher Token Usage Improve Accuracy?")
plt.legend()
plt.show()

# ============================================================
# 6. PER-TEAM BAR GRAPHS (Gemini → Human → OpenAI)
# ============================================================

def per_team_bar(metric, title):
    teams = human.index.tolist()
    x = np.arange(len(teams))
    width = 0.25

    plt.figure(figsize=(10, 5))

    plt.bar(x - width, gemini.loc[teams, metric], width, label="Gemini")
    plt.bar(x, human.loc[teams, metric], width, label="Human")
    plt.bar(x + width, openai.loc[teams, metric], width, label="OpenAI")

    plt.xticks(x, teams, rotation=45, ha="right")
    plt.ylabel(metric.capitalize())
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.show()

per_team_bar("desirability", "Desirability Scores per Team")
per_team_bar("feasibility", "Feasibility Scores per Team")
per_team_bar("viability", "Viability Scores per Team")
per_team_bar("average", "Average Scores per Team")

print("All plots generated.")