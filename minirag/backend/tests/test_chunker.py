"""
Unit tests for the chunker service.
Tests chunk production, metadata tagging, and tiny-fragment filtering.
"""
from minirag.backend.services.chunker import chunk_document
from minirag.backend.services.pdf_extractor import PageContent


def make_page(page_number: int, paragraphs: list[str]) -> PageContent:
    return PageContent(
        page_number=page_number,
        text="\n\n".join(paragraphs),
        paragraphs=paragraphs,
    )


def test_basic_chunking_produces_chunks(sample_pages):
    chunks = chunk_document(sample_pages)
    assert len(chunks) > 0


def test_chunk_ids_are_unique(sample_pages):
    chunks = chunk_document(sample_pages)
    ids = [c.chunk_id for c in chunks]
    assert len(ids) == len(set(ids))


def test_chunk_ids_are_sequential(sample_pages):
    chunks = chunk_document(sample_pages)
    for i, chunk in enumerate(chunks):
        assert chunk.chunk_id == f"chunk_{i:04d}"
        assert chunk.chunk_index == i


def test_page_numbers_preserved(sample_pages):
    chunks = chunk_document(sample_pages)
    page_numbers = {c.page_number for c in chunks}
    # Both pages should be represented
    assert 1 in page_numbers
    assert 2 in page_numbers


def test_tiny_fragments_skipped():
    """Paragraphs shorter than 50 chars should be dropped."""
    page = make_page(1, ["Hi.", "This is a proper paragraph with enough content to be kept as a chunk."])
    chunks = chunk_document([page])
    texts = [c.text for c in chunks]
    assert not any(t == "Hi." for t in texts)
    assert any("proper paragraph" in t for t in texts)


def test_large_paragraph_splits_into_multiple_chunks():
    long_text = "word " * 200  # ~1000 chars, exceeds 512 chunk_size
    page = make_page(1, [long_text])
    chunks = chunk_document([page], chunk_size=128, chunk_overlap=20)
    assert len(chunks) > 1


def test_empty_pages_returns_no_chunks():
    page = make_page(1, ["   ", ""])
    chunks = chunk_document([page])
    assert chunks == []
