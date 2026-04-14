"use client"
import { useState } from "react"

export function QueryInput({ onSubmit, disabled }: { onSubmit: (q: string) => void; disabled: boolean }) {
  const [value, setValue] = useState("")
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Ask a question about the contract..."
        disabled={disabled}
        className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Ask
      </button>
    </form>
  )
}
