import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"
import { parseInboxFile } from "@/lib/markdown"
import type { InboxItem, InboxItemType } from "@/lib/mock-data"

function detectType(filename: string, content: string): InboxItemType {
  const lower = content.toLowerCase()
  if (lower.includes("http://") || lower.includes("https://")) return "link"
  if (lower.includes("- [ ]") || lower.includes("- [x]")) return "task"
  if (/idea|pomys[łl]/i.test(filename + content)) return "idea"
  if (/note|notatk/i.test(filename)) return "note"
  return "note"
}

export async function GET(): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const inboxDir = path.join(vaultPath, "97_Inbox")
    let filenames: string[]
    try {
      filenames = fs
        .readdirSync(inboxDir)
        .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    } catch {
      return NextResponse.json([] satisfies InboxItem[])
    }

    const items: InboxItem[] = filenames.map((filename) => {
      const fullPath = path.join(inboxDir, filename)
      const stat = fs.statSync(fullPath)
      const content = fs.readFileSync(fullPath, "utf-8")
      const meta = parseInboxFile(filename, content)

      const wordCount = content.split(/\s+/).filter(Boolean).length
      const timestamp = (meta.createdAt
        ? new Date(meta.createdAt)
        : stat.birthtime
      ).toISOString()

      return {
        id: filename.replace(/\.md$/, ""),
        title: meta.title,
        type: detectType(filename, content),
        status: "new",
        timestamp,
        ...(meta.source && { source: meta.source }),
        ...(meta.preview && { preview: meta.preview.slice(0, 120) }),
        // stored for deep links in future use, not part of InboxItem type
        _words: wordCount,
      } as InboxItem & { _words: number }
    })

    // newest first
    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    return NextResponse.json(items)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
