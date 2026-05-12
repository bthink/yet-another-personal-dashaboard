import { NextResponse } from "next/server"
import { getVaultPath, vaultExists } from "@/lib/vault"
import path from "node:path"
import fs from "node:fs"

export async function GET(): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()

    if (!vaultExists(vaultPath)) {
      return NextResponse.json(
        { ok: false, error: `Vault not found at: ${vaultPath}` },
        { status: 404 },
      )
    }

    const vaultName = path.basename(vaultPath)

    const inboxPath = path.join(vaultPath, "97_Inbox")
    let inboxCount = 0
    try {
      inboxCount = fs
        .readdirSync(inboxPath)
        .filter((f) => f.endsWith(".md") && !f.startsWith(".")).length
    } catch {
      // inbox dir may not exist yet
    }

    return NextResponse.json({ ok: true, vaultName, inboxCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
