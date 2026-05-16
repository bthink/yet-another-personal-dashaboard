"use client"

import { useState } from "react"
import useSWR from "swr"
import type { ProjectSummary } from "@/app/api/vault/projects/route"
import type { ProjectDetail } from "@/app/api/vault/projects/[id]/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function buildObsidianUrl(filePath: string): string {
  return `obsidian://open?vault=${encodeURIComponent("Bf-vault")}&file=${encodeURIComponent(filePath)}`
}

interface ProjectCardProps {
  project: ProjectSummary
}

function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [resumeText, setResumeText] = useState<string | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)

  const { data: detail, isLoading: detailLoading } = useSWR<ProjectDetail>(
    expanded ? `/api/vault/projects/${project.id}` : null,
    fetcher,
  )

  const handleToggle = () => {
    setExpanded((prev) => !prev)
    if (expanded) {
      setResumeText(null)
      setResumeError(null)
    }
  }

  const handleGenerateResume = async () => {
    setResumeLoading(true)
    setResumeError(null)
    try {
      const res = await fetch(`/api/vault/projects/${project.id}/resume`, {
        method: "POST",
      })
      const data = (await res.json()) as { resume?: string; error?: string }
      if (data.error) {
        setResumeError(data.error)
      } else {
        setResumeText(data.resume ?? "")
      }
    } catch {
      setResumeError("Błąd połączenia z API")
    } finally {
      setResumeLoading(false)
    }
  }

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      {/* Header row */}
      <button
        onClick={handleToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Chevron */}
        <span
          style={{
            color: "var(--text-3)",
            fontSize: "12px",
            flexShrink: 0,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            display: "inline-block",
          }}
        >
          ▶
        </span>

        {/* Project name */}
        <span
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--text)",
            flexGrow: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </span>

        {/* File count badge */}
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
            color: "var(--text-3)",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1px 6px",
            flexShrink: 0,
          }}
        >
          {project.fileCount} {project.fileCount === 1 ? "plik" : "pliki"}
        </span>

        {/* Last modified */}
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-3)",
            flexShrink: 0,
          }}
        >
          {formatRelativeTime(project.lastModified)}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "16px",
          }}
        >
          {detailLoading && (
            <p style={{ fontSize: "12px", color: "var(--text-3)" }}>Ładowanie...</p>
          )}

          {detail && !("error" in detail) && (
            <>
              {/* File list */}
              {detail.files.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-3)" }}>Brak plików .md</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  {detail.files.map((file) => (
                    <div
                      key={file.path}
                      style={{
                        background: "var(--panel-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--text)",
                            flexGrow: 1,
                          }}
                        >
                          {file.name}
                        </span>
                        <a
                          href={buildObsidianUrl(file.path)}
                          style={{
                            fontSize: "11px",
                            color: "var(--accent)",
                            textDecoration: "none",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            padding: "1px 8px",
                            flexShrink: 0,
                          }}
                          title="Otwórz w Obsidian"
                        >
                          Open ↗
                        </a>
                        <span style={{ fontSize: "11px", color: "var(--text-3)", flexShrink: 0 }}>
                          {formatRelativeTime(file.lastModified)}
                        </span>
                      </div>
                      {file.preview && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-2)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.preview}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resume section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  onClick={handleGenerateResume}
                  disabled={resumeLoading}
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "12px",
                    color: resumeLoading ? "var(--text-3)" : "var(--text)",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "5px 12px",
                    cursor: resumeLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {resumeLoading ? "Generowanie..." : "Generuj resume projektu"}
                </button>

                {resumeError && (
                  <p style={{ fontSize: "12px", color: "var(--red, #e55)" }}>
                    Błąd: {resumeError}
                  </p>
                )}

                {resumeText !== null && !resumeError && (
                  <pre
                    style={{
                      background: "var(--panel-2)",
                      color: "var(--text-2)",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "12px",
                      padding: "12px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      margin: 0,
                    }}
                  >
                    {resumeText}
                  </pre>
                )}
              </div>
            </>
          )}

          {detail && "error" in detail && (
            <p style={{ fontSize: "12px", color: "var(--red, #e55)" }}>
              Błąd: {(detail as unknown as { error: string }).error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const { data, isLoading, error } = useSWR<ProjectSummary[]>("/api/vault/projects", fetcher)

  return (
    <main className="flex-1 overflow-auto p-8">
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "4px",
            }}
          >
            Projects
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-3)" }}>
            Kokpit projektów z 01_Projects/
          </p>
        </div>

        {isLoading && (
          <p style={{ fontSize: "12px", color: "var(--text-3)" }}>Ładowanie projektów...</p>
        )}

        {error && (
          <p style={{ fontSize: "12px", color: "var(--red, #e55)" }}>
            Błąd ładowania projektów
          </p>
        )}

        {data && data.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "4px" }}>
              Brak projektów w 01_Projects/
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-3)" }}>
              Utwórz folder projektu w vaulcie Obsidian
            </p>
          </div>
        )}

        {data && data.length > 0 && (
          <div>
            {data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
