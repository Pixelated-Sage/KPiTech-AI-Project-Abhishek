import logging
from sentence_transformers import SentenceTransformer
import numpy as np

# Suppress the harmless "UNEXPECTED: embeddings.position_ids" load report.
# This buffer was added in newer HuggingFace transformers but isn't stored in
# the all-MiniLM-L6-v2 checkpoint — it's auto-initialized and safe to ignore.
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Load the embedding model once at startup.
        The model is ~80MB and downloads automatically on first use.
        After that, it's cached at ~/.cache/torch/sentence_transformers/
        """
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        self.dimensions = self.model.get_embedding_dimension()
        # → 384 for all-MiniLM-L6-v2
    
    def embed_texts(self, texts: list[str]) -> np.ndarray:
        """
        Convert a list of text strings into embedding vectors.
        
        Uses batch encoding for efficiency:
        - batch_size=32: Process 32 texts at once (optimal for CPU)
        - normalize_embeddings=True: L2-normalize so cosine similarity = dot product
        - show_progress_bar: Useful during document ingestion (47 chunks)
        """
        embeddings = self.model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True,  # Critical for cosine similarity
            show_progress_bar=True,
        )
        return embeddings
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Embed a single query string. No batching needed.
        
        IMPORTANT: Must use the SAME model as embed_texts().
        Different models produce incompatible vector spaces.
        """
        embedding = self.model.encode(
            query,
            normalize_embeddings=True,
        )
        return embedding