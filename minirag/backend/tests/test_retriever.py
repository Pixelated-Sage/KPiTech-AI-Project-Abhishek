"""
Unit tests for the retriever service.
Tests score signal thresholds and the full retrieval pipeline with mocked dependencies.
"""
import numpy as np
from minirag.backend.services.retriever import get_score_signal, retrieve_and_build_report


# --- Score signal threshold tests ---

def test_strong_signal():
    assert get_score_signal(0.85) == "Strong"
    assert get_score_signal(0.95) == "Strong"
    assert get_score_signal(1.0) == "Strong"


def test_good_signal():
    assert get_score_signal(0.70) == "Good"
    assert get_score_signal(0.80) == "Good"
    assert get_score_signal(0.84) == "Good"


def test_weak_signal():
    assert get_score_signal(0.50) == "Weak"
    assert get_score_signal(0.65) == "Weak"
    assert get_score_signal(0.69) == "Weak"


def test_poor_signal():
    assert get_score_signal(0.49) == "Poor"
    assert get_score_signal(0.0) == "Poor"


# --- Full retrieval pipeline test ---

def test_retrieve_and_build_report(mock_embedder, temp_vector_store, sample_chunks):
    """End-to-end retrieval: add chunks, query, get back a report."""
    import numpy as np

    # Add real chunks to the vector store
    embeddings = np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32
    )
    temp_vector_store.add_chunks(sample_chunks, embeddings)

    report, context = retrieve_and_build_report(
        "What are the payment terms?",
        mock_embedder,
        temp_vector_store,
        top_k=2,
    )

    assert len(report) == 2
    assert len(context) == 2

    # First result should have rank 1
    assert report[0].rank == 1

    # Similarity score must be in [0, 1]
    for r in report:
        assert 0.0 <= r.similarity_score <= 1.0
        assert r.score_signal in ("Strong", "Good", "Weak", "Poor")
        assert r.location.startswith("Page")
        assert isinstance(r.chunk_preview, str)


def test_chunk_preview_truncated(mock_embedder, temp_vector_store, sample_chunks):
    """chunk_preview must be <= 123 chars (120 + '...')."""
    import numpy as np
    embeddings = np.array([[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32)
    temp_vector_store.add_chunks(sample_chunks, embeddings)

    report, _ = retrieve_and_build_report("test", mock_embedder, temp_vector_store, top_k=1)
    assert len(report[0].chunk_preview) <= 123
