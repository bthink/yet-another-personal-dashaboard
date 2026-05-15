import fs from "node:fs"
import path from "node:path"
import Anthropic from "@anthropic-ai/sdk"
import { getVaultPath, writeVaultFile } from "@/lib/vault"
import { updateJob } from "@/lib/research-jobs"
import type { JobState } from "@/lib/research-jobs"

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "jako", "i", "w", "z", "do", "na", "że", "się", "to", "o", "jak",
])

export function extractKeywords(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
        .map((w) => w.replace(/[^a-z0-9ąćęłńóśźż]/g, "")),
    ),
  ]
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function vaultSearch(keywords: string[], maxChars = 2000): string {
  let vaultPath: string
  try {
    vaultPath = getVaultPath()
  } catch {
    return ""
  }

  const knowledgeDir = path.join(vaultPath, "03_Knowledge")
  const snippets: string[] = []

  function walkDir(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name))
      } else if (entry.name.endsWith(".md")) {
        const fullPath = path.join(dir, entry.name)
        let content: string
        try {
          content = fs.readFileSync(fullPath, "utf-8")
        } catch {
          continue
        }
        const lower = content.toLowerCase()
        const matches = keywords.filter((k) => lower.includes(k)).length
        if (matches > 0) {
          const rel = path.relative(vaultPath, fullPath)
          snippets.push(`## ${rel}\n${content.slice(0, 500)}`)
        }
      }
    }
  }

  try {
    walkDir(knowledgeDir)
  } catch {
    return ""
  }

  return snippets.join("\n\n").slice(0, maxChars)
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonalDashboard/1.0)" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return `[Failed to fetch ${url}: ${res.status}]`
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return text.slice(0, 3000)
  } catch {
    return `[Could not fetch ${url}]`
  }
}

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a research assistant for a personal knowledge management system (Obsidian vault, PARA structure).

Given a research query and optional source material (vault context, URLs, web search results), write a comprehensive, well-structured markdown knowledge note.

Requirements:
- Start with a level-1 heading (# Title)
- Use clear sections with ## headings
- Include concrete examples where relevant
- Add frontmatter at the very top with: tags (array), source (url or "personal-research"), date (today)
- Write in the same language as the query
- Be thorough but concise — aim for 300-800 words of body content

Return ONLY the markdown content, no explanation.`

export async function runResearchPipeline(job: JobState): Promise<void> {
  const { id, query, urls, targetFolder } = job

  updateJob(id, { phase: "vault-search" })
  const keywords = extractKeywords(query)
  const vaultContext = vaultSearch(keywords)

  updateJob(id, { phase: "url-fetch" })
  const urlContents: string[] = []
  for (const url of urls) {
    const content = await fetchUrlContent(url)
    urlContents.push(`### Source: ${url}\n${content}`)
  }

  updateJob(id, { phase: "web-search" })
  let webContext = ""
  try {
    const searchRes = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      messages: [
        {
          role: "user",
          content: `Search for information about: ${query}. Return a concise summary of the most relevant findings.`,
        },
      ],
    })
    const textBlock = searchRes.content.find((b) => b.type === "text")
    if (textBlock?.type === "text") webContext = textBlock.text
  } catch {
    // web search unavailable — continue without it
  }

  updateJob(id, { phase: "synthesizing" })
  const today = new Date().toISOString().split("T")[0]
  const userMessage = [
    `Research query: ${query}`,
    vaultContext ? `\n\n## Existing vault notes (context)\n${vaultContext}` : "",
    urlContents.length > 0 ? `\n\n## URL sources\n${urlContents.join("\n\n")}` : "",
    webContext ? `\n\n## Web research\n${webContext}` : "",
    `\n\nToday's date: ${today}`,
  ]
    .filter(Boolean)
    .join("")

  const synthesis = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  })

  const noteContent =
    synthesis.content[0].type === "text" ? synthesis.content[0].text : ""

  updateJob(id, { phase: "writing" })
  const titleMatch = noteContent.match(/^#\s+(.+)$/m)
  const noteTitle = titleMatch ? titleMatch[1].trim() : query
  const fileName = `${slugify(noteTitle)}.md`
  const normalizedFolder = targetFolder.replace(/\/?$/, "/")
  const notePath = `${normalizedFolder}${fileName}`

  const vaultPath = getVaultPath()
  writeVaultFile(vaultPath, notePath, noteContent)

  updateJob(id, { status: "done", phase: "done", notePath, noteTitle })
}
