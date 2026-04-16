# MiniRAG — MSA Contract Q&A System

> **KPi-Tech Services Inc. · AI Interop Engineer · Hiring Assessment**
> Candidate: Abhishek | Submission: GitHub Repository

---

## What This Is

MiniRAG is a full-stack Retrieval-Augmented Generation (RAG) application that lets a user upload a Master Service Agreement (MSA) PDF, ask plain-English questions about it, and receive accurate answers backed by visible, scored evidence from the document — all through a deployed web UI.

**Live URLs**

- Frontend: [Vercel — Next.js 14](https://minirag.vercel.app) _(update with actual URL)_
- Backend: [HuggingFace Docker Space](https://huggingface.co/spaces/) _(update with actual URL)_

---

## MSA Used

**Salesforce Master Subscription Agreement (MSA)**
Publicly available at: [salesforce.com/legal/agreements](https://www.salesforce.com/legal/agreements/)
Document length: 12 pages · 10,000+ words · covers subscription services, payment, IP, liability, confidentiality, termination, and governing law.

Chosen because it is a real, enterprise-grade MSA with clearly defined clauses across all 10 required test categories — making ground truth answers directly verifiable from the document text.

---

## Design Decisions

### Chunk Size: 512 characters

MSA clauses typically run 300–700 characters. 512 was chosen as the balanced midpoint:

- **Too short (e.g. 256):** risks splitting a clause mid-sentence, losing the legal subject
- **Too long (e.g. 1024):** introduces multiple clauses per chunk, diluting the semantic focus of each embedding
- 512 captures one complete legal clause in most cases, keeping embedding relevance high

### Overlap: 50 characters

Prevents a clause boundary from being stranded across two chunks with no connecting context.
50 chars is roughly one short phrase — enough to bridge the boundary without duplicating meaningful content across embeddings.

### Embedding Model: `all-MiniLM-L6-v2` (SentenceTransformers)

- 384-dimensional dense vectors
- Free, local, no API key required — runs inside the Docker container
- Fast inference (~5ms per chunk on CPU)
- Strong semantic performance on professional/legal text retrieval
- Same model instance used for both document chunking and query embedding — guarantees cosine comparisons are in the same vector space

### Vector Database: ChromaDB

- In-memory, zero external infrastructure
- Cosine similarity built-in
- Ships inside the Docker container — no Pinecone account or FAISS setup needed
- For a single-document RAG prototype, ChromaDB's simplicity is the right trade-off

### LLM for Answer Generation: Llama 3.3 70B via Groq API

- OpenAI-compatible API — drop-in with the `openai` Python SDK
- Free tier: 100K tokens/day
- ~1s generation latency on typical MSA questions
- 70B chosen over 8B for answer quality on complex legal retrieval
- **Fallback chain:** if 70B hits its rate limit → `llama-3.1-8b-instant` (500K TPD) → `llama3-8b-8192` (500K TPD)
- Decommissioned models auto-skipped (`BadRequestError` caught and next model tried)

### LLM for Evaluation Judge: `llama-3.1-8b-instant` via Groq API

- Judge task is classification (Match / Partial Match / No Match) — an 8B model is fully capable
- Uses 500K TPD free quota vs 100K for the 70B model — **intentional resource partitioning**: evaluation runs don't burn the token budget needed for actual query generation
- Falls back to `llama3-8b-8192` → `gemma2-9b-it` → `llama-3.3-70b-versatile` (last resort only)

---

## System Architecture

```
PDF Upload (Next.js UI)
        │
        ▼
Text Extraction (PDFPlumber · page-wise)
        │
        ▼
Chunking (LangChain RecursiveCharacterTextSplitter · 512 chars · 50 overlap)
 └── Each chunk tagged: page number + paragraph index
        │
        ▼
Embedding (all-MiniLM-L6-v2 · 384-dim vectors)
        │
        ▼
Vector Storage (ChromaDB · cosine similarity)
        │
  User asks question
        │
        ▼
Query Embedding (same model) → Cosine similarity search → Top-5 chunks
        │
        ▼
Context block → Groq LLM (Llama 3.3 70B) → Answer
        │
        ▼
UI: Answer panel + Similarity Report (rank, location, score, signal, preview)
```

---

## Similarity Report

Every query returns a ranked similarity report displayed in the UI:

| Rank | Location        | Score | Signal | Preview                            |
| ---- | --------------- | ----- | ------ | ---------------------------------- |
| 1    | Page 6, Para 3  | 0.91  | Strong | ...failure to meet deadlines...    |
| 2    | Page 6, Para 4  | 0.87  | Strong | ...penalties are capped at...      |
| 3    | Page 3, Para 1  | 0.74  | Good   | ...all milestone dates...          |
| 4    | Page 9, Para 2  | 0.61  | Weak   | ...the service provider shall...   |
| 5    | Page 11, Para 1 | 0.55  | Poor   | ...disputes arising from delays... |

**Score Signal Logic:**

- `≥ 0.85` → **Strong** (green)
- `0.70 – 0.84` → **Good** (blue)
- `0.50 – 0.69` → **Weak** (amber)
- `< 0.50` → **Poor** (red)

---

## Evaluation Layer

10 ground truth Q&A pairs sourced directly from the Salesforce MSA are stored in `backend/data/ground_truth.json`.

The evaluation flow:

1. All 10 questions run automatically through the full RAG pipeline
2. Each system answer is compared to the expected answer by a judge LLM
3. Judge outputs: `Match` / `Partial Match` / `No Match` + one-line reason
4. Full summary displayed in the UI with accuracy percentage and expandable per-question cards

---

## Ground Truth File

See [`backend/data/ground_truth.json`](backend/data/ground_truth.json) — 10 questions across:
Payment Terms, Late Payment Penalty, Delivery Deadline Penalty, Termination Conditions, Termination Notice Period, Limitation of Liability, Intellectual Property, Confidentiality Duration, Governing Law, Dispute Resolution.

Answers were manually verified against the Salesforce MSA text before running the system.

---

## Running Locally

### Backend

```bash
cd minirag/backend
pip install -r requirements.txt
# Set GROQ_API_KEY in .env
# For local Ollama fallback: set USE_OLLAMA=true, OLLAMA_BASE_URL=http://localhost:11434/v1
uvicorn minirag.backend.main:app --reload --port 8002
```

### Frontend

```bash
cd minirag/frontend
npm install
# Set NEXT_PUBLIC_API_URL=http://localhost:8002 in .env.local
npm run dev
```

### Docker (full stack)

```bash
cd minirag
docker-compose up --build
```

---

## Tech Stack

| Layer          | Technology                                             |
| -------------- | ------------------------------------------------------ |
| Frontend       | Next.js 14 (App Router) · Tailwind CSS · Lucide React  |
| Backend        | FastAPI · Python 3.11                                  |
| PDF Extraction | PDFPlumber                                             |
| Chunking       | LangChain RecursiveCharacterTextSplitter               |
| Embedding      | SentenceTransformers `all-MiniLM-L6-v2`                |
| Vector DB      | ChromaDB (cosine similarity)                           |
| LLM — Query    | Llama 3.3 70B via Groq API (with 8B fallbacks)         |
| LLM — Judge    | Llama 3.1 8B Instant via Groq API                      |
| Deployment     | HuggingFace Docker Space (backend) · Vercel (frontend) |

---

_Submitted for KPi-Tech Services Inc. AI Interop Engineer hiring assessment._
