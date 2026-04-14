from dataclasses import dataclass

@dataclass
class RetrievalResult:
    rank: int
    chunk_id: str
    location: str             # "Page 6, Para 3"
    similarity_score: float   # 0.0 to 1.0
    score_signal: str         # "Strong" | "Good" | "Weak" | "Poor"
    chunk_preview: str        # First 120 characters

def get_score_signal(score: float) -> str:
    """
    Convert numeric similarity score to human-readable signal.
    
    Thresholds from the assessment brief:
    - 0.85+ = Strong (green)
    - 0.70-0.84 = Good (yellow)
    - 0.50-0.69 = Weak (orange)
    - Below 0.50 = Poor (red)
    """
    if score >= 0.85:
        return "Strong"
    elif score >= 0.70:
        return "Good"
    elif score >= 0.50:
        return "Weak"
    else:
        return "Poor"

def retrieve_and_build_report(
    question: str,
    embedder: EmbeddingService,
    vector_store: VectorStoreService,
    top_k: int = 5,
) -> tuple[list[RetrievalResult], list[str]]:
    """
    Full retrieval pipeline:
    1. Embed the question
    2. Search ChromaDB for top-K similar chunks
    3. Build the Similarity Report data structure
    4. Return both the report and the raw chunk texts (for LLM context)
    """
    # Step 1: Embed the question using the SAME model
    query_embedding = embedder.embed_query(question)
    
    # Step 2: Vector similarity search
    results = vector_store.query(query_embedding, n_results=top_k)
    
    # Step 3: Build Similarity Report
    report = []
    context_chunks = []
    
    for i in range(len(results["ids"][0])):
        distance = results["distances"][0][i]
        similarity = 1 - distance  # Convert distance → similarity
        
        metadata = results["metadatas"][0][i]
        document = results["documents"][0][i]
        
        report.append(RetrievalResult(
            rank=i + 1,
            chunk_id=results["ids"][0][i],
            location=f"Page {metadata['page_number']}, Para {metadata['paragraph_index']}",
            similarity_score=round(similarity, 2),
            score_signal=get_score_signal(similarity),
            chunk_preview=document[:120] + "..." if len(document) > 120 else document,
        ))
        
        context_chunks.append(document)
    
    return report, context_chunks