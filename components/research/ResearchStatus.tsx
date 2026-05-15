"use client"

import { useState, useEffect, useRef } from "react"

type StatusResponse = {
  status: "running" | "done" | "error"
  phaseLabel?: string
  notePath?: string
  noteTitle?: string
  error?: string
}

type CompletedEntry = {
  noteTitle: string
  notePath: string
  completedAt: string
}

type Props = {
  jobId: string | null
}

const LAST_COMPLETED_KEY = "research-last-completed"

function openInObsidian(notePath: string) {
  const vaultName = "Bf-vault"
  const fileParam = encodeURIComponent(notePath.replace(/\.md$/, ""))
  window.open(`obsidian://open?vault=${vaultName}&file=${fileParam}`, "_blank")
}

export default function ResearchStatus({ jobId }: Props) {
  const [running, setRunning] = useState<{ phaseLabel: string } | null>(null)
  const [toast, setToast] = useState<{ noteTitle: string; notePath: string } | null>(null)
  const [lastCompleted, setLastCompleted] = useState<CompletedEntry | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_COMPLETED_KEY)
      if (stored) setLastCompleted(JSON.parse(stored) as CompletedEntry)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!jobId) return

    setRunning({ phaseLabel: "startuje..." })

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/research/status/${jobId}`)

        if (res.status === 404) {
          setRunning(null)
          clearInterval(intervalRef.current!)
          return
        }

        const data = (await res.json()) as StatusResponse

        if (data.status === "running") {
          setRunning({ phaseLabel: data.phaseLabel ?? "..." })
          return
        }

        clearInterval(intervalRef.current!)
        setRunning(null)

        if (data.status === "done" && data.noteTitle && data.notePath) {
          const entry: CompletedEntry = {
            noteTitle: data.noteTitle,
            notePath: data.notePath,
            completedAt: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
          }
          setLastCompleted(entry)
          try {
            localStorage.setItem(LAST_COMPLETED_KEY, JSON.stringify(entry))
          } catch { /* ignore */ }

          setToast({ noteTitle: data.noteTitle, notePath: data.notePath })
          toastTimerRef.current = setTimeout(() => setToast(null), 5000)
        }
      } catch {
        /* network error — keep polling */
      }
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  if (!running && !lastCompleted) return null

  return (
    <>
      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      {lastCompleted && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--green)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, fontSize: "11px", color: "var(--text-2)" }}>
            Ostatni:{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>{lastCompleted.noteTitle}</span>
            <span style={{ color: "var(--text-4)", margin: "0 4px" }}>·</span>
            <span style={{ color: "var(--text-3)" }}>dziś {lastCompleted.completedAt}</span>
          </div>
          <button
            type="button"
            onClick={() => openInObsidian(lastCompleted.notePath)}
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              border: "none",
              borderRadius: "3px",
              padding: "2px 7px",
              fontSize: "10px",
              fontFamily: "var(--font-geist-mono, monospace)",
              cursor: "pointer",
            }}
          >
            otwórz w Obsidianie ↗
          </button>
        </div>
      )}

      {running && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: lastCompleted ? "8px" : 0, opacity: 0.7 }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--amber)",
              flexShrink: 0,
              animation: "pulse 1.2s ease-in-out infinite",
            }}
          />
          <div style={{ fontSize: "11px", color: "var(--text-2)" }}>
            W trakcie:{" "}
            <span style={{ color: "var(--text-3)" }}>{running.phaseLabel}</span>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--text)",
            color: "var(--bg)",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            fontSize: "11px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            zIndex: 1000,
            minWidth: "280px",
          }}
        >
          <div>
            <span style={{ color: "var(--green)" }}>✓</span>
            <span style={{ marginLeft: "8px" }}>
              Gotowe: <strong>{toast.noteTitle}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => openInObsidian(toast.notePath)}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-soft)",
              cursor: "pointer",
              fontSize: "11px",
              padding: 0,
              flexShrink: 0,
            }}
          >
            otwórz ↗
          </button>
        </div>
      )}
    </>
  )
}
