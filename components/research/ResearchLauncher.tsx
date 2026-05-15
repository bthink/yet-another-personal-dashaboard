"use client"

import { useState, type FormEvent, type KeyboardEvent } from "react"

type Props = {
  onJobStarted: (jobId: string) => void
}

export default function ResearchLauncher({ onJobStarted }: Props) {
  const [query, setQuery] = useState("")
  const [urls, setUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState("")
  const [targetFolder, setTargetFolder] = useState("03_Knowledge/IT/")
  const [editingFolder, setEditingFolder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
      setUrls((prev) => [...prev, trimmed])
      setUrlInput("")
    } catch {
      setError("Nieprawidłowy URL")
    }
  }

  function removeUrl(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url))
  }

  function handleUrlKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addUrl()
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), urls, targetFolder }),
      })
      const data = (await res.json()) as { jobId?: string; error?: string }
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Start failed")
      onJobStarted(data.jobId)
      setQuery("")
      setUrls([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd startu")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
        }}
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="wpisz temat lub pytanie badawcze..."
          rows={2}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "vertical",
            fontSize: "13px",
            color: "var(--text)",
            fontFamily: "inherit",
            marginBottom: urls.length > 0 ? "10px" : "0",
          }}
        />

        {urls.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
            {urls.map((url) => (
              <span
                key={url}
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontSize: "10px",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  padding: "2px 7px",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {new URL(url).hostname}
                <button
                  type="button"
                  onClick={() => removeUrl(url)}
                  aria-label={`Usuń ${url}`}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://... (Enter żeby dodać)"
            style={{
              flex: 1,
              background: "transparent",
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius)",
              padding: "3px 10px",
              fontSize: "11px",
              color: "var(--text-2)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={addUrl}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "3px 10px",
              fontSize: "11px",
              color: "var(--text-3)",
              cursor: "pointer",
            }}
          >
            + URL
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "11px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "4px" }}>
          Cel:{" "}
          {editingFolder ? (
            <input
              autoFocus
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              onBlur={() => setEditingFolder(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingFolder(false)}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "1px 6px",
                fontSize: "11px",
                fontFamily: "var(--font-geist-mono, monospace)",
                color: "var(--accent)",
                width: "200px",
                outline: "none",
              }}
            />
          ) : (
            <>
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "10px",
                  background: "var(--accent-soft)",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                {targetFolder}
              </span>
              <button
                type="button"
                onClick={() => setEditingFolder(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: "10px", padding: 0 }}
              >
                zmień
              </button>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius)",
            padding: "6px 18px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: loading || !query.trim() ? "not-allowed" : "pointer",
            opacity: loading || !query.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Startuję..." : "Zbadaj →"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: "11px", color: "var(--red)", margin: 0 }}>{error}</p>
      )}
    </form>
  )
}
