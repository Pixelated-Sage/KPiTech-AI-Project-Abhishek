export function AnswerPanel({ answer, model, retrievalMs, generationMs }: {
  answer: string; model: string; retrievalMs: number; generationMs: number
}) {
  return (
    <div className="border rounded-lg p-4 bg-blue-50">
      <h3 className="font-semibold text-lg mb-2">Answer</h3>
      <p className="text-gray-800 whitespace-pre-wrap">{answer}</p>
      <p className="text-xs text-gray-400 mt-3">
        Model: {model} · Retrieval: {retrievalMs}ms · Generation: {generationMs}ms
      </p>
    </div>
  )
}
