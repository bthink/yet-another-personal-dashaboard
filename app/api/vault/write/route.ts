import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getVaultPath, vaultExists, readVaultFile, joinVaultPath } from "@/lib/vault"
import type { WriteAction } from "@/lib/mock-data"

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function createBackup(vaultPath: string, itemId: string): string {
  const backupDir = joinVaultPath(vaultPath, "97_Inbox", ".backup")
  ensureDir(backupDir)
  const backupId = `${itemId}_${Date.now()}`
  fs.copyFileSync(
    joinVaultPath(vaultPath, "97_Inbox", `${itemId}.md`),
    path.join(backupDir, `${backupId}.md`),
  )
  return backupId
}

type WriteBody = {
  action: WriteAction
  itemId: string
  destinationPath?: string
  todoText?: string
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { action, itemId, destinationPath, todoText } = (await request.json()) as WriteBody

    if (!action || !itemId) {
      return NextResponse.json({ error: "action and itemId required" }, { status: 400 })
    }

    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const inboxFile = joinVaultPath(vaultPath, "97_Inbox", `${itemId}.md`)
    if (!fs.existsSync(inboxFile)) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 })
    }

    const backupId = createBackup(vaultPath, itemId)
    const content = readVaultFile(vaultPath, `97_Inbox/${itemId}.md`)

    switch (action) {
      case "delete": {
        fs.unlinkSync(inboxFile)
        break
      }

      case "move-to-ideas": {
        const dest = joinVaultPath(vaultPath, "04_Ideas")
        ensureDir(dest)
        fs.copyFileSync(inboxFile, path.join(dest, `${itemId}.md`))
        fs.unlinkSync(inboxFile)
        break
      }

      case "create-note": {
        if (!destinationPath) {
          return NextResponse.json({ error: "destinationPath required" }, { status: 400 })
        }
        const destFile = `${destinationPath}.md`
        ensureDir(path.dirname(joinVaultPath(vaultPath, destFile)))
        fs.writeFileSync(joinVaultPath(vaultPath, destFile), content, "utf-8")
        fs.unlinkSync(inboxFile)
        break
      }

      case "add-to-todo": {
        if (!todoText) {
          return NextResponse.json({ error: "todoText required" }, { status: 400 })
        }
        const todoFile = joinVaultPath(vaultPath, "00_System", "TODO.md")
        const todoContent = fs.existsSync(todoFile)
          ? fs.readFileSync(todoFile, "utf-8")
          : "## Następne\n"
        // Insert after first section header
        const firstHeaderEnd = todoContent.indexOf("\n", todoContent.indexOf("\n## ") + 1)
        const line = `- [ ] ${todoText}`
        const newContent =
          firstHeaderEnd !== -1
            ? todoContent.slice(0, firstHeaderEnd + 1) + line + "\n" + todoContent.slice(firstHeaderEnd + 1)
            : todoContent + "\n" + line + "\n"
        fs.writeFileSync(todoFile, newContent, "utf-8")
        fs.unlinkSync(inboxFile)
        break
      }

      case "watchlist": {
        const watchFile = joinVaultPath(vaultPath, "00_System", "Do obejrzenia i przeczytania.md")
        const title =
          content
            .split("\n")
            .find((l) => l.startsWith("# "))
            ?.slice(2)
            .trim() ?? itemId
        const entry = `\n- [[97_Inbox/${itemId}|${title}]]`
        if (fs.existsSync(watchFile)) {
          fs.appendFileSync(watchFile, entry, "utf-8")
        } else {
          fs.writeFileSync(watchFile, `# Do obejrzenia i przeczytania\n${entry}\n`, "utf-8")
        }
        fs.unlinkSync(inboxFile)
        break
      }

      case "keep": {
        const keptDir = joinVaultPath(vaultPath, "97_Inbox", "_kept")
        ensureDir(keptDir)
        fs.copyFileSync(inboxFile, path.join(keptDir, `${itemId}.md`))
        fs.unlinkSync(inboxFile)
        break
      }

      default: {
        return NextResponse.json({ error: `Unknown action: ${action as string}` }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true, backupId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
