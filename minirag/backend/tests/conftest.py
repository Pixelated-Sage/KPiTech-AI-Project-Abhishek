"""
Shared fixtures for MiniRAG backend tests.
"""
import pytest
import tempfile
import os
import numpy as np
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def sample_pages():
    """Two fake pages with paragraphs — avoids real PDF parsing in unit tests.
    Text must exceed 50 chars per paragraph to survive the chunker's tiny-fragment filter.
    """
    from minirag.backend.services.pdf_extractor import PageContent
    return [
        PageContent(
            page_number=1,
            text=(
                "This Master Services Agreement governs the relationship between the parties.\n\n"
                "Both parties agree to maintain confidentiality of proprietary information shared."
            ),
            paragraphs=[
                "This Master Services Agreement governs the relationship between the parties.",
                "Both parties agree to maintain confidentiality of proprietary information shared.",
            ],
        ),
        PageContent(
            page_number=2,
            text=(
                "Payment terms are net thirty days from the date of invoice submission.\n\n"
                "Termination of this agreement requires thirty days prior written notice to the other party."
            ),
            paragraphs=[
                "Payment terms are net thirty days from the date of invoice submission.",
                "Termination of this agreement requires thirty days prior written notice to the other party.",
            ],
        ),
    ]


@pytest.fixture
def sample_chunks(sample_pages):
    """Real chunks produced from sample_pages via the chunker."""
    from minirag.backend.services.chunker import chunk_document
    return chunk_document(sample_pages, chunk_size=128, chunk_overlap=20)


@pytest.fixture
def mock_embedder():
    """EmbeddingService stub — returns deterministic unit vectors."""
    embedder = MagicMock()
    embedder.model_name = "test-model"
    # embed_texts returns (N, 4) matrix of normalized vectors
    embedder.embed_texts.side_effect = lambda texts: np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(texts), dtype=np.float32
    )
    # embed_query returns a single unit vector
    embedder.embed_query.return_value = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    return embedder


@pytest.fixture
def temp_vector_store():
    """Real VectorStoreService with a temp directory — cleaned up after test."""
    from minirag.backend.services.vector_store import VectorStoreService
    with tempfile.TemporaryDirectory() as tmpdir:
        vs = VectorStoreService(persist_dir=tmpdir)
        vs.create_collection()
        yield vs


@pytest.fixture
def app_client(mock_embedder, temp_vector_store):
    """
    FastAPI TestClient with services pre-injected into app.state.
    Groq calls are mocked — tests don't touch the network.

    IMPORTANT: app.state must be overridden INSIDE the `with TestClient` block
    because the lifespan runs when entering the context and would overwrite
    any state set before it.
    """
    from minirag.backend.main import app
    from unittest.mock import MagicMock

    mock_generator = MagicMock()
    mock_generator.generate_answer.return_value = {
        "answer": "Test answer from mock.",
        "model_used": "mock-model",
        "generation_time_ms": 10,
    }

    mock_judge = MagicMock()
    mock_judge.judge_single.return_value = ("Match", "Reasoning: Answers match.\nLabel: MATCH")

    with TestClient(app, raise_server_exceptions=True) as client:
        # Lifespan has already run — now override with test doubles
        app.state.embedder = mock_embedder
        app.state.vector_store = temp_vector_store
        app.state.generator = mock_generator
        app.state.judge = mock_judge
        yield client
