import { EvalResult } from "@/lib/api"

const J_COLOR: Record<string, string> = {
  Match: "text-green-400 border-green-500/20 bg-green-500/10",
  "Partial Match": "text-yellow-400 border-yellow-500/20 bg-yellow-500/10",
  "No Match": "text-red-400 border-red-500/20 bg-red-500/10",
}

export function EvaluationTable({ data }: { data: EvalResult }) {
  const { summary, results } = data
  return (
    <div className="space-y-4">
      <div className="flex gap-4 sm:gap-8 p-4 bg-white/5 border border-white/10 rounded-xl text-sm font-medium">
        <span className="text-green-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> {summary.match} Match</span>
        <span className="text-yellow-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> {summary.partial_match} Partial</span>
        <span className="text-red-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> {summary.no_match} Miss</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-white/40">Accuracy:</span>
          <span className="text-white text-base">{summary.accuracy_percent}%</span>
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#15181c]">
        <table className="w-full text-sm border-collapse text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="p-3 font-medium text-white/50 border-r border-white/5">#</th>
              <th className="p-3 font-medium text-white/50 border-r border-white/5">Category</th>
              <th className="p-3 font-medium text-white/50 border-r border-white/5">Judgement</th>
              <th className="p-3 font-medium text-white/50">Reason</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.id} className={`${i !== results.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                <td className="p-3 border-r border-white/5 font-mono text-white/30">{r.id}</td>
                <td className="p-3 border-r border-white/5 text-white/80">{r.category}</td>
                <td className="p-3 border-r border-white/5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${J_COLOR[r.judgement]}`}>
                    {r.judgement}
                  </span>
                </td>
                <td className="p-3 text-xs text-white/50 leading-relaxed">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
