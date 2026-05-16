import { NextResponse } from "next/server"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { buildGraphData, extractWikilinks } from "@/lib/graph"
import { getVaultPath, vaultExists } from "@/lib/vault"

const SYSTEM_FOLDERS = ["00_System", "96_ClaudeMemory", "97_Inbox"]

export type HygieneReport = {
  orphanNotes: { id: string; title: string; folder: string }[]
  deadlinks: { sourcePath: string; sourceTitle: string; linkName: string }[]
  notesWithoutIndex: { id: string; title: string; folder: string }[]
}

async function collectFiles(
  dir: string,
  base = "",
): Promise<{ path: string; content: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: { path: string; content: string }[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const full = join(dir, entry.name)
    const rel = base ? `${base}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full, rel)))
    } else if (entry.name.endsWith(".md")) {
      const content = await readFile(full, "utf-8")
      results.push({ path: rel, content })
    }
  }

  return results
}

function isSystemFile(path: string): boolean {
  return SYSTEM_FOLDERS.some((f) => path.startsWith(`${f}/`))
}

export async function GET(): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const files = await collectFiles(vaultPath)
    const graphData = buildGraphData(files)

    // Build set of note names that exist in vault (lowercase for matching)
    const existingNoteNames = new Set(
      files.map(({ path }) =>
        (path.split("/").pop()?.replace(/\.md$/, "") ?? "").toLowerCase(),
      ),
    )

    // Find orphan notes: nodes that no other node links TO (no inbound links)
    const hasInbound = new Set<string>()
    for (const link of graphData.links) {
      hasInbound.add(link.target)
    }

    const orphanNotes = graphData.nodes
      .filter((node) => !isSystemFile(node.id) && !hasInbound.has(node.id))
      .map((node) => {
        const parts = node.id.split("/")
        const folder =
          parts.length > 1 ? parts.slice(0, -1).join("/") : node.folder
        return { id: node.id, title: node.label, folder }
      })

    // Find deadlinks: wikilinks in files pointing to non-existent notes
    const deadlinks: HygieneReport["deadlinks"] = []

    for (const { path, content } of files) {
      const wikilinks = extractWikilinks(content)
      const sourceTitle = path.split("/").pop()?.replace(/\.md$/, "") ?? path

      for (const linkName of wikilinks) {
        if (!existingNoteNames.has(linkName.toLowerCase())) {
          deadlinks.push({ sourcePath: path, sourceTitle, linkName })
        }
      }
    }

    // Find notes without index: notes in 03_Knowledge/ subfolders not referenced by any index file
    const KNOWLEDGE_PREFIX = "03_Knowledge/"

    function isIndexFile(filePath: string): boolean {
      const filename = filePath.split("/").pop() ?? ""
      const nameWithoutExt = filename.replace(/\.md$/, "")
      const containingFolder = filePath.split("/").slice(-2)[0] ?? ""
      return (
        nameWithoutExt === containingFolder ||
        nameWithoutExt.toLowerCase().includes("index") ||
        nameWithoutExt.toLowerCase().includes("moc")
      )
    }

    const knowledgeFiles = files.filter(({ path }) =>
      path.startsWith(KNOWLEDGE_PREFIX),
    )

    // Collect all index files and the set of titles they link to
    const indexFiles = knowledgeFiles.filter(({ path }) => isIndexFile(path))
    const titlesInIndexes = new Set<string>()
    for (const { content } of indexFiles) {
      for (const link of extractWikilinks(content)) {
        titlesInIndexes.add(link.toLowerCase())
      }
    }

    // Non-index notes in subfolders (at least 03_Knowledge/X/Y.md depth)
    const notesWithoutIndex = knowledgeFiles
      .filter(({ path }) => {
        if (isIndexFile(path)) return false
        // Must be in a subfolder: 03_Knowledge/X/Y.md — at least 3 segments
        const segments = path.split("/")
        return segments.length >= 3
      })
      .filter(({ path }) => {
        const title = (path.split("/").pop()?.replace(/\.md$/, "") ?? "").toLowerCase()
        return !titlesInIndexes.has(title)
      })
      .map(({ path }) => {
        const parts = path.split("/")
        const title = parts.pop()?.replace(/\.md$/, "") ?? path
        const folder = parts.join("/")
        return { id: path, title, folder }
      })

    const report: HygieneReport = { orphanNotes, deadlinks, notesWithoutIndex }
    return NextResponse.json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
