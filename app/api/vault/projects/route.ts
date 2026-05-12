import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getVaultPath, vaultExists } from "@/lib/vault"

export interface ProjectSummary {
  id: string
  name: string
  path: string
  fileCount: number
  lastModified: string
}

export async function GET(): Promise<NextResponse> {
  try {
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const projectsDir = path.join(vaultPath, "01_Projects")
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(projectsDir, { withFileTypes: true })
    } catch {
      return NextResponse.json([] satisfies ProjectSummary[])
    }

    const projects: ProjectSummary[] = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((dir) => {
        const dirPath = path.join(projectsDir, dir.name)
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))
        const stat = fs.statSync(dirPath)
        return {
          id: dir.name,
          name: dir.name.replace(/^\d+[-_]\s*/, "").replace(/[-_]/g, " "),
          path: path.join("01_Projects", dir.name),
          fileCount: files.length,
          lastModified: stat.mtime.toISOString(),
        }
      })

    projects.sort((a, b) => b.lastModified.localeCompare(a.lastModified))

    return NextResponse.json(projects)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
