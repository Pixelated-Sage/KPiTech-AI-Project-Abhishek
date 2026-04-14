import time
from fastapi import APIRouter, HTTPException, Request
from minirag.backend.models.schemas import QueryRequest, QueryResponse, SimilarityRow

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def query_document(req: QueryRequest, request: Request):
    embedder = request.app.state.embedder
    vector_store = request.app.state.vector_store
    generator = request.app.state.generator

    if not hasattr(vector_store, "collection") or vector_store.collection is None:
        raise HTTPException(400, "No document uploaded yet. Please upload an MSA PDF first.")

    from minirag.backend.services.retriever import retrieve_and_build_report

    t_start = time.time()
    report, context_chunks = retrieve_and_build_report(
        req.question, embedder, vector_store, top_k=req.top_k
    )
    retrieval_ms = int((time.time() - t_start) * 1000)

    gen = generator.generate_answer(req.question, context_chunks)

    return QueryResponse(
        question=req.question,
        similarity_report=[
            SimilarityRow(
                rank=r.rank,
                location=r.location,
                similarity_score=r.similarity_score,
                score_signal=r.score_signal,
                chunk_preview=r.chunk_preview,
            )
            for r in report
        ],
        answer=gen["answer"],
        model_used=gen["model_used"],
        retrieval_time_ms=retrieval_ms,
        generation_time_ms=gen["generation_time_ms"],
    )
