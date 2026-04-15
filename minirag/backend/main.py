import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Store only lightweight config — no heavy init here.
    # All services initialize lazily on their first request.
    # This allows the server to start and open its port instantly.
    app.state.embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    app.state.chroma_persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
    app.state.groq_api_key = os.getenv("GROQ_API_KEY")
    # Actual service objects — will be set on first request
    app.state.embedder = None
    app.state.vector_store = None
    app.state.generator = None
    app.state.judge = None
    yield

app = FastAPI(title="MiniRAG API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\.vercel\.app|http://localhost:300[0-9]",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_services(request_app):
    """
    Lazy initialization of all heavy services.
    Called on the first API request instead of at server startup.
    This keeps startup instant so Render can detect the open port.
    """
    from minirag.backend.services.embedder import EmbeddingService
    from minirag.backend.services.vector_store import VectorStoreService
    from minirag.backend.services.generator import GeneratorService
    from minirag.backend.services.judge import JudgeService

    if request_app.state.embedder is None:
        request_app.state.embedder = EmbeddingService(request_app.state.embedding_model)

    if request_app.state.vector_store is None:
        request_app.state.vector_store = VectorStoreService(request_app.state.chroma_persist_dir)

    if request_app.state.generator is None:
        request_app.state.generator = GeneratorService()

    if request_app.state.judge is None:
        groq_client = OpenAI(
            api_key=request_app.state.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        request_app.state.judge = JudgeService(groq_client)

    return (
        request_app.state.embedder,
        request_app.state.vector_store,
        request_app.state.generator,
        request_app.state.judge,
    )

from minirag.backend.routers import upload, query, evaluate
app.include_router(upload.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(evaluate.router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {
        "message": "MiniRAG AI Backend is running successfully!",
        "health_check": "/api/health",
        "docs": "/docs"
    }
