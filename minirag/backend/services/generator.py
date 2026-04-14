import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class GeneratorService:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = "llama-3.3-70b-versatile"

    def generate_answer(self, question: str, context_chunks: list[str]) -> dict:
        context = "\n\n".join(
            f"[Chunk {i+1}]: {chunk}" for i, chunk in enumerate(context_chunks)
        )
        prompt = (
            "You are a document analysis assistant. Answer the user's question "
            "comprehensively using the provided context.\n\n"
            "RULES:\n"
            "- Answer using only the provided context\n"
            "- Be comprehensive: include specific names, dates, and full tech stacks mentioned in the context\n"
            "- If multiple valid answers exist, summarise all of them\n"
            "- If not found, say exactly: 'Not found in the document.'\n"
            "- No preamble, no rephrasing the question\n\n"
            f"CONTEXT:\n{context}\n\n"
            f"QUESTION: {question}\n\nANSWER:"
        )
        start = time.time()
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=150,
        )
        ms = int((time.time() - start) * 1000)
        return {
            "answer": resp.choices[0].message.content.strip(),
            "model_used": self.model,
            "generation_time_ms": ms,
        }
