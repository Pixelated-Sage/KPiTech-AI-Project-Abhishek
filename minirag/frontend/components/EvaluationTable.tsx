"use client"
import { useState } from "react"
import { EvalResult, EvalRow } from "@/lib/api"
import { ChevronDown, CheckCircle2, AlertCircle, XCircle, TrendingUp } from "lucide-react"

const VERDICT: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  "Match":         { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "Partial Match": { icon: AlertCircle,  color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
  "No Match":      { icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20"     },
}

function EvalCard({ row }: { row: EvalRow }) {
  const [open, setOpen] = useState(false)
  const v = VERDICT[row.judgement] ?? VERDICT["Partial Match"]
  const Icon = v.icon
  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${v.border}`}
      style={{ background: "rgba(255,255,255,0.025)" }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <Icon className={`w-4 h-4 shrink-0 ${v.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/85 truncate">{row.question}</p>
          <p className="text-[11px] text-white/35 mt-0.5">{row.category}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${v.color} ${v.bg} ${v.border}`}>
          {row.judgement}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <div className="pt-3 grid gap-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-semibold">Expected Answer</p>
              <p className="text-sm text-white/70 leading-relaxed">{row.expected_answer}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-semibold">AI Response</p>
              <p className="text-sm text-white/70 leading-relaxed">{row.system_answer}</p>
            </div>
            {row.reason && (
              <div className={`rounded-xl p-3 ${v.bg} border ${v.border}`}>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-semibold">Judge Reason</p>
                <p className={`text-sm leading-relaxed ${v.color}`}>{row.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function EvaluationTable({ data }: { data: EvalResult }) {
  const { summary, results } = data
  const pct = summary.accuracy_percent
  const circumference = 2 * Math.PI * 36

  return (
    <div className="space-y-6">
      {/* Summary ring + stats */}
      <div className="flex items-center gap-6 p-5 rounded-2xl border border-white/8"
        style={{ background: "rgba(255,255,255,0.03)" }}>

        {/* Donut */}
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              stroke={pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444"}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white leading-none">{pct}%</span>
          </div>
        </div>

        {/* Counts */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-white/30" />
            <span className="text-sm font-semibold text-white/80">Accuracy</span>
            <span className="ml-auto text-sm font-bold" style={{ color: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }}>{pct}%</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {summary.match} Match
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {summary.partial_match} Partial
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {summary.no_match} Miss
            </span>
          </div>
        </div>
      </div>

      {/* Result cards */}
      <div className="space-y-2">
        {results.map(r => <EvalCard key={r.id} row={r} />)}
      </div>
    </div>
  )
}
