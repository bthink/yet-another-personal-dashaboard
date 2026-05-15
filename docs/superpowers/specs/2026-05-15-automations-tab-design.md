# Skills & Automations Tab - Design Spec

Date: 2026-05-15
Status: approved

## Overview

New sidebar tab "Automations" (⚡ icon) between Research and Calendar. Lets the user create, edit, and run two types of items:

- **Skills** - Claude Code instruction files (`.md`) stored in `~/.claude/skills/`
- **Automations** - shell scripts with optional cron schedule, stored in `~/.claude/automations/`

Both types support inputs sourced from: manual text, vault file picker, inbox item, todo item.

## Navigation

New sidebar entry in `components/layout/Sidebar.tsx`:
```
⚡ Automations   [N]   ← badge = count of active cron schedules
```

Position: between Research and Calendar.

Route: `app/dashboard/automations/page.tsx` inside existing dashboard layout.

## Page Layout

2-column split, follows dashboard conventions:

```
┌─────────────────────────────────────────────────────┐
│ [Skills] [Automations]              [+ New]          │
├──────────────────┬──────────────────────────────────┤
│ List (280px)     │ Detail / editor panel             │
│                  │                                   │
│ • item-name      │  Name: ___________                │
│ • item-name2     │  Description: ___________         │
│ (filterable)     │  Script / Content:                │
│                  │  ┌─────────────────────────┐     │
│                  │  │ textarea / code area    │     │
│                  │  └─────────────────────────┘     │
│                  │  Schedule: [ cron expr ]          │
│                  │                                   │
│                  │  [▶ Run]  [Save]  [Delete]        │
│                  │                                   │
│                  │  --- Last runs ---                │
│                  │  ✓ 14:23  ✗ 13:01  ✓ 09:44       │
└──────────────────┴──────────────────────────────────┘
```

"Run" opens a modal to supply inputs before execution. Output streams inline below the button via SSE.

## Data Model

### Skill

Stored as `.md` files in `~/.claude/skills/`. Frontmatter holds metadata.

```ts
type Skill = {
  name: string        // slug = filename without .md
  description: string // from frontmatter
  content: string     // full file content
  path: string
}
```

### Automation

One JSON file per automation in `~/.claude/automations/[id].json`.

```ts
type Automation = {
  id: string
  name: string
  description: string
  script: string          // bash script content
  schedule: string | null // cron expression e.g. "0 9 * * 1-5"
  inputs: InputDef[]
  createdAt: string
  updatedAt: string
}

type InputDef = {
  key: string
  label: string
  type: 'text' | 'vault-file' | 'inbox-item' | 'todo-item'
  required: boolean
}
```

### Run Log

Append-only JSONL per automation: `~/.claude/automations/logs/[id].jsonl`. Keep last 50 entries.

```ts
type RunLog = {
  runId: string
  automationId: string
  startedAt: string
  finishedAt: string
  status: 'ok' | 'error' | 'running'
  inputs: Record<string, string>
  output: string   // stdout + stderr combined
  exitCode: number
}
```

### Cron State

`~/.claude/automations/schedule.json` tracks active schedules. node-cron registers jobs at Next.js startup by reading this file; cancelled jobs are removed from the file.

## API Routes

```
GET    /api/skills                  → Skill[]
POST   /api/skills                  → create  { name, content }
PUT    /api/skills/[name]           → update content
DELETE /api/skills/[name]           → delete file

GET    /api/automations             → Automation[]
POST   /api/automations             → create
PUT    /api/automations/[id]        → update
DELETE /api/automations/[id]        → delete + cancel cron job
POST   /api/automations/[id]/run    → execute, body: { inputs }
GET    /api/automations/[id]/logs   → RunLog[] last 50
```

`POST .../run` returns a `text/event-stream` (SSE). Client receives stdout/stderr lines as they arrive. Process has a 60s timeout; killed on client disconnect.

Execution: `child_process.spawn('bash', ['-c', script])` with inputs passed as environment variables (`INPUT_<KEY>=value`).

## Components

```
app/dashboard/automations/page.tsx       ← Server Component, initial fetch
components/automations/
  AutomationsPage.tsx                    ← 'use client', 2-col layout
  SkillList.tsx                          ← filterable skill list
  AutomationList.tsx                     ← filterable automation list
  SkillEditor.tsx                        ← textarea + save/delete
  AutomationEditor.tsx                   ← name/desc/script/schedule/inputs form
  RunModal.tsx                           ← input modal before Run
  RunOutput.tsx                          ← SSE stream → live terminal output
  LogHistory.tsx                         ← last N run entries
```

`RunOutput` styling: `font-mono`, `var(--panel-2)` bg, green for stdout lines, red for stderr. Consistent with existing `.md-preview` pattern.

`AutomationEditor` schedule field shows human-readable hint: `"0 9 * * 1-5" = weekdays at 09:00`.

## Error Handling

- Script timeout (60s): SIGTERM → log exit code -1
- Missing required input: block Run button, show inline error
- Vault path unavailable: vault-file / inbox-item pickers show error state
- Cron job failure: logged to JSONL, badge turns amber if last 3 runs all errored

## Out of Scope

- Skill execution via Claude CLI (skills are CRUD only - edit and copy, not auto-invoked)
- Remote/cloud execution
- Inter-automation dependencies / pipelines
- Rollback of vault changes made by scripts
