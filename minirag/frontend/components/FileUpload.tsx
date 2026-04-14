"use client"
import { useState } from "react"
import { api, UploadResult } from "@/lib/api"

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
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <p className="text-gray-600 mb-4">Upload MSA Contract (PDF)</p>
      <input type="file" accept=".pdf" onChange={handleChange} disabled={loading} className="block mx-auto" />
      {loading && <p className="mt-3 text-blue-600">Processing document...</p>}
      {error && <p className="mt-3 text-red-600">{error}</p>}
    </div>
  )
}
