---
title: MiniRAG Backend
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# KPiTech AI Project - MiniRAG

A full-stack Retrieval-Augmented Generation (RAG) web application designed for Master Service Agreement (MSA) document analysis.

## Project Structure

The project is structured into two main directories under `minirag/`:

- `backend/`: FastAPI-powered Python backend containing the RAG logic (extraction, chunking, embedding, vector storage, and generation).
- `frontend/`: Next.js (App Router) React application providing the user interface for document upload, querying, and viewing the similarity report.

## Tech Stack

**Backend:**

- **Framework:** FastAPI
- **LLM/Embeddings:** OpenAI SDK (configured for Groq with Llama 3 models), SentenceTransformers (`all-MiniLM-L6-v2`)
- **Vector Database:** ChromaDB
- **PDF Extraction:** PDFPlumber
- **Testing:** Pytest

**Frontend:**

- **Framework:** Next.js 14, React
- **Styling:** Tailwind CSS, Framer Motion
- **Icons:** Lucide React

## Features

1. **Document Upload:** Users can upload PDF MSA contracts. The system chunks and embeds the text, storing it in a local ChromaDB instance.
2. **Querying (RAG):** Users can ask questions about the uploaded document. The system retrieves relevant chunks and uses Llama 3 to generate an accurate answer based purely on the document's context.
3. **Similarity Report:** Displays the top matched chunks along with their exact location in the document (page and paragraph) and a confidence signal.
4. **Automated Evaluation:** An integrated `/evaluate` endpoint that tests the system's accuracy against a known `ground_truth.json` file using an LLM-as-a-Judge approach.

## Getting Started

Please see the docs or navigate into `minirag/backend` and `minirag/frontend` for specific dependency and setup instructions. You can run the application stack using Docker Compose:

```bash
cd minirag
docker-compose up --build
```
