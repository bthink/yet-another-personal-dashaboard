import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getVaultPath, vaultExists, readVaultFile } from "@/lib/vault"
import type { ClassifyResult } from "@/lib/mock-data"

const CLASSIFY_SYSTEM = `You are classifying an inbox item from an Obsidian vault (PARA structure).

Vault structure:
- 97_Inbox/ — items to route (current location)
- 00_System/TODO.md — checkbox todo list
- 00_System/Do obejrzenia i przeczytania.md — watchlist (articles, links, videos to read/watch)
- 01_Projects/ — active projects
- 03_Knowledge/ — knowledge notes and topic MOCs
- 04_Ideas/ — ideas and future plans
- 96_ClaudeMemory/ — AI session memory

Return ONLY valid JSON with this exact structure (no markdown, no explanation outside JSON):
{
  "suggestedAction": "add-to-todo" | "create-note" | "move-to-ideas" | "watchlist" | "keep" | "delete",
  "confidence": 0.0-1.0,
  "reasoning": "1-2 sentence explanation",
  "destinationPath": "vault-relative path without leading slash (required for create-note, e.g. 03_Knowledge/IT/topic-name)",
  "todoText": "task text without checkbox prefix (required for add-to-todo)"
}

Action guidelines:
- "add-to-todo": clearly actionable task → add to TODO.md
- "create-note": reference material, meeting notes, learnings, links worth archiving → 03_Knowledge/ or 01_Projects/
- "move-to-ideas": creative idea, future plan, brainstorm → 04_Ideas/
- "watchlist": link or article/video to read/watch later
- "keep": needs more context, waiting for something, unclear routing
- "delete": spam, duplicate, reminder already handled, no longer relevant`

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get("itemId")

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 })
  }

  try {
    const client = new OpenAI()
    const vaultPath = getVaultPath()
    if (!vaultExists(vaultPath)) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 })
    }

    let content: string
    try {
      content = readVaultFile(vaultPath, `97_Inbox/${itemId}.md`)
    } catch {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 })
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM },
        { role: "user", content: `Filename: ${itemId}.md\n\n${content}` },
      ],
    })

    const text = completion.choices[0]?.message?.content
    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    const result = JSON.parse(text) as ClassifyResult
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
