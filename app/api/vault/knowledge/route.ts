import { NextResponse } from "next/server"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"

export type KnowledgeNote = {
  id: string
  title: string
  folder: string
  preview: string
  wordCount: number
  lastModified: string
  tags: string[]
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^---[\s\S]*?---\n?/, "") // frontmatter
    .replace(/#{1,6}\s+/g, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/_(.+?)_/g, "$1") // italic
    .replace(/\[\[([^\]]+)\]\]/g, "$1") // wikilinks
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // md links
    .replace(/^\s*[-*+]\s+/gm, "") // list markers
    .replace(/\s+/g, " ")
    .trim()
}

function extractTags(content: string): string[] {
  const tags: string[] = []

  // frontmatter tags: [tag1, tag2] or tags:\n  - tag
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const fm = fmMatch[1]
    const inlineMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m)
    if (inlineMatch) {
      tags.push(
        ...inlineMatch[1]
          .split(",")
          .map((t) => t.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean),
      )
    } else {
      const blockMatch = fm.match(/^tags:\s*\n((?:\s*-\s*.+\n?)*)/m)
      if (blockMatch) {
        const lines = blockMatch[1].split("\n")
        for (const line of lines) {
          const tag = line.match(/^\s*-\s*(.+)/)
          if (tag) tags.push(tag[1].trim())
        }
      }
    }
  }

  // #hashtags outside code blocks
  const noCode = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
  const hashMatches = [...noCode.matchAll(/#([a-zA-Z][a-zA-Z0-9_-]*)/g)]
  for (const m of hashMatches) {
    if (!tags.includes(m[1])) tags.push(m[1])
  }

  return tags
}

async function collectKnowledgeFiles(
  dir: string,
  relBase: string,
): Promise<{ relPath: string; content: string; mtime: Date }[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: { relPath: string; content: string; mtime: Date }[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const full = join(dir, entry.name)
    const rel = `${relBase}/${entry.name}`

    if (entry.isDirectory()) {
      results.push(...(await collectKnowledgeFiles(full, rel)))
    } else if (entry.name.endsWith(".md")) {
      const [content, stats] = await Promise.all([
        readFile(full, "utf-8"),
        stat(full),
      ])
      results.push({ relPath: rel, content, mtime: stats.mtime })
    }
  }

  return results
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const folderFilter = searchParams.get("folder")

    const knowledgeDir = join(vaultPath, "03_Knowledge")
    const files = await collectKnowledgeFiles(knowledgeDir, "03_Knowledge")

    const notes: KnowledgeNote[] = files.map(({ relPath, content, mtime }) => {
      const parts = relPath.split("/")
      const title = parts[parts.length - 1].replace(/\.md$/, "")
      const folder =
        parts.length > 2 ? parts.slice(0, -1).join("/") : "03_Knowledge"
      const stripped = stripMarkdown(content)
      const preview = stripped.slice(0, 150)
      const wordCount = stripped.split(/\s+/).filter(Boolean).length
      const tags = extractTags(content)

      return {
        id: relPath,
        title,
        folder,
        preview,
        wordCount,
        lastModified: mtime.toISOString(),
        tags,
      }
    })

    const filtered = folderFilter
      ? notes.filter((n) => n.folder === folderFilter)
      : notes

    filtered.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    )

    return NextResponse.json(filtered)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
