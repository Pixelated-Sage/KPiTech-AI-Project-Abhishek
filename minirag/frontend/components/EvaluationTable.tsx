import { EvalResult } from "@/lib/api"

const J_COLOR: Record<string, string> = {
  Match: "text-green-700 font-bold",
  "Partial Match": "text-yellow-700 font-bold",
  "No Match": "text-red-700 font-bold",
}

export function EvaluationTable({ data }: { data: EvalResult }) {
  const { summary, results } = data
  return (
    <div>
      <div className="flex gap-6 p-3 bg-gray-50 rounded mb-3 text-sm font-medium">
        <span className="text-green-700">✓ {summary.match} Match</span>
        <span className="text-yellow-700">~ {summary.partial_match} Partial</span>
        <span className="text-red-700">✗ {summary.no_match} No Match</span>
        <span className="ml-auto font-bold">Accuracy: {summary.accuracy_percent}%</span>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border text-left">#</th>
            <th className="p-2 border text-left">Category</th>
            <th className="p-2 border text-left">Judgement</th>
            <th className="p-2 border text-left">Reason</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2 border">{r.id}</td>
              <td className="p-2 border">{r.category}</td>
              <td className={`p-2 border ${J_COLOR[r.judgement]}`}>{r.judgement}</td>
              <td className="p-2 border text-xs text-gray-600">{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
