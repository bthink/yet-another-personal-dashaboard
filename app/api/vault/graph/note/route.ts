import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { resolve, join } from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const path = request.nextUrl.searchParams.get("path")

    if (!path) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const fullPath = resolve(join(vaultPath, path))
    const resolvedVault = resolve(vaultPath)

    if (!fullPath.startsWith(resolvedVault + "/") && fullPath !== resolvedVault) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const content = await readFile(fullPath, "utf-8")
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: "Failed to read note" }, { status: 500 })
  }
}
