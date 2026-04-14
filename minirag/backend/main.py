import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from minirag.backend.services.embedder import EmbeddingService
    from minirag.backend.services.vector_store import VectorStoreService
    from minirag.backend.services.generator import GeneratorService
    from minirag.backend.services.judge import JudgeService

    app.state.embedder = EmbeddingService(os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"))
    app.state.vector_store = VectorStoreService(os.getenv("CHROMA_PERSIST_DIR", "./chroma_data"))

    # Try to reconnect to existing collection
    try:
        app.state.vector_store.create_collection()
    except Exception:
        pass

    app.state.generator = GeneratorService()
    groq_client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )
    app.state.judge = JudgeService(groq_client)
    yield

app = FastAPI(title="MiniRAG API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from minirag.backend.routers import upload, query, evaluate
app.include_router(upload.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(evaluate.router, prefix="/api")

@app.get("/api/health")
async def health():
    embedder = getattr(app.state, "embedder", None)
    vector_store = getattr(app.state, "vector_store", None)
    return {
        "status": "ok",
        "model_loaded": embedder is not None,
        "document_ready": hasattr(vector_store, "collection") and vector_store.collection is not None,
    }
