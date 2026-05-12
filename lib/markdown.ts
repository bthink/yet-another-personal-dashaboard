import type { TodoItem, TodoSection } from "@/lib/mock-data"

// ---------------------------------------------------------------------------
// TODO.md parser
// Format: ## Section name  →  - [ ] task [[link]] (due:: YYYY-MM-DD)  #tag
// ---------------------------------------------------------------------------

const DUE_RE = /\(due::\s*(\d{4}-\d{2}-\d{2})\)/
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g
const TAG_RE = /#[\w-]+/g

function extractProject(text: string): string | undefined {
  const match = WIKILINK_RE.exec(text)
  WIKILINK_RE.lastIndex = 0
  return match ? match[1] : undefined
}

function extractTags(text: string): string[] {
  return text.match(TAG_RE) ?? []
}

function cleanTitle(raw: string): string {
  return raw
    .replace(DUE_RE, "")
    .replace(TAG_RE, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseTodoLine(line: string, sectionId: string, index: number): TodoItem | null {
  const doneMatch = /^- \[(x| )\] (.+)$/i.exec(line.trim())
  if (!doneMatch) return null

  const done = doneMatch[1].toLowerCase() === "x"
  const raw = doneMatch[2]

  const dueMatch = DUE_RE.exec(raw)
  const dueDate = dueMatch ? `${dueMatch[1]}T00:00:00Z` : undefined
  const project = extractProject(raw)
  const tags = extractTags(raw)
  const title = cleanTitle(raw)

  return {
    id: `${sectionId}-${index}`,
    title,
    done,
    priority: "medium",
    ...(dueDate && { dueDate }),
    ...(project && { project }),
    ...(tags.length > 0 && { tags }),
  }
}

export function parseTodoMd(content: string): TodoSection[] {
  const lines = content.split("\n")
  const sections: TodoSection[] = []
  let current: TodoSection | null = null
  let itemIndex = 0

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current)
      const title = line.slice(3).trim()
      const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`
      current = { id, title, items: [] }
      itemIndex = 0
      continue
    }

    if (current && line.trim().startsWith("- [")) {
      const item = parseTodoLine(line, current.id, itemIndex++)
      if (item) current.items.push(item)
    }
  }

  if (current) sections.push(current)
  return sections
}

// ---------------------------------------------------------------------------
// Inbox file metadata extractor
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/

function parseFrontmatter(content: string): Record<string, string> {
  const match = FRONTMATTER_RE.exec(content)
  if (!match) return {}
  const result: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":")
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "")
    result[key] = value
  }
  return result
}

function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_RE, "")
}

function firstParagraph(body: string): string {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("- ["))
  return lines[0] ?? ""
}

export interface InboxFileMeta {
  title: string
  source: string | undefined
  preview: string | undefined
  createdAt: string | undefined
}

export function parseInboxFile(filename: string, content: string): InboxFileMeta {
  const fm = parseFrontmatter(content)
  const body = stripFrontmatter(content)

  const title =
    fm["title"] ??
    body
      .split("\n")
      .find((l) => l.startsWith("# "))
      ?.slice(2)
      .trim() ??
    filename.replace(/\.md$/, "").replace(/[-_]/g, " ")

  const source = fm["source"] ?? fm["from"] ?? undefined
  const preview = firstParagraph(body) || undefined
  const createdAt = fm["created"] ?? fm["date"] ?? undefined

  return { title, source, preview, createdAt }
}
