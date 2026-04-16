"use client"
import { useState } from "react"
import { api, UploadResult } from "@/lib/api"
import { FileText, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react"

export function FileUpload({ onDone }: { onDone: (r: UploadResult) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function processFile(file: File) {
    // Validation: must be PDF
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted. Please select a .pdf file.")
      return
    }
    // Validation: file must not be empty
    if (file.size === 0) {
      setError("The selected file is empty (0 bytes). Please upload a valid PDF document.")
      return
    }
    // Validation: max 50MB
    const MAX_SIZE_MB = 50
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await api.upload(file)
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset so same file can be re-uploaded
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const inputId = "file-upload-input"

  return (
    <div className="w-full">
      {/* The <label> is the key fix — natively opens file picker on ALL browsers including iOS Safari */}
      <label
        htmlFor={inputId}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative flex flex-col items-center justify-center gap-5
          rounded-2xl border-2 border-dashed p-10 text-center
          cursor-pointer select-none transition-all duration-300
          ${loading ? "pointer-events-none cursor-not-allowed" : ""}
          ${dragOver
            ? "border-blue-400 bg-blue-500/10 scale-[1.01]"
            : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/6"
          }
        `}
        style={{
          background: dragOver
            ? "radial-gradient(ellipse at center, rgba(59,130,246,0.07) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 80%)"
        }}
      >
        <input
          id={inputId}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          disabled={loading}
          className="sr-only"
        />

        {/* Icon ring */}
        <div className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300
          ${dragOver ? "scale-110" : ""}
        `}
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.04) 60%, transparent 100%)" }}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-pulse" />
          <UploadCloud className={`w-9 h-9 transition-colors duration-300 ${dragOver ? "text-blue-400" : "text-blue-500/70"}`} />
        </div>

        <div className="space-y-1.5">
          <p className="text-white/85 font-semibold text-base">
            {dragOver ? "Drop your PDF here" : "Click to upload PDF"}
          </p>
          <p className="text-white/35 text-sm">
            or drag and drop · MSA &amp; CV contracts
          </p>
        </div>

        {/* Format badges */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs">
            <FileText className="w-3 h-3" /> PDF only
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs">
            Max 50MB
          </span>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(13,14,17,0.92)", backdropFilter: "blur(8px)" }}>
            {/* Spinner */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-blue-400 font-semibold text-sm">Processing document…</p>
              <p className="text-white/30 text-xs">Extracting &amp; indexing chunks</p>
            </div>
          </div>
        )}
      </label>

      {/* Error message */}
      {error && (
        <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm leading-snug">{error}</p>
        </div>
      )}
    </div>
  )
}
