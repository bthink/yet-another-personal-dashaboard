"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { buildObsidianUrl } from "@/lib/obsidian"
import type { KnowledgeNote } from "@/app/api/vault/knowledge/route"
import type { HygieneReport } from "@/app/api/vault/hygiene/route"

type Tab = "notes" | "hygiene"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

function TagBadge({ tag }: { tag: string }) {
  return (
    <span
      style={{
        fontSize: "10.5px",
        background: "var(--accent-soft)",
        color: "var(--accent)",
        borderRadius: "3px",
        padding: "1px 5px",
        fontFamily: "var(--font-mono, monospace)",
      }}
    >
      #{tag}
    </span>
  )
}

function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "48px 0",
        color: "var(--text-3)",
        fontSize: 14,
      }}
    >
      {icon && <span style={{ fontSize: 24 }}>{icon}</span>}
      <span>{message}</span>
    </div>
  )
}

function NotesList({
  vaultName,
}: {
  vaultName: string
}) {
  const { data, error, isLoading } = useSWR<KnowledgeNote[]>(
    "/api/vault/knowledge",
    fetcher,
  )
  const [search, setSearch] = useState("")
  const [activeFolder, setActiveFolder] = useState<string | null>(null)

  const folders = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.map((n) => n.folder))).sort()
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((n) => {
      const matchesFolder = !activeFolder || n.folder === activeFolder
      const matchesSearch =
        !search || n.title.toLowerCase().includes(search.toLowerCase())
      return matchesFolder && matchesSearch
    })
  }, [data, activeFolder, search])

  if (isLoading) {
    return (
      <div style={{ color: "var(--text-3)", fontSize: 14, paddingTop: 24 }}>
        Ładowanie...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ color: "var(--red)", fontSize: 14, paddingTop: 24 }}>
        Błąd: {error.message}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search */}
      <input
        type="search"
        placeholder="Szukaj notatek..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 12px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--panel)",
          color: "var(--text)",
          fontSize: 13,
          outline: "none",
        }}
        aria-label="Szukaj notatek"
      />

      {/* Folder pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button
          onClick={() => setActiveFolder(null)}
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: !activeFolder ? "var(--accent)" : "var(--panel)",
            color: !activeFolder ? "var(--bg)" : "var(--text-2)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Wszystkie
        </button>
        {folders.map((f) => {
          const label = f.split("/").slice(1).join("/") || f
          return (
            <button
              key={f}
              onClick={() => setActiveFolder(f === activeFolder ? null : f)}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background:
                  activeFolder === f ? "var(--accent)" : "var(--panel)",
                color: activeFolder === f ? "var(--bg)" : "var(--text-2)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Notes */}
      {filtered.length === 0 ? (
        <EmptyState message="Brak notatek w 03_Knowledge/" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.map((note) => (
            <NoteRow key={note.id} note={note} vaultName={vaultName} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteRow({
  note,
  vaultName,
}: {
  note: KnowledgeNote
  vaultName: string
}) {
  const obsidianUrl = buildObsidianUrl(vaultName, note.id)
  const relFolder = note.folder.split("/").slice(1).join("/") || note.folder
  const date = new Date(note.lastModified).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}
      >
        <a
          href={obsidianUrl}
          style={{
            color: "var(--text)",
            fontWeight: 500,
            fontSize: 14,
            textDecoration: "none",
          }}
          aria-label={`Otwórz ${note.title} w Obsidian`}
        >
          {note.title}
        </a>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          {relFolder}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-4)" }}>
          {note.wordCount} słów · {date}
        </span>
      </div>

      {note.preview && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-2)",
            margin: 0,
            lineHeight: 1.5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {note.preview}
        </p>
      )}

      {note.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {note.tags.slice(0, 8).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </div>
  )
}

function HygienePanel({ vaultName }: { vaultName: string }) {
  const { data, error, isLoading } = useSWR<HygieneReport>(
    "/api/vault/hygiene",
    fetcher,
  )

  if (isLoading) {
    return (
      <div style={{ color: "var(--text-3)", fontSize: 14, paddingTop: 24 }}>
        Sprawdzanie spójności vaultu...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ color: "var(--red)", fontSize: 14, paddingTop: 24 }}>
        Błąd: {error.message}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Orphan notes */}
      <section>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 12,
          }}
        >
          Osierocone notatki
          <span
            style={{
              marginLeft: 8,
              fontWeight: 400,
              color: "var(--text-3)",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            ({data?.orphanNotes.length ?? 0})
          </span>
        </h2>

        {!data || data.orphanNotes.length === 0 ? (
          <EmptyState message="Brak sierot" icon="✓" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.orphanNotes.map((note) => {
              const obsidianUrl = buildObsidianUrl(vaultName, note.id)
              const relFolder = note.folder.split("/").slice(1).join("/") || note.folder
              return (
                <div
                  key={note.id}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--panel)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <a
                    href={obsidianUrl}
                    style={{
                      color: "var(--text)",
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                    aria-label={`Otwórz ${note.title} w Obsidian`}
                  >
                    {note.title}
                  </a>
                  <span
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      color: "var(--text-3)",
                    }}
                  >
                    {relFolder}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Dead links */}
      <section>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 12,
          }}
        >
          Martwe linki
          <span
            style={{
              marginLeft: 8,
              fontWeight: 400,
              color: "var(--text-3)",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            ({data?.deadlinks.length ?? 0})
          </span>
        </h2>

        {!data || data.deadlinks.length === 0 ? (
          <EmptyState message="Brak martwych linków" icon="✓" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.deadlinks.map((dl, i) => (
              <div
                key={`${dl.sourcePath}-${dl.linkName}-${i}`}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--panel)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--text-2)" }}>{dl.sourceTitle}</span>
                <span style={{ color: "var(--text-4)" }}>→</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    color: "var(--red)",
                    background: "oklch(0.58 0.15 25 / 0.08)",
                    borderRadius: 3,
                    padding: "1px 5px",
                  }}
                >
                  [[{dl.linkName}]]
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes without index */}
      <section>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 12,
          }}
        >
          Notatki bez indeksu
          <span
            style={{
              marginLeft: 8,
              fontWeight: 400,
              color: "var(--text-3)",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            ({data?.notesWithoutIndex.length ?? 0})
          </span>
        </h2>

        {!data || data.notesWithoutIndex.length === 0 ? (
          <EmptyState message="Wszystkie notatki są w indeksach ✓" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.notesWithoutIndex.map((note) => {
              const obsidianUrl = buildObsidianUrl(vaultName, note.id)
              const relFolder = note.folder.split("/").slice(1).join("/") || note.folder
              return (
                <div
                  key={note.id}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--panel)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: "var(--text)",
                      fontSize: 13,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {note.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      color: "var(--text-3)",
                    }}
                  >
                    {relFolder}
                  </span>
                  <a
                    href={obsidianUrl}
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: "var(--accent)",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                    aria-label={`Otwórz ${note.title} w Obsidian`}
                  >
                    Otwórz w Obsidian
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>("notes")
  const { data: health } = useSWR<{ vaultName: string }>(
    "/api/vault/health",
    fetcher,
  )
  const vaultName = health?.vaultName ?? ""

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Knowledge
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>
            03_Knowledge/ · przeglądarka notatek i higiena vaultu
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            borderBottom: "1px solid var(--border)",
            paddingBottom: 0,
          }}
          role="tablist"
        >
          {(["notes", "hygiene"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "var(--accent)" : "var(--text-3)",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {tab === "notes" ? "Notatki" : "Higiena"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "notes" ? (
          <NotesList vaultName={vaultName} />
        ) : (
          <HygienePanel vaultName={vaultName} />
        )}
      </div>
    </main>
  )
}
