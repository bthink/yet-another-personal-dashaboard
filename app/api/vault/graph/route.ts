import { NextResponse } from "next/server"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { buildGraphData } from "@/lib/graph"
import { getVaultPath, vaultExists } from "@/lib/vault"

async function collectFiles(
  dir: string,
  base = ""
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

export async function GET(): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const files = await collectFiles(vaultPath)
    const data = buildGraphData(files)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
