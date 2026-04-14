import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

JUDGE_MODEL = "llama-3.1-8b-instant"

class JudgeService:
    def __init__(self, generator_client: OpenAI):
        self.client = generator_client

    def judge_single(self, expected: str, system_answer: str) -> tuple[str, str]:
        prompt = (
            "You are evaluating a RAG system's answer against a ground truth answer "
            "extracted from a contract document. Compare the two answers and classify "
            "the result as exactly one of: Match, Partial Match, or No Match. Then "
            "provide a single sentence explaining your classification. "
            "Do not add any other commentary.\n\n"
            f"Ground Truth Answer: {expected}\nSystem Answer: {system_answer}"
        )
        resp = self.client.chat.completions.create(
            model=JUDGE_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=150,
        )
        text = resp.choices[0].message.content.strip()
        if text.startswith("Partial Match"):
            j = "Partial Match"
            r = text.replace("Partial Match.", "").replace("Partial Match:", "").strip()
        elif text.startswith("No Match"):
            j = "No Match"
            r = text.replace("No Match.", "").replace("No Match:", "").strip()
        elif text.startswith("Match"):
            j = "Match"
            r = text.replace("Match.", "").replace("Match:", "").strip()
        else:
            tl = text.lower()
            if "partial" in tl:
                j = "Partial Match"
            elif "no match" in tl:
                j = "No Match"
            else:
                j = "Match"
            r = text
        return j, r
