import { SimilarityRow } from "@/lib/api"

const COLORS: Record<string, string> = {
  Strong: "border-green-500/20 bg-green-500/5 text-green-400",
  Good: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
  Weak: "border-orange-500/20 bg-orange-500/5 text-orange-400",
  Poor: "border-red-500/20 bg-red-500/5 text-red-500",
}

export function SimilarityReport({ rows }: { rows: SimilarityRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20">
      <table className="w-full text-sm border-collapse text-left">
        <thead>
          <tr className="bg-white/5 border-b border-white/5">
            <th className="p-2.5 font-medium text-white/50 border-r border-white/5">Rank</th>
            <th className="p-2.5 font-medium text-white/50 border-r border-white/5">Location</th>
            <th className="p-2.5 font-medium text-white/50 border-r border-white/5">Score</th>
            <th className="p-2.5 font-medium text-white/50 border-r border-white/5">Signal</th>
            <th className="p-2.5 font-medium text-white/50">Preview</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.rank} className={`${i !== rows.length - 1 ? 'border-b border-white/5' : ''}`}>
              <td className="p-2.5 border-r border-white/5 font-mono text-white/30">{r.rank}</td>
              <td className="p-2.5 border-r border-white/5 whitespace-nowrap text-white/70">{r.location}</td>
              <td className="p-2.5 border-r border-white/5 font-mono text-white/90">{r.similarity_score.toFixed(2)}</td>
              <td className="p-2.5 border-r border-white/5">
                 <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${COLORS[r.score_signal]}`}>
                    {r.score_signal}
                 </span>
              </td>
              <td className="p-2.5 max-w-[200px] truncate text-[11px] text-white/40">{r.chunk_preview}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
