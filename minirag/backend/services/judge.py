import os
import logging
from openai import OpenAI, RateLimitError, BadRequestError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Judge fallback chain ──────────────────────────────────────────────────────
# Judge task is simple classification (Match/Partial/No Match) — 8B models are
# fully capable and have 500K TPD vs only 100K for 70B.
# Save 70B tokens for actual query generation where quality matters.
JUDGE_FALLBACK_MODELS = [
    "llama-3.1-8b-instant",      # PRIMARY — 500K TPD, very fast, perfect for classification
    "llama3-8b-8192",            # FALLBACK — 500K TPD, stable
    "gemma2-9b-it",              # FALLBACK — 500K TPD, Google model
    "llama-3.3-70b-versatile",   # LAST RESORT only — 100K TPD, save for query generation
]

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
        last_error = None

        for model in JUDGE_FALLBACK_MODELS:
            try:
                logger.info(f"[Judge] Trying model: {model}")
                resp = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0,
                    max_tokens=80,   # Label + one sentence — never needs more than ~70 tokens
                )
                text = resp.choices[0].message.content.strip()
                return self._parse_label(text), text

            except RateLimitError as e:
                logger.warning(f"[Judge] Rate limit hit for {model}. Trying next…")
                last_error = e
                continue

            except BadRequestError as e:
                err_body = str(e)
                if any(k in err_body for k in ("model_decommissioned", "model_not_active", "does not exist")):
                    logger.warning(f"[Judge] {model} is decommissioned/unavailable. Skipping…")
                    last_error = e
                    continue
                raise  # Other 400 errors — raise immediately

            except Exception as e:
                logger.error(f"[Judge] Non-recoverable error on {model}: {e}")
                raise

        raise RuntimeError(
            f"All judge models are rate-limited or unavailable. Last error: {last_error}. "
            "Please wait a few minutes and try again."
        )

    @staticmethod
    def _parse_label(text: str) -> str:
        label_line = text.strip().split('\n')[-1].upper()
        if "PARTIAL MATCH" in label_line:
            return "Partial Match"
        if "NO MATCH" in label_line:
            return "No Match"
        if "MATCH" in label_line:
            return "Match"
        return "No Match"  # Safe fallback
