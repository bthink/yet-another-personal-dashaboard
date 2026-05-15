import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getVaultPath, vaultExists, joinVaultPath } from "@/lib/vault"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { backupId, itemId } = (await request.json()) as { backupId: string; itemId: string }

    if (!backupId || !itemId) {
      return NextResponse.json({ error: "backupId and itemId required" }, { status: 400 })
    }

    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const backupFile = path.join(
      joinVaultPath(vaultPath, "97_Inbox", ".backup"),
      `${backupId}.md`,
    )
    if (!fs.existsSync(backupFile)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 })
    }

    fs.copyFileSync(backupFile, joinVaultPath(vaultPath, "97_Inbox", `${itemId}.md`))
    fs.unlinkSync(backupFile)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
