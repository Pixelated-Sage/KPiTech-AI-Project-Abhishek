// ─── Primary backend (HuggingFace or configured URL) ─────────────────────────
const PRIMARY_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8002"

// ─── Local fallback ports to probe when primary is rate-limited ───────────────
const LOCAL_PORTS = [8001, 8002, 8003, 8004, 8005]
const LOCAL_PROBE_TIMEOUT_MS = 1200

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

// ─── Session-level cache: once we find a live local port, reuse it ─────────────
let _cachedLocalBase: string | null = null

/** Probe a single local port — resolves to base URL or null */
async function probePort(port: number): Promise<string | null> {
  const base = `http://localhost:${port}`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), LOCAL_PROBE_TIMEOUT_MS)
    const res = await fetch(`${base}/api/health`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) return base
  } catch { /* unreachable / timed out */ }
  return null
}

/** Try all local ports in order — returns first live base URL or null */
async function findLocalBackend(): Promise<string | null> {
  if (_cachedLocalBase) {
    // Re-validate the cached port is still up
    const ok = await probePort(parseInt(_cachedLocalBase.split(":")[2]))
    if (ok) return _cachedLocalBase
    _cachedLocalBase = null // stale — re-probe
  }
  for (const port of LOCAL_PORTS) {
    const base = await probePort(port)
    if (base) {
      _cachedLocalBase = base
      console.info(`[MiniRAG] Local backend found at ${base} — using Ollama fallback`)
      return base
    }
  }
  return null
}

/** Check if an error message indicates a rate-limit (Groq 429) */
function isRateLimitError(msg: string): boolean {
  return /429|rate.?limit|rate_limit_exceeded|tokens per day/i.test(msg)
}

// ─── Core POST helper ─────────────────────────────────────────────────────────
async function post<T>(
  path: string,
  body?: unknown,
  file?: File,
  baseOverride?: string,
): Promise<T> {
  const base = baseOverride ?? PRIMARY_BASE
  let init: RequestInit
  if (file) {
    const fd = new FormData()
    fd.append("file", file)
    init = { method: "POST", body: fd }
  } else {
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  }
  const res = await fetch(`${base}${path}`, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? "Request failed")
  }
  return res.json()
}

// ─── Smart query: primary → local Ollama fallback on rate-limit ───────────────
async function smartQuery(question: string, top_k = 5): Promise<QueryResult> {
  try {
    // 1. Try primary (HuggingFace / Groq)
    return await post<QueryResult>("/api/query", { question, top_k })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""

    if (!isRateLimitError(msg)) throw e // Non-rate-limit error — bubble up

    // 2. Primary is rate-limited — try to find a live local backend
    console.warn("[MiniRAG] Primary rate-limited. Probing local backends…")
    const localBase = await findLocalBackend()

    if (!localBase) {
      // No local backend running — rethrow original rate-limit error
      throw e
    }

    console.info(`[MiniRAG] Falling back to local backend at ${localBase}`)
    // Local backend uses Ollama (USE_OLLAMA=true in local .env)
    return await post<QueryResult>("/api/query", { question, top_k }, undefined, localBase)
  }
}

// ─── Public API surface ───────────────────────────────────────────────────────
export const api = {
  upload:   (file: File) => post<UploadResult>("/api/upload", undefined, file),
  query:    (question: string, top_k = 5) => smartQuery(question, top_k),
  evaluate: () => post<EvalResult>("/api/evaluate"),
  health:   () => fetch(`${PRIMARY_BASE}/api/health`).then(r => r.json()),
}
