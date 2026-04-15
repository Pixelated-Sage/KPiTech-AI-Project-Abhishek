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
        Prepare the service. The model is NOT loaded here to save startup time.
        It will be loaded on the first request (Lazy Loading).
        """
        self.model_name = model_name
        self._model = None
        self.dimensions = 384
    
    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model
    
    def embed_texts(self, texts: list[str]) -> np.ndarray:
        """
        Convert a list of text strings into embedding vectors.
        """
        embeddings = self.model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=True,
        )
        return embeddings
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Embed a single query string.
        """
        embedding = self.model.encode(
            query,
            normalize_embeddings=True,
        )
        return embedding