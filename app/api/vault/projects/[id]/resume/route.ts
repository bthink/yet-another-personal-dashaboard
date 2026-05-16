import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import Anthropic from "@anthropic-ai/sdk"
import { getVaultPath, vaultExists } from "@/lib/vault"

const RESUME_PROMPT = `Przejrzyj te notatki z projektu i odpowiedz w 3 sekcjach:
1. Gdzie skończyliśmy (max 2 zdania)
2. Otwarte pytania (max 3 bullet points)
3. Sugerowany następny krok (1 konkretna akcja)

Notatki projektu:`

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 })
  }

  try {
    const { id } = await params
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    const projectDir = path.join(vaultPath, "01_Projects", id)
    let dirStat: fs.Stats
    try {
      dirStat = fs.statSync(projectDir)
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (!dirStat.isDirectory()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const entries = fs.readdirSync(projectDir, { withFileTypes: true })
    const mdFiles = entries.filter(
      (e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."),
    )

    if (mdFiles.length === 0) {
      return NextResponse.json({ error: "No files in project" }, { status: 400 })
    }

    const fileContents = mdFiles
      .map((e) => {
        const content = fs.readFileSync(path.join(projectDir, e.name), "utf-8")
        return `### ${e.name}\n\n${content}`
      })
      .join("\n\n---\n\n")

    const client = new Anthropic()
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `${RESUME_PROMPT}\n\n${fileContents}`,
        },
      ],
    })

    const textBlock = message.content.find((b) => b.type === "text")
    const resume = textBlock?.type === "text" ? textBlock.text : ""

    return NextResponse.json({ resume })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
