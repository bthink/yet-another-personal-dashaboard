import Fuse from "fuse.js"
import fs from "node:fs"
import path from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"

export type SearchResult = {
  path: string
  title: string
  folder: string
  snippet: string
  score: number
}

type IndexEntry = {
  path: string
  title: string
  folder: string
  content: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/`[^`]*`/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim()
}

function collectMdFiles(dir: string, vaultRoot: string, results: IndexEntry[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".")) {
        collectMdFiles(fullPath, vaultRoot, results)
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = path.relative(vaultRoot, fullPath)
      const title = entry.name.replace(/\.md$/, "")
      const topFolder = relativePath.split(path.sep)[0] ?? ""

      let rawContent = ""
      try {
        rawContent = fs.readFileSync(fullPath, "utf-8")
      } catch {
        // skip unreadable files
      }

      const content = stripMarkdown(rawContent)

      results.push({
        path: relativePath,
        title,
        folder: topFolder,
        content,
      })
    }
  }
}

export function searchVault(query: string): SearchResult[] {
  let vaultPath: string
  try {
    vaultPath = getVaultPath()
  } catch {
    return []
  }

  if (!vaultExists(vaultPath)) return []

  const entries: IndexEntry[] = []
  collectMdFiles(vaultPath, vaultPath, entries)

  const fuse = new Fuse(entries, {
    keys: [
      { name: "title", weight: 0.6 },
      { name: "content", weight: 0.4 },
    ],
    includeScore: true,
    threshold: 0.4,
    minMatchCharLength: 2,
  })

  const raw = fuse.search(query, { limit: 10 })

  return raw.map((r) => ({
    path: r.item.path,
    title: r.item.title,
    folder: r.item.folder,
    snippet: r.item.content.slice(0, 150),
    score: r.score ?? 1,
  }))
}
