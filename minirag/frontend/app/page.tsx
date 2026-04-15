"use client"
import { useState, useRef, useEffect } from "react"
import { FileUpload } from "@/components/FileUpload"
import { EvaluationTable } from "@/components/EvaluationTable"
import { api, UploadResult, QueryResult, EvalResult } from "@/lib/api"
import { Paperclip, Globe, Smile, MoreHorizontal, Send, X, Bot, Activity, CheckCircle2, ChevronRight, Menu } from "lucide-react"
import { SimilarityReport } from "@/components/SimilarityReport"

type Message = {
  id: string;
  role: "agent" | "user";
  content: string;
  queryResult?: QueryResult;
}

const SUGGESTIONS = [
  "What are",
  "Tell me about his projects",
  "How can I contact him?"
]

export default function Home() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [querying, setQuerying] = useState(false)
  const [showEval, setShowEval] = useState(false)
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, querying])

  async function handleQuery(question: string) {
    if (!question.trim() || querying) return
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: question }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setQuerying(true)
    
    try {
      const res = await api.query(question)
      const agentMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "agent", 
        content: res.answer,
        queryResult: res
      }
      setMessages(prev => [...prev, agentMsg])
    } catch (e) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "Sorry, I encountered an error: " + (e instanceof Error ? e.message : "Unknown error")
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setQuerying(false)
    }
  }

  async function runEval() {
    setEvaluating(true)
    try {
      setEvalResult(await api.evaluate())
      setShowEval(true)
    } catch (e) {
      alert("Evaluation failed")
    } finally {
      setEvaluating(false)
    }
  }

  // Initial Upload Screen
  if (!uploadResult) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-foreground">
        <div className="w-full max-w-md space-y-8 bg-panel border-white/5 border rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center relative">
              <Bot className="w-8 h-8 text-white" />
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#15181c]" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to MiniRAG</h1>
            <p className="text-white/60">Upload the candidate's CV to begin chatting.</p>
          </div>
          <FileUpload onDone={setUploadResult} />
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen flex items-center justify-center text-foreground p-0 md:p-6">
      <div className="w-full h-full md:h-[90vh] md:max-w-2xl bg-background md:border border-white/10 md:rounded-[2.5rem] flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <span className="font-medium text-lg tracking-wide">MiniRAG.ai</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runEval} title="Run Evaluation" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              {evaluating ? <Activity className="w-4 h-4 animate-spin text-purple-400" /> : <Activity className="w-4 h-4 text-white/70" />}
            </button>
            <button onClick={() => { setUploadResult(null); setMessages([]); setShowEval(false) }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center relative mb-6">
                <Bot className="w-10 h-10 text-white" />
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-background" />
              </div>
              <h2 className="text-4xl font-semibold tracking-tight mb-3">Hello 👋</h2>
              <p className="text-white/50 text-lg">MiniRAG is here to answer questions about the document.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={msg.id} className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                  {msg.role === "agent" ? (
                    <div className="bg-agent border border-white/5 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-[95%]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-white/70" />
                          <span className="font-medium text-sm text-white/90">MiniRAG.ai</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a2332]/50 text-blue-400 rounded-full border border-blue-500/20 text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          AI Agent
                        </div>
                      </div>
                      <div className="text-white/80 leading-relaxed whitespace-pre-wrap text-[15px]">
                        {msg.content}
                      </div>
                      
                      {msg.queryResult && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <details className="group cursor-pointer">
                            <summary className="flex items-center gap-2 text-xs font-medium text-white/50 hover:text-white/70 transition-colors list-none">
                              <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                              View Retrieval Logs & Details
                            </summary>
                            <div className="mt-3 pt-2">
                               <div className="text-xs text-white/40 mb-3 space-y-1">
                                  <p>Model: {msg.queryResult.model_used}</p>
                                  <p>Retrieval: {msg.queryResult.retrieval_time_ms}ms | Generation: {msg.queryResult.generation_time_ms}ms</p>
                               </div>
                               <SimilarityReport rows={msg.queryResult.similarity_report} />
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-user rounded-2xl rounded-tr-sm p-4 w-fit max-w-[85%] ml-auto shadow-sm border border-blue-500/10">
                       <p className="text-white/90 text-[15px]">{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {querying && (
                <div className="bg-agent border border-white/5 rounded-2xl rounded-tl-sm p-5 shadow-sm w-fit animate-pulse">
                   <div className="flex gap-1 items-center h-4">
                     <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-75"></div>
                     <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-150"></div>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-4 pb-6 pt-2 bg-background z-10 w-full relative">
          
          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hidden">
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleQuery(sug)}
                  className="whitespace-nowrap px-4 py-3 bg-white/5 hover:bg-white/10 active:scale-95 transition-all outline-none rounded-xl text-white/70 text-sm font-medium border border-white/5 shrink-0"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Form container */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleQuery(input) }} 
            className="flex flex-col bg-[#15181c] border border-white/10 rounded-2xl transition-all focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/20 shadow-lg"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={querying}
              className="w-full bg-transparent text-white placeholder-white/30 px-5 py-4 outline-none text-[15px]"
            />
            
            <div className="flex items-center justify-between px-3 pb-3">
               <div className="flex items-center gap-1">
                 <button type="button" className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"><Paperclip className="w-4 h-4" /></button>
                 <button type="button" className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"><Globe className="w-4 h-4" /></button>
                 <button type="button" className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"><Smile className="w-4 h-4" /></button>
                 <button type="button" className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"><MoreHorizontal className="w-4 h-4" /></button>
               </div>
               <button 
                 type="submit" 
                 disabled={!input.trim() || querying}
                 className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white transition-colors active:scale-95"
               >
                 <Send className="w-4 h-4 mr-0.5 mt-0.5" />
               </button>
            </div>
          </form>
        </div>

        {/* Evaluation Modal/Drawer Overlay */}
        {showEval && evalResult && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6 mt-4">
              <h2 className="text-2xl font-bold">Evaluation Results</h2>
              <button onClick={() => setShowEval(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X className="w-5 h-5"/></button>
            </div>
            <EvaluationTable data={evalResult} />
          </div>
        )}

      </div>

      <style jsx global>{`
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  )
}
