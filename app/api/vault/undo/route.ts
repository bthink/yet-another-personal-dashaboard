// app/api/vault/undo/route.ts
import { NextRequest, NextResponse } from "next/server"
import {
  getVaultPath,
  readVaultFile,
  writeVaultFile,
  deleteVaultFile,
} from "@/lib/vault"

type UndoPayload = {
  action: string
  inboxPath: string
  inboxContent: string
  writtenPath?: string
  appendTarget?: string
  appendedLine?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { undoToken } = (await req.json()) as { undoToken: string }
    const payload = JSON.parse(
      Buffer.from(undoToken, "base64").toString("utf-8"),
    ) as UndoPayload

    const vaultPath = getVaultPath()

    // restore inbox file
    writeVaultFile(vaultPath, payload.inboxPath, payload.inboxContent)

    // remove created file
    if (payload.writtenPath) {
      try {
        deleteVaultFile(vaultPath, payload.writtenPath)
      } catch {
        // file may have been manually moved — non-fatal
      }
    }

    // remove appended line (last occurrence)
    if (payload.appendTarget && payload.appendedLine) {
      const content = readVaultFile(vaultPath, payload.appendTarget)
      const lines = content.split("\n")
      const lineIndex = lines.findLastIndex(
        (l) => l.trim() === payload.appendedLine!.trim(),
      )
      if (lineIndex >= 0) {
        lines.splice(lineIndex, 1)
        writeVaultFile(vaultPath, payload.appendTarget, lines.join("\n"))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
