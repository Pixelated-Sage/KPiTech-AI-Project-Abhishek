import { SimilarityRow } from "@/lib/api"

const SIGNAL_STYLE: Record<string, { bar: string; badge: string; dot: string }> = {
  Strong: { bar: "bg-emerald-500", badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500" },
  Good:   { bar: "bg-blue-500",    badge: "text-blue-400   bg-blue-500/10   border-blue-500/20",   dot: "bg-blue-500"   },
  Weak:   { bar: "bg-amber-500",   badge: "text-amber-400  bg-amber-500/10  border-amber-500/20",  dot: "bg-amber-500"  },
  Poor:   { bar: "bg-red-500",     badge: "text-red-400    bg-red-500/10    border-red-500/20",    dot: "bg-red-500"    },
}

export function SimilarityReport({ rows }: { rows: SimilarityRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const s = SIGNAL_STYLE[r.score_signal] ?? SIGNAL_STYLE.Poor
        const pct = Math.round(r.similarity_score * 100)
        return (
          <div
            key={r.rank}
            className="flex flex-col gap-2 rounded-xl border p-3"
            style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            {/* Row top */}
            <div className="flex items-center gap-2.5">
              {/* Rank bubble */}
              <span className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-mono text-white/40 shrink-0">
                {r.rank}
              </span>

              {/* Location */}
              <span className="text-xs text-white/60 font-medium truncate flex-1">{r.location}</span>

              {/* Signal badge */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${s.badge}`}>
                {r.score_signal}
              </span>

              {/* Score */}
              <span className="text-xs font-mono text-white/70 shrink-0">{r.similarity_score.toFixed(3)}</span>
            </div>

            {/* Score bar */}
            <div className="h-1 w-full rounded-full bg-white/5">
              <div
                className={`h-1 rounded-full transition-all ${s.bar}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>

            {/* Preview */}
            {r.chunk_preview && (
              <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">{r.chunk_preview}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
