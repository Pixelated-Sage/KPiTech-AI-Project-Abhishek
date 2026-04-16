import os
import time
import logging
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Fallback chain — tried in order on RateLimitError (429)
# Smaller 8b models have 500K TPD vs 100K for 70b models
FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",   # Best quality, 100K TPD — primary
    "llama3-70b-8192",           # Same quality tier, separate limit pool
    "llama-3.1-8b-instant",      # 500K TPD, very fast
    "llama3-8b-8192",            # 500K TPD, stable
    # "gemma2-9b-it",            # RESERVE — 500K TPD, Google model. Uncomment when all above are exhausted.
]


class GeneratorService:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )

    def generate_answer(self, question: str, context_chunks: list[str]) -> dict:
        context = "\n\n".join(
            f"[Chunk {i+1}]: {chunk}" for i, chunk in enumerate(context_chunks)
        )
        prompt = (
            "You are a document analysis assistant. Answer the user's question "
            "comprehensively using the provided context.\n\n"
            "RULES:\n"
            "- Answer using only the provided context\n"
            "- Be comprehensive: include specific names, dates, and full details mentioned\n"
            "- If multiple valid answers exist, summarise all of them\n"
            "- If not found, say exactly: 'Not found in the document.'\n"
            "- No preamble, no rephrasing the question\n\n"
            f"CONTEXT:\n{context}\n\n"
            f"QUESTION: {question}\n\nANSWER:"
        )

        last_error = None

        for model in FALLBACK_MODELS:
            try:
                logger.info(f"Trying model: {model}")
                start = time.time()
                resp = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=512,
                )
                ms = int((time.time() - start) * 1000)
                return {
                    "answer": resp.choices[0].message.content.strip(),
                    "model_used": model,
                    "generation_time_ms": ms,
                }

            except RateLimitError as e:
                logger.warning(f"Rate limit hit for {model}: {e}. Trying next model…")
                last_error = e
                continue  # try next model in chain

            # Any other error (auth, server error, etc.) — raise immediately
            except Exception as e:
                logger.error(f"Non-rate-limit error on {model}: {e}")
                raise

        # All models exhausted
        raise RuntimeError(
            f"All Groq models are rate-limited. Last error: {last_error}. "
            "Please wait a few minutes and try again."
        )
