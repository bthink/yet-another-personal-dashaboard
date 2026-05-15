# Research Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal research launcher that accepts a query and/or URLs, runs an AI pipeline (vault context + web search + synthesis), and auto-saves a knowledge note to `03_Knowledge/` with fire-and-forget UX.

**Architecture:** `POST /api/research/start` creates an in-memory job and fires the pipeline async; client polls `GET /api/research/status/[jobId]` every 2s. Pipeline: vault grep → URL fetch → Anthropic web_search tool → claude-sonnet-4-6 synthesis → atomic vault write. Two client components: `ResearchLauncher` (input form) and `ResearchStatus` (polling + toast).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Anthropic SDK ^0.96.0, Vitest, Node.js `fs`/`path` for vault I/O.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/vault.ts` | Modify | Add missing `writeVaultFile`, `deleteVaultFile`, `appendToVaultFile` |
| `lib/research-jobs.ts` | Create | In-memory job store (Map) |
| `lib/research-pipeline.ts` | Create | Vault search + URL fetch + web search + AI synthesis + vault write |
| `lib/research-pipeline.test.ts` | Create | Unit tests for pipeline helpers |
| `app/api/research/start/route.ts` | Create | POST — validate body, create job, fire pipeline |
| `app/api/research/status/[jobId]/route.ts` | Create | GET — return job state |
| `app/research/page.tsx` | Create | Server Component shell |
| `components/research/ResearchLauncher.tsx` | Create | 'use client' — input, URL tags, submit |
| `components/research/ResearchStatus.tsx` | Create | 'use client' — polling, status dot, toast |

---

## Task 1: Fix missing vault write functions

**Files:**
- Modify: `lib/vault.ts`

These functions are already imported by `app/api/vault/write/route.ts` and `app/api/vault/undo/route.ts` but were never exported — this causes TypeScript errors. Fix before proceeding.

- [ ] **Step 1: Add writeVaultFile, deleteVaultFile, appendToVaultFile to lib/vault.ts**

Append to the end of `lib/vault.ts`:

```ts
export function writeVaultFile(
  vaultPath: string,
  relativePath: string,
  content: string,
): void {
  const fullPath = path.join(vaultPath, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, "utf-8")
}

export function deleteVaultFile(
  vaultPath: string,
  relativePath: string,
): void {
  fs.unlinkSync(path.join(vaultPath, relativePath))
}

export function appendToVaultFile(
  vaultPath: string,
  relativePath: string,
  line: string,
): void {
  const fullPath = path.join(vaultPath, relativePath)
  fs.appendFileSync(fullPath, `\n${line}`, "utf-8")
}
```

- [ ] **Step 2: Verify TypeScript errors for vault write/undo routes are gone**

```bash
pnpm tsc --noEmit 2>&1 | grep "vault/write\|vault/undo"
```

Expected: no output (no errors for those files).

- [ ] **Step 3: Commit**

```bash
git add lib/vault.ts
git commit -m "fix(vault): add missing writeVaultFile, deleteVaultFile, appendToVaultFile"
```

---

## Task 2: In-memory job store

**Files:**
- Create: `lib/research-jobs.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/research-jobs.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest"
import { createJob, getJob, updateJob } from "./research-jobs"

describe("research-jobs", () => {
  it("createJob returns a job with status running", () => {
    const job = createJob("test query", [], "03_Knowledge/IT/")
    expect(job.status).toBe("running")
    expect(job.query).toBe("test query")
    expect(job.urls).toEqual([])
    expect(job.targetFolder).toBe("03_Knowledge/IT/")
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("getJob returns undefined for unknown id", () => {
    expect(getJob("nonexistent")).toBeUndefined()
  })

  it("getJob returns created job", () => {
    const job = createJob("q", [], "03_Knowledge/")
    expect(getJob(job.id)).toEqual(job)
  })

  it("updateJob merges fields", () => {
    const job = createJob("q", [], "03_Knowledge/")
    updateJob(job.id, { status: "done", notePath: "03_Knowledge/test.md", noteTitle: "Test" })
    const updated = getJob(job.id)
    expect(updated?.status).toBe("done")
    expect(updated?.notePath).toBe("03_Knowledge/test.md")
    expect(updated?.query).toBe("q")
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test lib/research-jobs.test.ts
```

Expected: FAIL — "Cannot find module './research-jobs'"

- [ ] **Step 3: Implement lib/research-jobs.ts**

```ts
import crypto from "node:crypto"

export type JobStatus = "running" | "done" | "error"

export type JobPhase =
  | "vault-search"
  | "url-fetch"
  | "web-search"
  | "synthesizing"
  | "writing"
  | "done"

export type JobState = {
  id: string
  status: JobStatus
  phase: JobPhase
  query: string
  urls: string[]
  targetFolder: string
  notePath?: string
  noteTitle?: string
  error?: string
  createdAt: number
}

const jobs = new Map<string, JobState>()

export function createJob(
  query: string,
  urls: string[],
  targetFolder: string,
): JobState {
  const job: JobState = {
    id: crypto.randomUUID(),
    status: "running",
    phase: "vault-search",
    query,
    urls,
    targetFolder,
    createdAt: Date.now(),
  }
  jobs.set(job.id, job)
  return job
}

export function getJob(id: string): JobState | undefined {
  return jobs.get(id)
}

export function updateJob(id: string, patch: Partial<JobState>): void {
  const job = jobs.get(id)
  if (!job) return
  jobs.set(id, { ...job, ...patch })
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test lib/research-jobs.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/research-jobs.ts lib/research-jobs.test.ts
git commit -m "feat(research): in-memory job store"
```

---

## Task 3: Research pipeline helpers

**Files:**
- Create: `lib/research-pipeline.ts` (vault search + URL fetch helpers)
- Create: `lib/research-pipeline.test.ts`

- [ ] **Step 1: Write failing tests for vault search helper**

Create `lib/research-pipeline.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { extractKeywords, slugify } from "./research-pipeline"

describe("extractKeywords", () => {
  it("returns lowercase unique words, filtered short ones", () => {
    const result = extractKeywords("Differences between Skills and Agents in LLM")
    expect(result).toContain("differences")
    expect(result).toContain("skills")
    expect(result).toContain("agents")
    expect(result).not.toContain("in")
    expect(result).not.toContain("and")
  })
})

describe("slugify", () => {
  it("converts title to safe filename", () => {
    expect(slugify("Skills vs Agents in LLM")).toBe("skills-vs-agents-in-llm")
  })

  it("strips special characters", () => {
    expect(slugify("Różnice między A a B")).toBe("roznicemedzy-a-a-b")
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test lib/research-pipeline.test.ts
```

Expected: FAIL — "Cannot find module './research-pipeline'"

- [ ] **Step 3: Implement extractKeywords and slugify in lib/research-pipeline.ts**

```ts
import fs from "node:fs"
import path from "node:path"
import Anthropic from "@anthropic-ai/sdk"
import { getVaultPath, writeVaultFile } from "@/lib/vault"
import { updateJob } from "@/lib/research-jobs"
import type { JobState } from "@/lib/research-jobs"

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "jako", "i", "w", "z", "do", "na", "że", "się", "to", "o", "jak",
])

export function extractKeywords(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
        .map((w) => w.replace(/[^a-z0-9ąćęłńóśźż]/g, "")),
    ),
  ]
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test lib/research-pipeline.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/research-pipeline.ts lib/research-pipeline.test.ts
git commit -m "feat(research): pipeline helpers (extractKeywords, slugify)"
```

---

## Task 4: Full research pipeline

**Files:**
- Modify: `lib/research-pipeline.ts` — add vault search, URL fetch, AI call, vault write

- [ ] **Step 1: Add vaultSearch helper to lib/research-pipeline.ts**

Append after the `slugify` function:

```ts
export function vaultSearch(keywords: string[], maxChars = 2000): string {
  let vaultPath: string
  try {
    vaultPath = getVaultPath()
  } catch {
    return ""
  }

  const knowledgeDir = path.join(vaultPath, "03_Knowledge")
  const snippets: string[] = []

  function walkDir(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name))
      } else if (entry.name.endsWith(".md")) {
        const fullPath = path.join(dir, entry.name)
        let content: string
        try {
          content = fs.readFileSync(fullPath, "utf-8")
        } catch {
          continue
        }
        const lower = content.toLowerCase()
        const matches = keywords.filter((k) => lower.includes(k)).length
        if (matches > 0) {
          const rel = path.relative(vaultPath, fullPath)
          snippets.push(`## ${rel}\n${content.slice(0, 500)}`)
        }
      }
    }
  }

  try {
    walkDir(knowledgeDir)
  } catch {
    return ""
  }

  return snippets.join("\n\n").slice(0, maxChars)
}
```

- [ ] **Step 2: Add fetchUrlContent helper to lib/research-pipeline.ts**

Append after `vaultSearch`:

```ts
export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonalDashboard/1.0)" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return `[Failed to fetch ${url}: ${res.status}]`
    const html = await res.text()
    // strip tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return text.slice(0, 3000)
  } catch {
    return `[Could not fetch ${url}]`
  }
}
```

- [ ] **Step 3: Add runResearchPipeline to lib/research-pipeline.ts**

Append after `fetchUrlContent`:

```ts
const client = new Anthropic()

const SYSTEM_PROMPT = `You are a research assistant for a personal knowledge management system (Obsidian vault, PARA structure).

Given a research query and optional source material (vault context, URLs, web search results), write a comprehensive, well-structured markdown knowledge note.

Requirements:
- Start with a level-1 heading (# Title)
- Use clear sections with ## headings
- Include concrete examples where relevant
- Add frontmatter at the very top with: tags (array), source (url or "personal-research"), date (today)
- Write in the same language as the query
- Be thorough but concise — aim for 300-800 words of body content

Return ONLY the markdown content, no explanation.`

export async function runResearchPipeline(job: JobState): Promise<void> {
  const { id, query, urls, targetFolder } = job

  // Step 1: vault search
  updateJob(id, { phase: "vault-search" })
  const keywords = extractKeywords(query)
  const vaultContext = vaultSearch(keywords)

  // Step 2: URL fetch
  updateJob(id, { phase: "url-fetch" })
  const urlContents: string[] = []
  for (const url of urls) {
    const content = await fetchUrlContent(url)
    urlContents.push(`### Source: ${url}\n${content}`)
  }

  // Step 3: web search via Anthropic tool
  updateJob(id, { phase: "web-search" })
  let webContext = ""
  try {
    const searchRes = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Search for information about: ${query}. Return a concise summary of the most relevant findings.`,
        },
      ],
    })
    const textBlock = searchRes.content.find((b) => b.type === "text")
    if (textBlock?.type === "text") webContext = textBlock.text
  } catch {
    // web search unavailable — continue without it
  }

  // Step 4: synthesize
  updateJob(id, { phase: "synthesizing" })
  const today = new Date().toISOString().split("T")[0]
  const userMessage = [
    `Research query: ${query}`,
    vaultContext ? `\n\n## Existing vault notes (context)\n${vaultContext}` : "",
    urlContents.length > 0 ? `\n\n## URL sources\n${urlContents.join("\n\n")}` : "",
    webContext ? `\n\n## Web research\n${webContext}` : "",
    `\n\nToday's date: ${today}`,
  ]
    .filter(Boolean)
    .join("")

  const synthesis = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  })

  const noteContent =
    synthesis.content[0].type === "text" ? synthesis.content[0].text : ""

  // Step 5: write to vault
  updateJob(id, { phase: "writing" })
  const titleMatch = noteContent.match(/^#\s+(.+)$/m)
  const noteTitle = titleMatch ? titleMatch[1].trim() : query
  const fileName = `${slugify(noteTitle)}.md`
  const normalizedFolder = targetFolder.replace(/\/?$/, "/")
  const notePath = `${normalizedFolder}${fileName}`

  const vaultPath = getVaultPath()
  writeVaultFile(vaultPath, notePath, noteContent)

  updateJob(id, { status: "done", phase: "done", notePath, noteTitle })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "research-pipeline"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add lib/research-pipeline.ts
git commit -m "feat(research): full AI pipeline (vault search + URL fetch + web + synthesis + write)"
```

---

## Task 5: API route — POST /api/research/start

**Files:**
- Create: `app/api/research/start/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/research/start/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { createJob, updateJob } from "@/lib/research-jobs"
import { runResearchPipeline } from "@/lib/research-pipeline"

type StartBody = {
  query: string
  urls: string[]
  targetFolder: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: StartBody
  try {
    body = (await req.json()) as StartBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { query, urls, targetFolder } = body

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query required" }, { status: 400 })
  }
  if (!Array.isArray(urls)) {
    return NextResponse.json({ error: "urls must be array" }, { status: 400 })
  }
  if (!targetFolder || typeof targetFolder !== "string") {
    return NextResponse.json({ error: "targetFolder required" }, { status: 400 })
  }

  const job = createJob(query.trim(), urls, targetFolder)

  // fire-and-forget: don't await
  void runResearchPipeline(job).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Pipeline failed"
    updateJob(job.id, { status: "error", error: message })
  })

  return NextResponse.json({ jobId: job.id })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "research/start"
```

Expected: no output.

- [ ] **Step 3: Smoke test with curl (dev server must be running: pnpm dev)**

```bash
curl -s -X POST http://localhost:3000/api/research/start \
  -H "Content-Type: application/json" \
  -d '{"query":"test","urls":[],"targetFolder":"03_Knowledge/IT/"}' | jq .
```

Expected: `{ "jobId": "<uuid>" }`

- [ ] **Step 4: Commit**

```bash
git add app/api/research/start/route.ts
git commit -m "feat(research): POST /api/research/start route"
```

---

## Task 6: API route — GET /api/research/status/[jobId]

**Files:**
- Create: `app/api/research/status/[jobId]/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/research/status/[jobId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { getJob } from "@/lib/research-jobs"

const PHASE_LABELS: Record<string, string> = {
  "vault-search": "szuka w vaultcie...",
  "url-fetch": "pobiera URLe...",
  "web-search": "przeszukuje web...",
  synthesizing: "generuje notatkę...",
  writing: "zapisuje do vaultu...",
  done: "gotowe",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params
  const job = getJob(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    phaseLabel: PHASE_LABELS[job.phase] ?? job.phase,
    notePath: job.notePath,
    noteTitle: job.noteTitle,
    error: job.error,
  })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "research/status"
```

Expected: no output.

- [ ] **Step 3: Smoke test (reuse jobId from Task 5 smoke test)**

```bash
curl -s http://localhost:3000/api/research/status/<jobId-from-task-5> | jq .
```

Expected: `{ "status": "running"|"done"|"error", "phaseLabel": "..." }`

- [ ] **Step 4: Commit**

```bash
git add app/api/research/status/[jobId]/route.ts
git commit -m "feat(research): GET /api/research/status/[jobId] route"
```

---

## Task 7: ResearchLauncher component

**Files:**
- Create: `components/research/ResearchLauncher.tsx`

- [ ] **Step 1: Implement ResearchLauncher**

Create `components/research/ResearchLauncher.tsx`:

```tsx
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
      {/* Query input */}
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

        {/* URL tags */}
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

        {/* URL input */}
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

      {/* Action row */}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "ResearchLauncher"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/research/ResearchLauncher.tsx
git commit -m "feat(research): ResearchLauncher client component"
```

---

## Task 8: ResearchStatus component

**Files:**
- Create: `components/research/ResearchStatus.tsx`

- [ ] **Step 1: Implement ResearchStatus**

Create `components/research/ResearchStatus.tsx`:

```tsx
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

  // Load persisted last completed on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_COMPLETED_KEY)
      if (stored) setLastCompleted(JSON.parse(stored) as CompletedEntry)
    } catch {
      /* ignore */
    }
  }, [])

  // Poll when jobId changes
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

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  if (!running && !lastCompleted) return null

  return (
    <>
      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      {/* Last completed */}
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

      {/* Running indicator */}
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

      {/* Toast */}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "ResearchStatus"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/research/ResearchStatus.tsx
git commit -m "feat(research): ResearchStatus component with polling and toast"
```

---

## Task 9: Research page + pulse animation

**Files:**
- Create: `app/research/page.tsx`
- Modify: `app/globals.css` (or equivalent global styles) — add pulse keyframe

- [ ] **Step 1: Find the global CSS file**

```bash
find /Users/bartoszfink/dzikieProjekty/yetAnotherPersonalDashboard/app -name "*.css" | head -5
```

- [ ] **Step 2: Add pulse keyframe to global CSS**

In the global CSS file (likely `app/globals.css`), add:

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

- [ ] **Step 3: Create app/research/page.tsx**

```tsx
"use client"

import { useState } from "react"
import ResearchLauncher from "@/components/research/ResearchLauncher"
import ResearchStatus from "@/components/research/ResearchStatus"

export default function ResearchPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  return (
    <main style={{ maxWidth: "640px", margin: "32px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
        Research
      </h1>
      <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "24px" }}>
        Vault + Web → notatka w 03_Knowledge/
      </p>

      <ResearchLauncher onJobStarted={setCurrentJobId} />
      <ResearchStatus jobId={currentJobId} />
    </main>
  )
}
```

- [ ] **Step 4: Verify the page renders (dev server must be running)**

Open `http://localhost:3000/research` in a browser. Expected: form with query textarea, URL input, "Zbadaj →" button.

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "research/page"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app/research/page.tsx app/globals.css
git commit -m "feat(research): Research page — launcher + status wired up"
```

---

## Task 10: End-to-end smoke test

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests pass, new research-jobs and research-pipeline tests pass.

- [ ] **Step 2: Manual end-to-end test**

With `pnpm dev` running and `.env.local` set:

1. Open `http://localhost:3000/research`
2. Type a query: "co to jest prompt caching w Anthropic"
3. Click "Zbadaj →"
4. Observe amber dot with phase labels appearing
5. After ~30s: toast appears + green dot with note title
6. Click "otwórz w Obsidianie ↗" — note should open in Obsidian
7. Verify note exists in `$VAULT_PATH/03_Knowledge/IT/`

- [ ] **Step 3: Final TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep -v "automations/\[id\]/run" | grep error
```

Expected: no output (automations/[id]/run errors pre-exist and are out of scope).

- [ ] **Step 4: Final commit if any loose files**

```bash
git status
```

If clean: done. If untracked: add and commit.
