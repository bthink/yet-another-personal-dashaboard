// app/api/inbox/classify/route.ts
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getVaultPath, readVaultFile } from "@/lib/vault"
import type { AiSuggestion } from "@/lib/mock-data"

const client = new Anthropic()

const SYSTEM_PROMPT = `You are an inbox classifier for a personal knowledge management system (Obsidian vault with PARA structure).

Classify the inbox item into exactly one action:
- add-to-todo: the item is an actionable task for the user
- create-note: knowledge, article notes, or reference worth a standalone note in 03_Knowledge/
- move-to-ideas: creative idea or future concept for 04_Ideas/
- watchlist: link, video, book, or article to consume later
- keep: unclear purpose or needs more thought — keep in inbox
- delete: low value, spam, duplicate, or already handled

Vault structure: 01_Projects/ (active projects), 03_Knowledge/ (reference and learning), 04_Ideas/ (ideas and concepts).

Return ONLY valid JSON, no markdown, no explanation:
{"suggestedAction":"...","destinationPath":"...or null","confidence":0.85,"reasoning":"1-2 sentences."}`

type ClassifyResponse = {
  suggestedAction: AiSuggestion["suggestedAction"]
  destinationPath: string | null
  confidence: number
  reasoning: string
}

function buildAppendLine(
  action: AiSuggestion["suggestedAction"],
  itemId: string,
  content: string,
): string | undefined {
  const titleLine = content.split("\n").find((l) => l.startsWith("# "))
  const title = titleLine
    ? titleLine.slice(2).trim()
    : itemId.replace(/[-_]/g, " ")

  if (action === "add-to-todo") return `- [ ] ${title}`
  if (action === "watchlist") return `- [[97_Inbox/${itemId}|${title}]]`
  return undefined
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { itemId: string }
    const { itemId } = body

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId required" }, { status: 400 })
    }

    const vaultPath = getVaultPath()
    const inboxContent = readVaultFile(vaultPath, `97_Inbox/${itemId}.md`)

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Classify this inbox item:\n\nFilename: ${itemId}.md\n\n${inboxContent}`,
        },
      ],
    })

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}"
    const parsed = JSON.parse(text) as ClassifyResponse

    const suggestion: AiSuggestion = {
      id: `suggestion-${itemId}-${Date.now()}`,
      inboxItemId: itemId,
      suggestedAction: parsed.suggestedAction,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      inboxContent,
      ...(parsed.destinationPath && { destinationPath: parsed.destinationPath }),
      ...(buildAppendLine(parsed.suggestedAction, itemId, inboxContent) && {
        appendLine: buildAppendLine(parsed.suggestedAction, itemId, inboxContent),
      }),
    }

    return NextResponse.json(suggestion)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
