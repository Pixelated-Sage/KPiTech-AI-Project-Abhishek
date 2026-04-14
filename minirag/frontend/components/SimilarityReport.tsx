import { SimilarityRow } from "@/lib/api"

const COLORS: Record<string, string> = {
  Strong: "bg-green-100 text-green-800",
  Good: "bg-yellow-100 text-yellow-800",
  Weak: "bg-orange-100 text-orange-800",
  Poor: "bg-red-100 text-red-800",
}

export function SimilarityReport({ rows }: { rows: SimilarityRow[] }) {
  return (
    <div className="overflow-x-auto">
      <h3 className="font-semibold text-lg mb-2">Similarity Report</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left border">Rank</th>
            <th className="p-2 text-left border">Location</th>
            <th className="p-2 text-left border">Score</th>
            <th className="p-2 text-left border">Signal</th>
            <th className="p-2 text-left border">Preview</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.rank} className={COLORS[r.score_signal]}>
              <td className="p-2 border font-mono">{r.rank}</td>
              <td className="p-2 border whitespace-nowrap">{r.location}</td>
              <td className="p-2 border font-mono font-bold">{r.similarity_score.toFixed(2)}</td>
              <td className="p-2 border font-semibold">{r.score_signal}</td>
              <td className="p-2 border max-w-xs truncate text-xs">{r.chunk_preview}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
