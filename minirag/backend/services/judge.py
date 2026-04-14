import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Upgraded to 70B for semantic reasoning capacity (same Groq API, negligible cost diff)
JUDGE_MODEL = "llama-3.3-70b-versatile"

JUDGE_SYSTEM_PROMPT = (
    "You are an expert evaluator grading a Retrieval-Augmented Generation (RAG) system.\n"
    "Compare the SYSTEM_ANSWER to the EXPECTED_ANSWER.\n\n"
    "Your goal is to evaluate SEMANTIC EQUIVALENCE, not exact string matching.\n\n"
    "Evaluation Rules:\n"
    "1. MATCH: The System Answer contains all the core facts of the Expected Answer.\n"
    "   - Ignore differences in grammar, punctuation (e.g., '&' vs 'and'), or phrasing.\n"
    "   - If the System Answer provides ADDITIONAL correct context that does not contradict the Expected Answer, it is still a MATCH.\n"
    "2. PARTIAL MATCH: The System Answer contains some, but not all, of the core facts from the Expected Answer.\n"
    "3. NO MATCH: The System Answer is completely wrong, contradicts the Expected Answer, or is missing the primary information.\n\n"
    "CRITICAL RULE: If the System Answer contains the Expected Answer, you MUST grade it a MATCH, even if the System Answer includes paragraphs of extra, tangential information from the context.\n\n"
    "First, write a one-sentence reasoning for your judgement.\n"
    "Then, on a new line, output exactly ONE of the following words:\n"
    "[MATCH, PARTIAL MATCH, NO MATCH]\n\n"
    "Format your output exactly like this:\n"
    "Reasoning: <your one sentence explanation>\n"
    "Label: <the exact label>"
)

class JudgeService:
    def __init__(self, generator_client: OpenAI):
        self.client = generator_client

    def judge_single(self, expected: str, system_answer: str) -> tuple[str, str]:
        user_message = (
            f"EXPECTED_ANSWER: {expected}\n"
            f"SYSTEM_ANSWER: {system_answer}"
        )
        resp = self.client.chat.completions.create(
            model=JUDGE_MODEL,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0,
            max_tokens=150,  # Only needs one of three labels
        )
        text = resp.choices[0].message.content.strip()

        # Parse label from last line only — reasoning on earlier lines won't interfere
        label_line = text.strip().split('\n')[-1].upper()
        if "PARTIAL MATCH" in label_line:
            j = "Partial Match"
        elif "NO MATCH" in label_line:
            j = "No Match"
        elif "MATCH" in label_line:
            j = "Match"
        else:
            j = "No Match"  # Safe fallback

        return j, text
