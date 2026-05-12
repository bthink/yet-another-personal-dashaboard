import { NextResponse } from "next/server"
import path from "node:path"
import { getVaultPath, vaultExists, readVaultFile } from "@/lib/vault"
import { parseTodoMd } from "@/lib/markdown"
import type { TodoSection } from "@/lib/mock-data"

export async function GET(): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    let content: string
    try {
      content = readVaultFile(vaultPath, path.join("00_System", "TODO.md"))
    } catch {
      return NextResponse.json([] satisfies TodoSection[])
    }

    const sections = parseTodoMd(content)
    return NextResponse.json(sections)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
