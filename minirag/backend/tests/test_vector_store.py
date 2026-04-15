"""
Unit tests for VectorStoreService.
Uses a temp directory so no persistent data is left behind.
"""
import numpy as np
import pytest
from minirag.backend.services.vector_store import VectorStoreService


def test_create_collection(temp_vector_store):
    assert temp_vector_store.collection is not None


def test_add_and_query_chunks(temp_vector_store, sample_chunks):
    embeddings = np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32
    )
    temp_vector_store.add_chunks(sample_chunks, embeddings)

    query_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    results = temp_vector_store.query(query_vec, n_results=2)

    assert len(results["ids"][0]) == 2
    assert len(results["documents"][0]) == 2
    assert len(results["distances"][0]) == 2


def test_reset_clears_collection(temp_vector_store, sample_chunks):
    embeddings = np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32
    )
    temp_vector_store.add_chunks(sample_chunks, embeddings)

    # Reset and recreate
    temp_vector_store.reset()
    temp_vector_store.create_collection()

    # Collection should be empty
    query_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    results = temp_vector_store.query(query_vec, n_results=1)
    assert results["ids"][0] == []


def test_reset_on_empty_collection_does_not_raise(temp_vector_store):
    """reset() must silently succeed even if collection was already deleted."""
    temp_vector_store.reset()
    temp_vector_store.reset()  # second call should not raise


def test_metadata_preserved(temp_vector_store, sample_chunks):
    embeddings = np.array(
        [[1.0, 0.0, 0.0, 0.0]] * len(sample_chunks), dtype=np.float32
    )
    temp_vector_store.add_chunks(sample_chunks, embeddings)

    query_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    results = temp_vector_store.query(query_vec, n_results=1)

    meta = results["metadatas"][0][0]
    assert "page_number" in meta
    assert "paragraph_index" in meta
    assert "chunk_index" in meta
