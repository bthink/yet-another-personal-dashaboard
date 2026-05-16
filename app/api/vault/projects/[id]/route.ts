import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"

export interface ProjectFile {
  name: string
  path: string
  preview: string
  lastModified: string
}

export interface ProjectDetail {
  id: string
  name: string
  path: string
  files: ProjectFile[]
  lastModified: string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const projectDir = path.join(vaultPath, "01_Projects", id)
    let stat: fs.Stats
    try {
      stat = fs.statSync(projectDir)
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const entries = fs.readdirSync(projectDir, { withFileTypes: true })
    const files: ProjectFile[] = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
      .map((e) => {
        const filePath = path.join(projectDir, e.name)
        const fileStat = fs.statSync(filePath)
        const raw = fs.readFileSync(filePath, "utf-8")
        const preview = raw.slice(0, 200).replace(/\n+/g, " ").trim()
        return {
          name: e.name.replace(/\.md$/, ""),
          path: path.join("01_Projects", id, e.name),
          preview,
          lastModified: fileStat.mtime.toISOString(),
        }
      })
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified))

    const detail: ProjectDetail = {
      id,
      name: id.replace(/^\d+[-_]\s*/, "").replace(/[-_]/g, " "),
      path: path.join("01_Projects", id),
      files,
      lastModified: stat.mtime.toISOString(),
    }

    return NextResponse.json(detail)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
