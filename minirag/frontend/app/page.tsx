"use client"
import { useState } from "react"
import { FileUpload } from "@/components/FileUpload"
import { QueryInput } from "@/components/QueryInput"
import { SimilarityReport } from "@/components/SimilarityReport"
import { AnswerPanel } from "@/components/AnswerPanel"
import { EvaluationTable } from "@/components/EvaluationTable"
import { api, UploadResult, QueryResult, EvalResult } from "@/lib/api"

export default function Home() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [querying, setQuerying] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)

  async function handleQuery(question: string) {
    setQuerying(true); setQueryError(null); setQueryResult(null)
    try { setQueryResult(await api.query(question)) }
    catch (e) { setQueryError(e instanceof Error ? e.message : "Query failed") }
    finally { setQuerying(false) }
  }

  async function handleEvaluate() {
    setEvaluating(true); setEvalError(null); setEvalResult(null)
    try { setEvalResult(await api.evaluate()) }
    catch (e) { setEvalError(e instanceof Error ? e.message : "Evaluation failed") }
    finally { setEvaluating(false) }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">MiniRAG — MSA Contract Q&A</h1>

      {/* Upload */}
      {!uploadResult ? (
        <FileUpload onDone={setUploadResult} />
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✓ {uploadResult.document_id} loaded — {uploadResult.total_pages} pages, {uploadResult.total_chunks} chunks
          </p>
          <button onClick={() => { setUploadResult(null); setQueryResult(null); setEvalResult(null) }}
            className="text-sm text-green-600 underline mt-1">Upload different document</button>
        </div>
      )}

      {/* Query */}
      {uploadResult && (
        <section className="space-y-4">
          <QueryInput onSubmit={handleQuery} disabled={querying} />
          {querying && <p className="text-blue-600">Searching and generating answer...</p>}
          {queryError && <p className="text-red-600">{queryError}</p>}
          {queryResult && (
            <>
              <SimilarityReport rows={queryResult.similarity_report} />
              <AnswerPanel
                answer={queryResult.answer}
                model={queryResult.model_used}
                retrievalMs={queryResult.retrieval_time_ms}
                generationMs={queryResult.generation_time_ms}
              />
            </>
          )}
        </section>
      )}

      {/* Evaluation */}
      {uploadResult && (
        <section>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Evaluation Layer</h2>
            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50 text-sm"
            >
              {evaluating ? "Running 10 questions..." : "Run Evaluation"}
            </button>
          </div>
          {evalError && <p className="text-red-600 mt-2">{evalError}</p>}
          {evalResult && <div className="mt-4"><EvaluationTable data={evalResult} /></div>}
        </section>
      )}
    </main>
  )
}
