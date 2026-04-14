from pydantic import BaseModel, Field
from typing import Literal

class UploadResponse(BaseModel):
    status: str
    document_id: str
    total_pages: int
    total_chunks: int
    embedding_model: str

class QueryRequest(BaseModel):
    question: str = Field(min_length=3)
    top_k: int = Field(default=5, ge=1, le=20)

class SimilarityRow(BaseModel):
    rank: int
    location: str
    similarity_score: float
    score_signal: Literal["Strong", "Good", "Weak", "Poor"]
    chunk_preview: str

class QueryResponse(BaseModel):
    question: str
    similarity_report: list[SimilarityRow]
    answer: str
    model_used: str
    retrieval_time_ms: int
    generation_time_ms: int

class EvaluationResult(BaseModel):
    id: int
    category: str
    question: str
    expected_answer: str
    system_answer: str
    judgement: Literal["Match", "Partial Match", "No Match"]
    reason: str

class EvaluationSummary(BaseModel):
    match: int
    partial_match: int
    no_match: int
    accuracy_percent: int

class EvaluationResponse(BaseModel):
    results: list[EvaluationResult]
    summary: EvaluationSummary
