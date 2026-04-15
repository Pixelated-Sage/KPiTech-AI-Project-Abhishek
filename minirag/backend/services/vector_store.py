import chromadb
from chromadb.config import Settings

class VectorStoreService:
    def __init__(self, persist_dir: str = "./chroma_data"):
        """
        Initialize ChromaDB with persistent storage.
        
        PersistentClient: data survives process restarts.
        Data is stored at ./chroma_data/ as SQLite + binary files.
        """
        self.client = chromadb.PersistentClient(path=persist_dir)
        # Attempt to load existing collection if it exists
        try:
            self.collection = self.client.get_collection(name="msa_chunks")
        except Exception:
            self.collection = None
    
    def create_collection(self, name: str = "msa_chunks"):
        """
        Create or get a collection. 
        
        hnsw:space = "cosine" configures the distance metric.
        ChromaDB supports: "cosine", "l2" (Euclidean), "ip" (inner product).
        We use cosine because our embeddings are normalized.
        """
        self.collection = self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )
        return self.collection
    
    def add_chunks(self, chunks: list, embeddings: list):
        """
        Store chunks with their embeddings and metadata in ChromaDB.
        
        ChromaDB stores:
        - ids: unique identifier per chunk
        - embeddings: the 384-dim vector
        - documents: the original text (for display in Similarity Report)
        - metadatas: page number, paragraph index (for location display)
        """
        self.collection.add(
            ids=[c.chunk_id for c in chunks],
            embeddings=[e.tolist() for e in embeddings],
            documents=[c.text for c in chunks],
            metadatas=[{
                "page_number": c.page_number,
                "paragraph_index": c.paragraph_index,
                "chunk_index": c.chunk_index,
            } for c in chunks],
        )
    
    def query(self, query_embedding: list, n_results: int = 5) -> dict:
        """
        Find the top-N most similar chunks to the query embedding.
        
        Returns:
        - ids: chunk identifiers
        - documents: original text of each chunk
        - metadatas: page/paragraph info for each chunk
        - distances: cosine distances (lower = more similar)
        
        NOTE: ChromaDB returns DISTANCES, not similarities.
        For cosine: similarity = 1 - distance
        """
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
        return results
    
    def reset(self):
        """Delete the collection — used when uploading a new document."""
        try:
            self.client.delete_collection("msa_chunks")
        except Exception:
            pass