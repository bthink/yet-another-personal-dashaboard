import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const path = request.nextUrl.searchParams.get("path")

    if (!path || path.includes("..") || path.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const fullPath = join(vaultPath, path)
    const content = await readFile(fullPath, "utf-8")
    return NextResponse.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
