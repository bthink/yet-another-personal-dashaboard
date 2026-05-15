# Research Tab - Design Spec

Date: 2026-05-15

## Overview

Minimal research launcher within PersonalDashboard. User inputs a query and/or URLs, AI researches from vault + web, and auto-saves a knowledge note to `03_Knowledge/` without requiring review or confirmation.

## User Flow

1. User types a research query (e.g. "differences between skills and agents in LLM") and/or pastes URLs as tags
2. User optionally changes the target folder (default: `03_Knowledge/IT/`)
3. User clicks "Zbadaj →"
4. UI resets input immediately; amber dot appears in status area ("W trakcie: X")
5. Background job runs: vault search → URL processing → web search → AI synthesis → vault write
6. On completion: toast notification appears (auto-dismisses after 5s) + status area updates to green dot with "Ostatni: X → otwórz w Obsidianie"
7. Note is saved to vault automatically - no confirmation required

## UI Components

### ResearchLauncher (client component)
- Textarea for query text
- URL tag list with add/remove (paste URL → becomes a tag chip)
- Target folder display with "zmień" action (clicking reveals inline text input for manual folder path entry; defaults to `03_Knowledge/IT/`)
- "Zbadaj →" submit button
- On submit: calls `POST /api/research/start`, receives `jobId`, passes to ResearchStatus, resets input

### ResearchStatus (client component)
- Receives `jobId` from page state
- Polls `GET /api/research/status/[jobId]` every 2s while status is `running`
- Shows amber dot + phase label while running (phases: "szuka w vaultcie...", "pobiera URLe...", "przeszukuje web...", "generuje notatkę...")
- On `done`: shows green dot + note title + "otwórz w Obsidianie ↗" link + fires toast
- Persists last completed entry (localStorage) across page reloads
- Toast: dark bg, note title + target path, auto-dismiss 5s

## API Routes

### `POST /api/research/start`

```ts
body: { query: string; urls: string[]; targetFolder: string }
response: { jobId: string }
```

Creates a job entry in the in-memory store, fires the pipeline async (does not await), returns `jobId` immediately.

### `GET /api/research/status/[jobId]`

```ts
response: {
  status: 'running' | 'done' | 'error';
  phase?: string;         // current pipeline phase label
  notePath?: string;      // set when done
  noteTitle?: string;     // set when done
  error?: string;         // set when error
}
```

## AI Pipeline (`lib/research-pipeline.ts`)

Runs async after `start` route returns. Steps in order:

1. **Vault search** - keyword grep across `03_Knowledge/` using query terms; inject top matching note snippets as context (max ~2000 tokens)
2. **URL processing** - for each URL: fetch content, strip HTML; for YouTube URLs: extract transcript via `youtube-transcript` package or fall back to page metadata
3. **Web search** - Anthropic tool_use with web search tool to gather 2-3 additional sources
4. **Synthesis** - single `claude-sonnet-4-6` call with: system prompt (vault context), user message (query + URL content + web results) → returns markdown note with frontmatter (`title`, `tags`, `source`, `date`)
5. **Write** - uses existing `POST /api/vault/write` logic (backup + atomic replace) to save to `targetFolder/[generated-filename].md`
6. **Update job state** - set status to `done` with `notePath` and `noteTitle`

On any step failure: set job status to `error` with message.

## Job Store (`lib/research-jobs.ts`)

In-memory `Map<string, JobState>`. Jobs are lost on server restart - acceptable for local MVP. `jobId` is `crypto.randomUUID()`.

```ts
type JobState = {
  id: string;
  status: 'running' | 'done' | 'error';
  phase: string;
  query: string;
  urls: string[];
  targetFolder: string;
  notePath?: string;
  noteTitle?: string;
  error?: string;
  createdAt: number;
}
```

## File Structure

```
app/
  research/
    page.tsx                        # Server Component shell
app/api/research/
  start/route.ts                    # POST - create job + fire pipeline
  status/[jobId]/route.ts           # GET - poll job state
components/research/
  ResearchLauncher.tsx              # 'use client' - input form
  ResearchStatus.tsx                # 'use client' - polling + toast
lib/
  research-jobs.ts                  # in-memory job store
  research-pipeline.ts              # vault search + URL fetch + web + AI + write
```

## Error Handling

- Network/fetch errors on URL processing: skip that URL, log in job error field, continue pipeline
- AI synthesis error: set job to `error`, show in status area as red dot + message
- Vault write error: set job to `error`; note is NOT saved (no partial state)
- Polling: if status endpoint returns 404 (server restarted, job lost): show "Job niedostępny - serwer zrestartowany" and stop polling

## Out of Scope (this phase)

- Review/edit before save
- Research history persistence
- Streaming output in UI
- Multiple concurrent jobs shown separately (only last is tracked in status)
