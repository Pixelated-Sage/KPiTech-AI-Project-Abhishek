"""
Integration tests for FastAPI routes.
Uses TestClient with mocked services — no Groq API calls, no real PDFs required.
"""
import io
import json
import numpy as np
import pytest
from pathlib import Path


# --- Health endpoint ---

def test_health_ok(app_client):
    resp = app_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True


# --- Upload endpoint ---

def _make_minimal_pdf() -> bytes:
    """Return the smallest valid PDF binary that pdfplumber can open."""
    # A real minimal PDF with one page containing text
    pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>
stream
BT /F1 12 Tf 100 700 Td (This is a test MSA contract paragraph with enough text content for chunking purposes.) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
369
%%EOF"""
    return pdf_content


def test_upload_rejects_non_pdf(app_client):
    resp = app_client.post(
        "/api/upload",
        files={"file": ("document.txt", b"hello world", "text/plain")},
    )
    assert resp.status_code == 400


def test_upload_rejects_empty_file(app_client):
    resp = app_client.post(
        "/api/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert resp.status_code in (400, 422)


def test_upload_success_with_real_pdf(app_client, tmp_path):
    """Upload Term.pdf if available, otherwise skip."""
    pdf_path = Path("/home/abhishek/Desktop/KPiTech-AI-Project-Abhishek/Term.pdf")
    if not pdf_path.exists():
        pytest.skip("Term.pdf not available in test environment")

    with open(pdf_path, "rb") as f:
        resp = app_client.post(
            "/api/upload",
            files={"file": ("Term.pdf", f, "application/pdf")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["total_pages"] > 0
    assert data["total_chunks"] > 0
    assert data["embedding_model"] == "test-model"


# --- Query endpoint ---

def test_query_fails_without_document(app_client):
    """Query with no collection should return 400."""
    app_client.app.state.vector_store.collection = None
    resp = app_client.post(
        "/api/query",
        json={"question": "What are the payment terms?", "top_k": 3},
    )
    assert resp.status_code == 400


def test_query_succeeds_after_upload(app_client, sample_chunks):
    """Seed the vector store then query — expect a full QueryResponse."""
    vs = app_client.app.state.vector_store
    vs.reset()
    vs.create_collection()
    embeddings = np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32
    )
    vs.add_chunks(sample_chunks, embeddings)

    resp = app_client.post(
        "/api/query",
        json={"question": "What are the payment terms?", "top_k": 2},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Test answer from mock."
    assert data["model_used"] == "mock-model"
    assert len(data["similarity_report"]) == 2
    for row in data["similarity_report"]:
        assert row["rank"] >= 1
        assert 0.0 <= row["similarity_score"] <= 1.0
        assert row["score_signal"] in ("Strong", "Good", "Weak", "Poor")


# --- Evaluate endpoint ---

def test_evaluate_fails_without_document(app_client):
    app_client.app.state.vector_store.collection = None
    resp = app_client.post("/api/evaluate")
    assert resp.status_code == 400


def test_evaluate_succeeds_after_upload(app_client, sample_chunks):
    """Seed vector store and run evaluation — checks summary maths."""
    vs = app_client.app.state.vector_store
    vs.reset()
    vs.create_collection()
    embeddings = np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32
    )
    vs.add_chunks(sample_chunks, embeddings)

    resp = app_client.post("/api/evaluate")
    assert resp.status_code == 200
    data = resp.json()

    summary = data["summary"]
    total = summary["match"] + summary["partial_match"] + summary["no_match"]
    assert total == len(data["results"])
    assert 0 <= summary["accuracy_percent"] <= 100
