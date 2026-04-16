"use client"
import { useState, useRef, useEffect } from "react"
import { FileUpload } from "@/components/FileUpload"
import { EvaluationTable } from "@/components/EvaluationTable"
import { api, UploadResult, QueryResult, EvalResult } from "@/lib/api"
import {
  Globe, Smile, MoreHorizontal, Send, X, Bot, Activity,
  CheckCircle2, ChevronRight, FileText, Layers, Cpu,
  Trash2, BarChart2, Upload, Zap, Clock
} from "lucide-react"
import { SimilarityReport } from "@/components/SimilarityReport"

/* ─── Constants ─────────────────────────────────── */
const EMOJIS = [
  '😊','👍','🙏','❓','📄','✅','⚠️','🔍','💡','📌',
  '🎯','🤔','👀','💬','📝','🚀','⏳','🔒','💰','🗓️',
]

const MAX_CHARS = 200
const MIN_CHARS = 2

const SUGGESTIONS = [
  "When is an invoice due after it is issued?",
  "Is there a penalty for late payment, and what is the rate?",
  "What is the penalty for the provider missing a delivery milestone?",
]

const GREETING_PATTERNS = /^(hi|hello|hey|howdy|hiya|sup|what'?s up|good\s?(morning|afternoon|evening|day)|namaste|helo|hii+|heyyy*|yo|greetings|salut|bonjour|ola|hola|ciao)\b/i

const GREETING_REPLIES = [
  "Hello! 👋 I'm MiniRAG, your AI assistant for this document. Feel free to ask me anything about its contents!",
  "Hey there! 😊 I'm here to help you explore this document. What would you like to know?",
  "Hi! Great to meet you. I'm MiniRAG — ask me anything about the contract or document you uploaded!",
  "Hello! I'm ready to assist. Go ahead and ask me a question about the document. 📄",
  "Hey! 👋 How can I help you today? I can answer questions about the document you've uploaded.",
]

/* ─── Types ──────────────────────────────────────── */
type Message = {
  id: string
  role: "agent" | "user"
  content: string
  queryResult?: QueryResult
  isGreeting?: boolean
}

/* ─── Shared panel style ─────────────────────────── */
const PANEL_STYLE = {
  background: "rgba(17,19,24,0.98)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
}

/* ─── Upload Screen ──────────────────────────────── */
function UploadScreen({ onDone }: { onDone: (r: UploadResult) => void }) {
  return (
    <main style={{ minHeight: "100dvh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", position: "relative", overflow: "hidden" }}
      className="bg-grid">
      {/* Orbs — fixed so they're out of flex flow and always fill the viewport edge */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: 520, height: 520, borderRadius: "9999px", filter: "blur(90px)", pointerEvents: "none", opacity: 0.18, background: "radial-gradient(circle, #3b82f6, transparent 65%)", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-8%",  width: 440, height: 440, borderRadius: "9999px", filter: "blur(90px)", pointerEvents: "none", opacity: 0.14, background: "radial-gradient(circle, #6366f1, transparent 65%)", zIndex: 0 }} />

      <div className="relative w-full max-w-[420px] rounded-3xl p-8 space-y-7 shadow-2xl"
        style={{ ...PANEL_STYLE, zIndex: 1 }}>

        {/* Logo */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.1))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Bot className="w-9 h-9 text-white" />
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2" style={{ borderColor: "#0a0b0e" }} />
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, #ffffff 30%, rgba(255,255,255,0.5) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MiniRAG
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Upload your MSA or contract PDF to start asking questions
          </p>
        </div>

        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }} />

        <FileUpload onDone={onDone} />

        <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>
          Processed in-memory · never stored persistently
        </p>
      </div>
    </main>
  )
}

/* ─── Main Page ──────────────────────────────────── */
export default function Home() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)
  const [querying, setQuerying] = useState(false)
  const [showEval, setShowEval] = useState(false)
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  // Icon panels
  const [showDocInfo, setShowDocInfo] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, querying])

  // Close panels on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowDocInfo(false); setShowEmoji(false); setShowMore(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 140) + "px"
  }, [input])

  function validateInput(text: string): string | null {
    const t = text.trim()
    if (!t) return "Please type a message before sending."
    if (t.length < MIN_CHARS) return "Message is too short. Please be more specific."
    if (text.length > MAX_CHARS) return `Message exceeds ${MAX_CHARS} characters.`
    return null
  }

  async function handleQuery(question: string) {
    const err = validateInput(question)
    if (err) { setInputError(err); return }
    if (querying) return
    setInputError(null)

    const trimmed = question.trim()
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput("")

    if (GREETING_PATTERNS.test(trimmed)) {
      const reply = GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)]
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "agent", content: reply, isGreeting: true }])
      return
    }

    setQuerying(true)
    try {
      const res = await api.query(trimmed)
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "agent", content: res.answer, queryResult: res }])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "agent",
        content: "Sorry, I encountered an error: " + (e instanceof Error ? e.message : "Unknown error")
      }])
    } finally {
      setQuerying(false)
    }
  }

  async function runEval() {
    setEvaluating(true)
    try {
      setEvalResult(await api.evaluate())
      setShowEval(true)
    } catch { alert("Evaluation failed") }
    finally { setEvaluating(false) }
  }

  if (!uploadResult) return <UploadScreen onDone={setUploadResult} />

  return (
    <main className="h-dvh flex items-center justify-center text-foreground p-0 md:p-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Card container */}
      <div className="w-full h-full md:h-[92vh] md:max-w-2xl flex flex-col relative shadow-2xl md:rounded-4xl"
        style={{ background: "#0d0f14", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "2rem" }}>

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-5 py-3.5 z-10 shrink-0"
          style={{ background: "rgba(13,15,20,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.15))", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Bot className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2"
                style={{ borderColor: "#0d0f14" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">MiniRAG.ai</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {uploadResult.total_chunks} chunks · {uploadResult.total_pages} pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={runEval}
              title="Run Evaluation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: evaluating ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)", color: evaluating ? "#a78bfa" : "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Activity className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
              {evaluating ? "Running…" : "Evaluate"}
            </button>
            <button
              onClick={() => { setUploadResult(null); setMessages([]); setShowEval(false) }}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Chat ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.1))", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Bot className="w-8 h-8 text-white/80" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2" style={{ borderColor: "#0d0f14" }} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Hello 👋</h2>
              <p style={{ color: "rgba(255,255,255,0.45)" }} className="text-base">
                Ask me anything about your document.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-in slide-in-from-bottom-1 fade-in duration-200">
                  {msg.role === "agent" ? (
                    /* ── Agent bubble ── */
                    <div className="max-w-[95%] rounded-2xl rounded-tl-sm overflow-hidden"
                      style={{ background: "#161920", border: "1px solid rgba(255,255,255,0.06)" }}>

                      {/* Agent header */}
                      <div className="flex items-center justify-between px-4 pt-3.5 pb-2"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
                          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>MiniRAG</span>
                        </div>
                        {!msg.isGreeting && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                            <CheckCircle2 className="w-2.5 h-2.5" /> AI Agent
                          </span>
                        )}
                      </div>

                      {/* Answer */}
                      <div className="px-4 py-3.5 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
                        {msg.content}
                      </div>

                      {/* Retrieval details */}
                      {msg.queryResult && (
                        <details className="group" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer list-none select-none text-xs font-medium transition-colors hover:bg-white/3"
                            style={{ color: "rgba(255,255,255,0.35)" }}>
                            <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                            Retrieval Details
                            <span className="ml-auto flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400" />
                                {msg.queryResult.retrieval_time_ms}ms
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />
                                {msg.queryResult.generation_time_ms}ms
                              </span>
                            </span>
                          </summary>
                          <div className="px-4 pb-4 pt-2">
                            <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                              Model: {msg.queryResult.model_used}
                            </p>
                            <SimilarityReport rows={msg.queryResult.similarity_report} />
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    /* ── User bubble ── */
                    <div className="ml-auto w-fit max-w-[82%] rounded-2xl rounded-tr-sm px-4 py-3"
                      style={{ background: "#1a2236", border: "1px solid rgba(59,130,246,0.12)" }}>
                      <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking dots */}
              {querying && (
                <div className="animate-in fade-in duration-200">
                  <div className="w-fit rounded-2xl rounded-tl-sm px-5 py-4"
                    style={{ background: "#161920", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex gap-1.5 items-center">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-2 h-2 rounded-full animate-bounce"
                          style={{ background: "rgba(255,255,255,0.35)", animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="px-4 pt-2 shrink-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))", background: "rgba(13,15,20,0.95)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hidden">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleQuery(s)}
                  className="whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-medium shrink-0 transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={e => { e.preventDefault(); handleQuery(input) }}
            className="transition-all"
            style={{
              background: "#161920",
              borderRadius: "1rem",
              border: inputError
                ? "1px solid rgba(239,68,68,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: inputError ? "0 0 0 2px rgba(239,68,68,0.1)" : "none"
            }}>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                if (e.target.value.length <= MAX_CHARS) setInput(e.target.value)
                if (inputError) setInputError(null)
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuery(input) }
              }}
              placeholder="Ask about the document…"
              disabled={querying}
              rows={1}
              className="w-full bg-transparent px-4 py-3.5 outline-none text-[15px] resize-none leading-relaxed"
              style={{ color: "rgba(255,255,255,0.88)", minHeight: 52, maxHeight: 140, borderRadius: "1rem 1rem 0 0" }}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pb-3" ref={toolbarRef}>
              <div className="flex items-center gap-0.5 relative">

                {/* Globe: Doc Info */}
                <div className="relative">
                  <button type="button" title="Document Info"
                    onClick={() => { setShowDocInfo(p => !p); setShowEmoji(false); setShowMore(false) }}
                    className="p-2 rounded-full transition-colors"
                    style={{ color: showDocInfo ? "#3b82f6" : "rgba(255,255,255,0.35)", background: showDocInfo ? "rgba(59,130,246,0.12)" : "transparent" }}>
                    <Globe className="w-4 h-4" />
                  </button>
                  {showDocInfo && (
                    <div className="absolute bottom-11 left-0 w-64 rounded-2xl shadow-2xl z-60 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
                      style={PANEL_STYLE}>
                      <p className="px-4 py-2.5 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Document Info</p>
                      <div className="px-4 py-3 space-y-2.5">
                        {[
                          { icon: FileText, color: "#3b82f6", label: "Pages", val: uploadResult!.total_pages },
                          { icon: Layers,   color: "#8b5cf6", label: "Chunks", val: uploadResult!.total_chunks },
                          { icon: Cpu,      color: "#a78bfa", label: "Model", val: uploadResult!.embedding_model },
                        ].map(({ icon: Icon, color, label, val }) => (
                          <div key={label} className="flex items-center gap-2.5 text-xs">
                            <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                            <span className="ml-auto font-medium truncate max-w-[130px]" style={{ color: "rgba(255,255,255,0.75)" }} title={String(val)}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Smile: Emoji */}
                <div className="relative">
                  <button type="button" title="Emoji"
                    onClick={() => { setShowEmoji(p => !p); setShowDocInfo(false); setShowMore(false) }}
                    className="p-2 rounded-full transition-colors"
                    style={{ color: showEmoji ? "#facc15" : "rgba(255,255,255,0.35)", background: showEmoji ? "rgba(250,204,21,0.1)" : "transparent" }}>
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmoji && (
                    <div className="absolute bottom-11 left-0 w-52 rounded-2xl shadow-2xl z-60 p-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
                      style={PANEL_STYLE}>
                      <p className="text-[10px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.3)" }}>Quick insert</p>
                      <div className="grid grid-cols-5 gap-1">
                        {EMOJIS.map(e => (
                          <button key={e} type="button"
                            onClick={() => { if (input.length < MAX_CHARS) { setInput(p => p + e); setShowEmoji(false) } }}
                            className="text-xl w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-90 hover:bg-white/10">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* More: menu */}
                <div className="relative">
                  <button type="button" title="More options"
                    onClick={() => { setShowMore(p => !p); setShowDocInfo(false); setShowEmoji(false) }}
                    className="p-2 rounded-full transition-colors"
                    style={{ color: showMore ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)", background: showMore ? "rgba(255,255,255,0.1)" : "transparent" }}>
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showMore && (
                    <div className="absolute bottom-11 left-0 w-52 rounded-2xl shadow-2xl z-60 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
                      style={PANEL_STYLE}>
                      {[
                        { icon: Trash2,    color: "#f87171", label: "Clear Chat",     onClick: () => { setMessages([]); setShowMore(false) } },
                        { icon: BarChart2, color: "#a78bfa", label: evaluating ? "Running…" : "Run Evaluation", onClick: () => { runEval(); setShowMore(false) }, disabled: evaluating },
                      ].map(({ icon: Icon, color, label, onClick, disabled }) => (
                        <button key={label} type="button" onClick={onClick} disabled={disabled}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors disabled:opacity-40"
                          style={{ color: "rgba(255,255,255,0.65)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                          {label}
                        </button>
                      ))}
                      <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                      <button type="button"
                        onClick={() => { setUploadResult(null); setMessages([]); setShowEval(false); setShowMore(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                        style={{ color: "rgba(255,255,255,0.65)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <Upload className="w-4 h-4 shrink-0" style={{ color: "#60a5fa" }} />
                        New Document
                      </button>
                    </div>
                  )}
                </div>

                {/* Char counter */}
                <span className="text-[11px] font-mono tabular-nums ml-1 transition-colors"
                  style={{ color: input.length >= MAX_CHARS ? "#f87171" : input.length >= MAX_CHARS - 30 ? "#fbbf24" : "rgba(255,255,255,0.18)" }}>
                  {input.length > 0 ? `${input.length}/${MAX_CHARS}` : ""}
                </span>
              </div>

              {/* Send */}
              <button type="submit"
                disabled={querying || input.length > MAX_CHARS}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff" }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Hint / error */}
          {inputError ? (
            <p className="text-[11px] mt-1.5 px-1 flex items-center gap-1" style={{ color: "#f87171" }}>
              ⚠ {inputError}
            </p>
          ) : (
            <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
              Enter to send · Shift+Enter for new line
            </p>
          )}
        </div>

        {/* ── Eval Modal ── */}
        {showEval && evalResult && (
          <div className="absolute inset-0 z-50 flex flex-col"
            style={{ background: "rgba(10,11,14,0.97)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <h2 className="text-lg font-bold text-white">Evaluation Results</h2>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  RAG system vs. ground truth
                </p>
              </div>
              <button onClick={() => setShowEval(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.5)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <EvaluationTable data={evalResult} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
