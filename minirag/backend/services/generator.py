import os
import time
import logging
from openai import OpenAI, RateLimitError, BadRequestError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Groq fallback chain ──────────────────────────────────────────────────────
# Tried in order on RateLimitError (429). Smaller 8b models have 500K TPD vs 100K for 70b.
GROQ_FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",   # Best quality, 100K TPD — primary
    "llama-3.1-8b-instant",      # 500K TPD, very fast
    "llama3-8b-8192",            # 500K TPD, stable
    # "gemma2-9b-it",            # RESERVE — 500K TPD, Google model. Uncomment when all above are exhausted.
]

# ─── Ollama models (local mode) ───────────────────────────────────────────────
# Tried in order when USE_OLLAMA=true or when called from local fallback mode.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_FALLBACK_MODELS = [
    "llama3.2",    # Primary local model
    "mistral",     # Fallback local model
    "llama3",      # Older but widely available
    "gemma2",      # Google Gemma local
]


def _build_prompt(question: str, context_chunks: list[str]) -> str:
    context = "\n\n".join(
        f"[Chunk {i+1}]: {chunk}" for i, chunk in enumerate(context_chunks)
    )
    return (
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


class GeneratorService:
    def __init__(self):
        self.use_ollama = os.getenv("USE_OLLAMA", "false").lower() == "true"

        # Groq client (always initialised — used in cloud/primary mode)
        self.groq_client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY", "dummy"),
            base_url="https://api.groq.com/openai/v1",
        )

        # Ollama client (used in local/fallback mode)
        self.ollama_client = OpenAI(
            api_key="ollama",  # Ollama doesn't need a real key
            base_url=OLLAMA_BASE_URL,
        )

    # ── Ollama generation ────────────────────────────────────────────────────
    def _generate_with_ollama(self, prompt: str) -> dict:
        last_error = None
        for model in OLLAMA_FALLBACK_MODELS:
            try:
                logger.info(f"[Ollama] Trying model: {model}")
                start = time.time()
                resp = self.ollama_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=512,
                )
                ms = int((time.time() - start) * 1000)
                return {
                    "answer": resp.choices[0].message.content.strip(),
                    "model_used": f"ollama/{model}",
                    "generation_time_ms": ms,
                }
            except Exception as e:
                logger.warning(f"[Ollama] {model} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(
            f"All Ollama models failed. Is Ollama running? Last error: {last_error}"
        )

    # ── Groq generation with fallback chain ─────────────────────────────────
    def _generate_with_groq(self, prompt: str) -> dict:
        last_error = None
        for model in GROQ_FALLBACK_MODELS:
            try:
                logger.info(f"[Groq] Trying model: {model}")
                start = time.time()
                resp = self.groq_client.chat.completions.create(
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
                logger.warning(f"[Groq] Rate limit hit for {model}. Trying next…")
                last_error = e
                continue
            except BadRequestError as e:
                # Skip decommissioned / invalid models — don't crash the chain
                err_code = getattr(e, 'code', '') or ""
                err_body = str(e)
                if any(k in err_body for k in ("model_decommissioned", "model_not_active", "does not exist")):
                    logger.warning(f"[Groq] {model} is decommissioned/unavailable. Skipping…")
                    last_error = e
                    continue
                raise  # Other 400 errors (bad prompt, etc.) — raise immediately
            except Exception as e:
                logger.error(f"[Groq] Non-recoverable error on {model}: {e}")
                raise

        raise RuntimeError(
            f"All Groq models are rate-limited. Last error: {last_error}. "
            "Please wait a few minutes and try again."
        )

    # ── Public entry point ───────────────────────────────────────────────────
    def generate_answer(self, question: str, context_chunks: list[str]) -> dict:
        prompt = _build_prompt(question, context_chunks)

        if self.use_ollama:
            logger.info("[Generator] USE_OLLAMA=true — using local Ollama")
            return self._generate_with_ollama(prompt)

        return self._generate_with_groq(prompt)
