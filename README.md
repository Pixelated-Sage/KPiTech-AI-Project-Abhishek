---
title: MiniRAG Backend
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# MiniRAG — MSA Contract Q&A System

> **KPi-Tech Services Inc. · AI Interop Engineer · Hiring Assessment**
> Candidate: Abhishek

A production-deployed, full-stack Retrieval-Augmented Generation (RAG) application for legal document intelligence. Upload an MSA PDF, ask plain-English questions, get accurate answers backed by visible, scored evidence — with an automated evaluation layer.

**Live:**

- 🌐 Frontend (Vercel): _(add URL)_
- 🤗 Backend (HuggingFace Docker Space): _(add URL)_

---

## Quick Overview

```
PDF → PDFPlumber → LangChain Chunker (512 chars / 50 overlap)
    → all-MiniLM-L6-v2 (384-dim embeddings) → ChromaDB
    → Query → Cosine Similarity → Top-5 Chunks
    → Llama 3.3 70B via Groq → Answer + Similarity Report
    → Judge LLM (Llama 3.1 8B) → Evaluation: Match / Partial / No Match
```

## Stack

| Layer       | Tech                                                      |
| ----------- | --------------------------------------------------------- |
| Frontend    | Next.js 14 · Tailwind CSS · Vercel                        |
| Backend     | FastAPI · Python 3.11 · HuggingFace Docker Space          |
| Embedding   | `all-MiniLM-L6-v2` · 384-dim · SentenceTransformers       |
| Vector DB   | ChromaDB · cosine similarity                              |
| LLM (Query) | Llama 3.3 70B via Groq (fallback: 8B instant → 8B stable) |
| LLM (Judge) | Llama 3.1 8B Instant via Groq (500K TPD)                  |

## Project Structure

```
minirag/
├── backend/          # FastAPI RAG backend
│   ├── routers/      # upload, query, evaluate endpoints
│   ├── services/     # embedder, chunker, generator, judge, retriever
│   └── data/         # ground_truth.json (10 Q&A pairs)
├── frontend/         # Next.js 14 UI
│   ├── app/          # page.tsx — main chat interface
│   ├── components/   # FileUpload, SimilarityReport, EvaluationTable
│   └── lib/          # api.ts — smart fallback fetch layer
└── README.md         # Full design decision documentation ← read this
```

📖 **Full design decisions, architecture, and setup:** [`minirag/README.md`](minirag/README.md)
