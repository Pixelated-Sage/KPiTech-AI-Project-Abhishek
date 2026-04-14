const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002"

export interface UploadResult {
  status: string
  document_id: string
  total_pages: number
  total_chunks: number
  embedding_model: string
}

export interface SimilarityRow {
  rank: number
  location: string
  similarity_score: number
  score_signal: "Strong" | "Good" | "Weak" | "Poor"
  chunk_preview: string
}

export interface QueryResult {
  question: string
  similarity_report: SimilarityRow[]
  answer: string
  model_used: string
  retrieval_time_ms: number
  generation_time_ms: number
}

export interface EvalRow {
  id: number
  category: string
  question: string
  expected_answer: string
  system_answer: string
  judgement: "Match" | "Partial Match" | "No Match"
  reason: string
}

export interface EvalResult {
  results: EvalRow[]
  summary: { match: number; partial_match: number; no_match: number; accuracy_percent: number }
}

async function post<T>(path: string, body?: unknown, file?: File): Promise<T> {
  let init: RequestInit
  if (file) {
    const fd = new FormData()
    fd.append("file", file)
    init = { method: "POST", body: fd }
  } else {
    init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  }
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? "Request failed")
  }
  return res.json()
}

export const api = {
  upload: (file: File) => post<UploadResult>("/api/upload", undefined, file),
  query: (question: string, top_k = 5) => post<QueryResult>("/api/query", { question, top_k }),
  evaluate: () => post<EvalResult>("/api/evaluate"),
  health: () => fetch(`${BASE}/api/health`).then(r => r.json()),
}
