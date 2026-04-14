import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from minirag.backend.models.schemas import EvaluationResponse, EvaluationResult, EvaluationSummary

router = APIRouter()

GROUND_TRUTH_PATH = Path(__file__).parent.parent / "data" / "ground_truth.json"

def get_services():
    from minirag.backend.main import embedder, vector_store, generator, judge
    return embedder, vector_store, generator, judge

@router.post("/evaluate", response_model=EvaluationResponse)
async def run_evaluation():
    embedder, vector_store, generator, judge_svc = get_services()

    if not hasattr(vector_store, "collection") or vector_store.collection is None:
        raise HTTPException(400, "No document uploaded yet")

    ground_truth = json.loads(GROUND_TRUTH_PATH.read_text())
    from minirag.backend.services.retriever import retrieve_and_build_report

    results = []
    counts = {"Match": 0, "Partial Match": 0, "No Match": 0}

    for item in ground_truth:
        _, context = retrieve_and_build_report(item["question"], embedder, vector_store)
        gen = generator.generate_answer(item["question"], context)
        system_answer = gen["answer"]
        judgement, reason = judge_svc.judge_single(item["expected_answer"], system_answer)
        counts[judgement] += 1
        results.append(EvaluationResult(
            id=item["id"],
            category=item["category"],
            question=item["question"],
            expected_answer=item["expected_answer"],
            system_answer=system_answer,
            judgement=judgement,
            reason=reason,
        ))

    total = len(ground_truth)
    return EvaluationResponse(
        results=results,
        summary=EvaluationSummary(
            match=counts["Match"],
            partial_match=counts["Partial Match"],
            no_match=counts["No Match"],
            accuracy_percent=round(counts["Match"] / total * 100),
        ),
    )
