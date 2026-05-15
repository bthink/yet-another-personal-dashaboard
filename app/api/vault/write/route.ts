// app/api/vault/write/route.ts
import { NextRequest, NextResponse } from "next/server"
import {
  getVaultPath,
  readVaultFile,
  writeVaultFile,
  deleteVaultFile,
  appendToVaultFile,
} from "@/lib/vault"
import type { AiSuggestion } from "@/lib/mock-data"

type WriteBody = {
  action: AiSuggestion["suggestedAction"]
  itemId: string
  suggestion: AiSuggestion
}

type UndoPayload = {
  action: AiSuggestion["suggestedAction"]
  inboxPath: string
  inboxContent: string
  writtenPath?: string
  appendTarget?: string
  appendedLine?: string
}

function titleFromContent(content: string, fallback: string): string {
  const line = content.split("\n").find((l) => l.startsWith("# "))
  return line ? line.slice(2).trim() : fallback.replace(/[-_]/g, " ")
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { action, itemId, suggestion } = (await req.json()) as WriteBody
    const vaultPath = getVaultPath()
    const inboxRelPath = `97_Inbox/${itemId}.md`
    const inboxContent = readVaultFile(vaultPath, inboxRelPath)

    const undoPayload: UndoPayload = {
      action,
      inboxPath: inboxRelPath,
      inboxContent,
    }

    switch (action) {
      case "create-note": {
        const destPath = `${suggestion.destinationPath ?? `03_Knowledge/${itemId}`}.md`
        writeVaultFile(vaultPath, destPath, inboxContent)
        undoPayload.writtenPath = destPath
        break
      }
      case "move-to-ideas": {
        const title = titleFromContent(inboxContent, itemId)
        const destPath = `04_Ideas/${title}.md`
        writeVaultFile(vaultPath, destPath, inboxContent)
        undoPayload.writtenPath = destPath
        break
      }
      case "add-to-todo": {
        const appendLine =
          suggestion.appendLine ??
          `- [ ] ${titleFromContent(inboxContent, itemId)}`
        appendToVaultFile(vaultPath, "00_System/TODO.md", appendLine)
        undoPayload.appendTarget = "00_System/TODO.md"
        undoPayload.appendedLine = appendLine
        break
      }
      case "watchlist": {
        const appendLine =
          suggestion.appendLine ?? `- [[97_Inbox/${itemId}]]`
        appendToVaultFile(
          vaultPath,
          "00_System/Do obejrzenia i przeczytania.md",
          appendLine,
        )
        undoPayload.appendTarget =
          "00_System/Do obejrzenia i przeczytania.md"
        undoPayload.appendedLine = appendLine
        break
      }
      case "keep":
      case "delete":
        break
    }

    deleteVaultFile(vaultPath, inboxRelPath)

    const undoToken = Buffer.from(
      JSON.stringify(undoPayload),
      "utf-8",
    ).toString("base64")

    return NextResponse.json({ ok: true, undoToken })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
