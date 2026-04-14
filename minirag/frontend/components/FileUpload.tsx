"use client"
import { useState } from "react"
import { api, UploadResult } from "@/lib/api"
import { UploadCloud } from "lucide-react"

export function FileUpload({ onDone }: { onDone: (r: UploadResult) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".pdf")) { setError("Only PDF files accepted"); return }
    setLoading(true); setError(null)
    try {
      const result = await api.upload(file)
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally { setLoading(false) }
  }

  return (
    <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-8 text-center bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer overflow-hidden">
      <input 
        type="file" 
        accept=".pdf" 
        onChange={handleChange} 
        disabled={loading} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
      />
      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
         <div className="p-3 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
           <UploadCloud className="w-8 h-8 text-blue-400" />
         </div>
         <p className="text-white/80 font-medium">Click or drag PDF here to upload</p>
         <p className="text-white/40 text-xs">Supports CV or MSA Contract PDFs</p>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-panel/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
           <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
           <p className="text-blue-400 text-sm font-medium animate-pulse">Processing document...</p>
        </div>
      )}
      
      {error && <p className="absolute bottom-2 left-0 right-0 text-red-400 text-xs text-center">{error}</p>}
    </div>
  )
}
