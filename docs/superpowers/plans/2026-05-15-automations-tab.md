# Skills & Automations Tab - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Automations sidebar tab that lets the user create/edit Claude Code skills (.md files) and shell script automations with cron scheduling, per-run inputs, and live SSE output streaming.

**Architecture:** Server-side lib layer (`lib/skills.ts`, `lib/automations.ts`) handles file I/O against `~/.claude/skills/` and `~/.claude/automations/`. Next.js API routes expose CRUD + SSE run endpoint. Client components use local state (SWR only for LogHistory poll). node-cron jobs initialize via Next.js `instrumentation.ts`. SSE is implemented as a POST with `ReadableStream` response (not EventSource GET, because run needs a body).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4, node-cron, uuid, Node built-in `child_process.spawn`, SWR (log polling only)

---

## File Map

### New files
| Path | Purpose |
|---|---|
| `lib/types/automations.ts` | Skill, Automation, InputDef, RunLog shared types |
| `lib/skills.ts` | Server-only: listSkills, getSkill, saveSkill, deleteSkill |
| `lib/skills.test.ts` | Unit tests for skills helpers |
| `lib/automations.ts` | Server-only: CRUD automations + appendLog, getLogs |
| `lib/automations.test.ts` | Unit tests for automations helpers |
| `lib/automations/scheduler.ts` | node-cron singleton: scheduleJob, cancelJob, runAutomationCron, initScheduler |
| `instrumentation.ts` | Next.js startup hook — calls initScheduler |
| `app/api/skills/route.ts` | GET list, POST create |
| `app/api/skills/[name]/route.ts` | PUT update, DELETE |
| `app/api/automations/route.ts` | GET list, POST create |
| `app/api/automations/[id]/route.ts` | PUT update, DELETE (+ cancel cron) |
| `app/api/automations/[id]/run/route.ts` | POST → SSE stream |
| `app/api/automations/[id]/logs/route.ts` | GET last 50 RunLogs |
| `app/dashboard/automations/page.tsx` | Server Component, initial fetch |
| `components/automations/AutomationsPage.tsx` | `'use client'` root: tab bar + 2-col layout |
| `components/automations/SkillList.tsx` | Filterable skill list |
| `components/automations/AutomationList.tsx` | Filterable automation list with schedule indicator |
| `components/automations/SkillEditor.tsx` | Name + markdown textarea + save/delete |
| `components/automations/AutomationEditor.tsx` | Full form: script, schedule, inputs |
| `components/automations/RunModal.tsx` | Input collection modal + triggers RunOutput |
| `components/automations/RunOutput.tsx` | Reads SSE stream → live terminal display |
| `components/automations/LogHistory.tsx` | SWR-polled last-10 run entries |

### Modified files
| Path | Change |
|---|---|
| `components/layout/Sidebar.tsx` | Add Automations nav item (Zap icon) with badge |
| `package.json` | Add node-cron, uuid; devDeps: @types/node-cron, @types/uuid |

---

## Task 1: Branch setup + install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Switch to the automations branch**

```bash
git checkout feat/automations-tab
```

Expected: `Switched to branch 'feat/automations-tab'`

- [ ] **Step 2: Install runtime dependencies**

```bash
pnpm add node-cron uuid
pnpm add -D @types/node-cron @types/uuid
```

Expected: `node_modules/` updated, `package.json` shows new entries.

- [ ] **Step 3: Verify install**

```bash
pnpm build 2>&1 | tail -5
```

Expected: build succeeds (or only pre-existing errors, not new ones from missing modules).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add node-cron and uuid dependencies"
```

---

## Task 2: Shared types

**Files:**
- Create: `lib/types/automations.ts`

- [ ] **Step 1: Create the types file**

Create `lib/types/automations.ts`:

```ts
export type Skill = {
  name: string
  description: string
  content: string
  path: string
}

export type InputDef = {
  key: string
  label: string
  type: 'text' | 'vault-file' | 'inbox-item' | 'todo-item'
  required: boolean
}

export type Automation = {
  id: string
  name: string
  description: string
  script: string
  schedule: string | null
  inputs: InputDef[]
  createdAt: string
  updatedAt: string
}

export type RunLog = {
  runId: string
  automationId: string
  startedAt: string
  finishedAt: string
  status: 'ok' | 'error' | 'running'
  inputs: Record<string, string>
  output: string
  exitCode: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no new errors related to `lib/types/automations.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/types/automations.ts
git commit -m "feat: add automations shared types"
```

---

## Task 3: lib/skills.ts + tests

**Files:**
- Create: `lib/skills.ts`
- Create: `lib/skills.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/skills.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
}))

import * as fsp from 'fs/promises'
import { listSkills, getSkill, saveSkill, deleteSkill } from './skills'

beforeEach(() => vi.clearAllMocks())

describe('listSkills', () => {
  it('returns empty array when directory is empty', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue([] as never)
    expect(await listSkills()).toEqual([])
  })

  it('parses skill name and description from frontmatter', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['my-skill.md'] as never)
    vi.mocked(fsp.readFile).mockResolvedValue(
      '---\ndescription: A test skill\n---\n\nBody here' as never
    )
    const result = await listSkills()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('my-skill')
    expect(result[0].description).toBe('A test skill')
  })

  it('ignores non-.md files', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['skill.md', 'readme.txt'] as never)
    vi.mocked(fsp.readFile).mockResolvedValue('# content' as never)
    const result = await listSkills()
    expect(result).toHaveLength(1)
  })
})

describe('saveSkill', () => {
  it('writes to correct path and returns parsed skill', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)
    const skill = await saveSkill('test', '---\ndescription: My skill\n---\nBody')
    expect(fsp.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('test.md'),
      '---\ndescription: My skill\n---\nBody',
      'utf-8'
    )
    expect(skill.name).toBe('test')
    expect(skill.description).toBe('My skill')
  })
})

describe('getSkill', () => {
  it('returns null when file does not exist', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    expect(await getSkill('missing')).toBeNull()
  })

  it('returns parsed skill when file exists', async () => {
    vi.mocked(fsp.readFile).mockResolvedValue('---\ndescription: Exists\n---\nContent' as never)
    const skill = await getSkill('exists')
    expect(skill?.name).toBe('exists')
  })
})

describe('deleteSkill', () => {
  it('calls unlink with correct path', async () => {
    vi.mocked(fsp.unlink).mockResolvedValue(undefined)
    await deleteSkill('test')
    expect(fsp.unlink).toHaveBeenCalledWith(expect.stringContaining('test.md'))
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
pnpm test lib/skills.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './skills'`

- [ ] **Step 3: Implement lib/skills.ts**

Create `lib/skills.ts`:

```ts
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import type { Skill } from './types/automations'

const SKILLS_DIR = path.join(process.env.HOME ?? '', '.claude', 'skills')

function parseSkill(content: string, filePath: string): Skill {
  const name = path.basename(filePath, '.md')
  const match = content.match(/^description:\s*(.+)$/m)
  const description = match?.[1]?.trim() ?? ''
  return { name, description, content, path: filePath }
}

export async function listSkills(): Promise<Skill[]> {
  await mkdir(SKILLS_DIR, { recursive: true })
  const files = await readdir(SKILLS_DIR)
  return Promise.all(
    files
      .filter(f => f.endsWith('.md'))
      .map(async f => {
        const filePath = path.join(SKILLS_DIR, f)
        const content = await readFile(filePath, 'utf-8')
        return parseSkill(content, filePath)
      })
  )
}

export async function getSkill(name: string): Promise<Skill | null> {
  try {
    const filePath = path.join(SKILLS_DIR, `${name}.md`)
    const content = await readFile(filePath, 'utf-8')
    return parseSkill(content, filePath)
  } catch {
    return null
  }
}

export async function saveSkill(name: string, content: string): Promise<Skill> {
  await mkdir(SKILLS_DIR, { recursive: true })
  const filePath = path.join(SKILLS_DIR, `${name}.md`)
  await writeFile(filePath, content, 'utf-8')
  return parseSkill(content, filePath)
}

export async function deleteSkill(name: string): Promise<void> {
  await unlink(path.join(SKILLS_DIR, `${name}.md`))
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
pnpm test lib/skills.test.ts 2>&1 | tail -10
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skills.ts lib/skills.test.ts
git commit -m "feat: lib/skills - CRUD helpers for ~/.claude/skills/"
```

---

## Task 4: lib/automations.ts + tests

**Files:**
- Create: `lib/automations.ts`
- Create: `lib/automations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/automations.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
}))

import * as fsp from 'fs/promises'
import {
  listAutomations,
  getAutomation,
  saveAutomation,
  deleteAutomation,
  appendLog,
  getLogs,
} from './automations'
import type { Automation, RunLog } from './types/automations'

const mockAutomation: Automation = {
  id: 'abc123',
  name: 'Test',
  description: '',
  script: 'echo hi',
  schedule: null,
  inputs: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('listAutomations', () => {
  it('returns empty array when directory has no automation files', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['schedule.json'] as never)
    expect(await listAutomations()).toEqual([])
  })

  it('parses automation JSON files, skips schedule.json', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['abc123.json', 'schedule.json'] as never)
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockAutomation) as never)
    const result = await listAutomations()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('abc123')
  })
})

describe('saveAutomation', () => {
  it('writes prettified JSON to [id].json', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)
    await saveAutomation(mockAutomation)
    expect(fsp.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('abc123.json'),
      expect.stringContaining('"id": "abc123"'),
      'utf-8'
    )
  })
})

describe('getAutomation', () => {
  it('returns null when file does not exist', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
    expect(await getAutomation('missing')).toBeNull()
  })
})

describe('deleteAutomation', () => {
  it('calls unlink with [id].json path', async () => {
    vi.mocked(fsp.unlink).mockResolvedValue(undefined)
    await deleteAutomation('abc123')
    expect(fsp.unlink).toHaveBeenCalledWith(expect.stringContaining('abc123.json'))
  })
})

describe('appendLog', () => {
  it('writes JSONL with new entry when file does not exist', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)

    const log: RunLog = {
      runId: 'r1',
      automationId: 'abc123',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z',
      status: 'ok',
      inputs: {},
      output: 'hello',
      exitCode: 0,
    }
    await appendLog(log)
    expect(fsp.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('abc123.jsonl'),
      expect.stringContaining('"runId":"r1"'),
      'utf-8'
    )
  })
})

describe('getLogs', () => {
  it('returns empty array when log file does not exist', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
    expect(await getLogs('abc123')).toEqual([])
  })

  it('parses JSONL file into array of RunLog', async () => {
    const log: RunLog = {
      runId: 'r1', automationId: 'abc123',
      startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:01:00Z',
      status: 'ok', inputs: {}, output: '', exitCode: 0,
    }
    vi.mocked(fsp.readFile).mockResolvedValue((JSON.stringify(log) + '\n') as never)
    const result = await getLogs('abc123')
    expect(result).toHaveLength(1)
    expect(result[0].runId).toBe('r1')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
pnpm test lib/automations.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './automations'`

- [ ] **Step 3: Implement lib/automations.ts**

Create `lib/automations.ts`:

```ts
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import type { Automation, RunLog } from './types/automations'

const AUTOMATIONS_DIR = path.join(process.env.HOME ?? '', '.claude', 'automations')
const LOGS_DIR = path.join(AUTOMATIONS_DIR, 'logs')

export async function listAutomations(): Promise<Automation[]> {
  await mkdir(AUTOMATIONS_DIR, { recursive: true })
  const files = await readdir(AUTOMATIONS_DIR)
  return Promise.all(
    files
      .filter(f => f.endsWith('.json') && f !== 'schedule.json')
      .map(async f => {
        const content = await readFile(path.join(AUTOMATIONS_DIR, f), 'utf-8')
        return JSON.parse(content) as Automation
      })
  )
}

export async function getAutomation(id: string): Promise<Automation | null> {
  try {
    const content = await readFile(path.join(AUTOMATIONS_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(content) as Automation
  } catch {
    return null
  }
}

export async function saveAutomation(automation: Automation): Promise<void> {
  await mkdir(AUTOMATIONS_DIR, { recursive: true })
  await writeFile(
    path.join(AUTOMATIONS_DIR, `${automation.id}.json`),
    JSON.stringify(automation, null, 2),
    'utf-8'
  )
}

export async function deleteAutomation(id: string): Promise<void> {
  await unlink(path.join(AUTOMATIONS_DIR, `${id}.json`))
}

const MAX_LOG_ENTRIES = 50

export async function appendLog(log: RunLog): Promise<void> {
  await mkdir(LOGS_DIR, { recursive: true })
  const logPath = path.join(LOGS_DIR, `${log.automationId}.jsonl`)
  let existing: RunLog[] = []
  try {
    const content = await readFile(logPath, 'utf-8')
    existing = content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l) as RunLog)
  } catch {
    // file doesn't exist yet
  }
  const trimmed = [...existing.slice(-(MAX_LOG_ENTRIES - 1)), log]
  await writeFile(logPath, trimmed.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf-8')
}

export async function getLogs(automationId: string): Promise<RunLog[]> {
  try {
    const content = await readFile(
      path.join(LOGS_DIR, `${automationId}.jsonl`),
      'utf-8'
    )
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l) as RunLog)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run all tests — confirm they pass**

```bash
pnpm test 2>&1 | tail -15
```

Expected: all tests PASS (including skills tests from Task 3).

- [ ] **Step 5: Commit**

```bash
git add lib/automations.ts lib/automations.test.ts
git commit -m "feat: lib/automations - CRUD helpers + JSONL run logs"
```

---

## Task 5: Cron scheduler + instrumentation

**Files:**
- Create: `lib/automations/scheduler.ts`
- Create: `instrumentation.ts`

- [ ] **Step 1: Create scheduler module**

Create `lib/automations/scheduler.ts`:

```ts
import cron from 'node-cron'
import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { listAutomations, getAutomation, appendLog } from '../automations'

const jobs = new Map<string, cron.ScheduledTask>()

export function scheduleJob(id: string, cronExpr: string): void {
  cancelJob(id)
  const task = cron.schedule(cronExpr, () => { runAutomationCron(id) })
  jobs.set(id, task)
}

export function cancelJob(id: string): void {
  const existing = jobs.get(id)
  if (existing) {
    existing.stop()
    jobs.delete(id)
  }
}

export function hasJob(id: string): boolean {
  return jobs.has(id)
}

export async function initScheduler(): Promise<void> {
  const automations = await listAutomations()
  for (const automation of automations) {
    if (automation.schedule && cron.validate(automation.schedule)) {
      scheduleJob(automation.id, automation.schedule)
    }
  }
}

export async function runAutomationCron(id: string): Promise<void> {
  const automation = await getAutomation(id)
  if (!automation) return

  const runId = uuidv4()
  const startedAt = new Date().toISOString()
  let output = ''

  await new Promise<void>((resolve) => {
    const proc = spawn('bash', ['-c', automation.script], {
      env: { ...process.env as Record<string, string> },
    })
    const timeout = setTimeout(() => proc.kill('SIGTERM'), 60_000)

    proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { output += chunk.toString() })

    proc.on('close', async (exitCode: number | null) => {
      clearTimeout(timeout)
      await appendLog({
        runId,
        automationId: id,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: exitCode === 0 ? 'ok' : 'error',
        inputs: {},
        output,
        exitCode: exitCode ?? -1,
      })
      resolve()
    })
  })
}
```

- [ ] **Step 2: Create instrumentation.ts**

Create `instrumentation.ts` at the project root:

```ts
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduler } = await import('./lib/automations/scheduler')
    await initScheduler()
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "^.*error TS" | head -10
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/automations/scheduler.ts instrumentation.ts
git commit -m "feat: cron scheduler + Next.js instrumentation hook"
```

---

## Task 6: API routes — skills

**Files:**
- Create: `app/api/skills/route.ts`
- Create: `app/api/skills/[name]/route.ts`

- [ ] **Step 1: Create GET + POST route**

Create `app/api/skills/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listSkills, saveSkill } from '@/lib/skills'

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await listSkills())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, content } = (await req.json()) as { name?: string; content?: string }
    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'name and content required' }, { status: 400 })
    }
    const skill = await saveSkill(name.trim(), content)
    return NextResponse.json(skill, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create PUT + DELETE route**

Create `app/api/skills/[name]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { saveSkill, deleteSkill } from '@/lib/skills'

type Params = { params: Promise<{ name: string }> }

export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { name } = await params
    const { content } = (await req.json()) as { content?: string }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }
    const skill = await saveSkill(name, content)
    return NextResponse.json(skill)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { name } = await params
    await deleteSkill(name)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Smoke test — start dev server and curl**

```bash
pnpm dev &
sleep 3
curl -s http://localhost:3000/api/skills | head -5
```

Expected: `[]` or a JSON array of skills.

```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add app/api/skills/
git commit -m "feat: API routes for skills CRUD"
```

---

## Task 7: API routes — automations CRUD

**Files:**
- Create: `app/api/automations/route.ts`
- Create: `app/api/automations/[id]/route.ts`

- [ ] **Step 1: Create GET + POST route**

Create `app/api/automations/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { listAutomations, saveAutomation } from '@/lib/automations'
import { scheduleJob } from '@/lib/automations/scheduler'
import type { Automation } from '@/lib/types/automations'
import { v4 as uuidv4 } from 'uuid'
import cron from 'node-cron'

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await listAutomations())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as Partial<Automation>
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }
    if (body.schedule && !cron.validate(body.schedule)) {
      return NextResponse.json({ error: 'invalid cron expression' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const automation: Automation = {
      id: uuidv4(),
      name: body.name.trim(),
      description: body.description ?? '',
      script: body.script ?? '',
      schedule: body.schedule ?? null,
      inputs: body.inputs ?? [],
      createdAt: now,
      updatedAt: now,
    }
    await saveAutomation(automation)

    if (automation.schedule) {
      scheduleJob(automation.id, automation.schedule)
    }

    return NextResponse.json(automation, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create GET single + PUT + DELETE route**

Create `app/api/automations/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getAutomation, saveAutomation, deleteAutomation } from '@/lib/automations'
import { scheduleJob, cancelJob } from '@/lib/automations/scheduler'
import type { Automation } from '@/lib/types/automations'
import cron from 'node-cron'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    const automation = await getAutomation(id)
    if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(automation)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    const existing = await getAutomation(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = (await req.json()) as Partial<Automation>
    if (body.schedule && !cron.validate(body.schedule)) {
      return NextResponse.json({ error: 'invalid cron expression' }, { status: 400 })
    }

    const updated: Automation = {
      ...existing,
      ...body,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await saveAutomation(updated)

    cancelJob(id)
    if (updated.schedule) {
      scheduleJob(id, updated.schedule)
    }

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    cancelJob(id)
    await deleteAutomation(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/automations/route.ts app/api/automations/[id]/route.ts
git commit -m "feat: API routes for automations CRUD + cron wiring"
```

---

## Task 8: API routes — run (SSE) + logs

**Files:**
- Create: `app/api/automations/[id]/run/route.ts`
- Create: `app/api/automations/[id]/logs/route.ts`

- [ ] **Step 1: Create SSE run route**

Create `app/api/automations/[id]/run/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { getAutomation, appendLog } from '@/lib/automations'
import type { RunLog } from '@/lib/types/automations'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params
  const automation = await getAutomation(id)
  if (!automation) {
    return new Response('Not found', { status: 404 })
  }

  const { inputs = {} } = (await req.json()) as { inputs?: Record<string, string> }

  const runId = uuidv4()
  const startedAt = new Date().toISOString()
  const enc = new TextEncoder()
  let output = ''

  const stream = new ReadableStream({
    start(controller) {
      const env: Record<string, string> = { ...(process.env as Record<string, string>) }
      for (const [key, value] of Object.entries(inputs)) {
        env[`INPUT_${key.toUpperCase()}`] = value
      }

      const proc = spawn('bash', ['-c', automation.script], { env })
      const timeout = setTimeout(() => proc.kill('SIGTERM'), 60_000)

      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        output += text
        send({ type: 'stdout', text })
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        output += text
        send({ type: 'stderr', text })
      })

      proc.on('close', async (exitCode: number | null) => {
        clearTimeout(timeout)
        const log: RunLog = {
          runId,
          automationId: id,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: exitCode === 0 ? 'ok' : 'error',
          inputs,
          output,
          exitCode: exitCode ?? -1,
        }
        await appendLog(log)
        send({ type: 'done', exitCode: exitCode ?? -1 })
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Create logs route**

Create `app/api/automations/[id]/logs/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getLogs } from '@/lib/automations'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    return NextResponse.json(await getLogs(id))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/automations/[id]/run/ app/api/automations/[id]/logs/
git commit -m "feat: automation run SSE endpoint + logs endpoint"
```

---

## Task 9: Components — lists

**Files:**
- Create: `components/automations/SkillList.tsx`
- Create: `components/automations/AutomationList.tsx`

- [ ] **Step 1: Create SkillList**

Create `components/automations/SkillList.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Skill } from '@/lib/types/automations'

interface SkillListProps {
  skills: Skill[]
  selected: Skill | null
  onSelect: (skill: Skill) => void
}

export default function SkillList({ skills, selected, onSelect }: SkillListProps) {
  const [filter, setFilter] = useState('')
  const filtered = skills.filter(
    s =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter skills…"
          className="w-full px-2 py-1 text-xs rounded"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(skill => (
          <button
            key={skill.name}
            type="button"
            onClick={() => onSelect(skill)}
            className="w-full text-left px-3 py-2"
            style={{
              background: selected?.name === skill.name ? 'var(--accent-soft)' : 'transparent',
              borderLeft: `2px solid ${selected?.name === skill.name ? 'var(--accent)' : 'transparent'}`,
              color: 'var(--text)',
            }}
          >
            <div className="text-xs font-medium truncate">{skill.name}</div>
            {skill.description && (
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                {skill.description}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
            No skills found
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create AutomationList**

Create `components/automations/AutomationList.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Automation } from '@/lib/types/automations'

interface AutomationListProps {
  automations: Automation[]
  selected: Automation | null
  onSelect: (automation: Automation) => void
}

export default function AutomationList({ automations, selected, onSelect }: AutomationListProps) {
  const [filter, setFilter] = useState('')
  const filtered = automations.filter(
    a =>
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.description.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter automations…"
          className="w-full px-2 py-1 text-xs rounded"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(automation => (
          <button
            key={automation.id}
            type="button"
            onClick={() => onSelect(automation)}
            className="w-full text-left px-3 py-2"
            style={{
              background: selected?.id === automation.id ? 'var(--accent-soft)' : 'transparent',
              borderLeft: `2px solid ${selected?.id === automation.id ? 'var(--accent)' : 'transparent'}`,
              color: 'var(--text)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium flex-1 truncate">{automation.name}</span>
              {automation.schedule && (
                <span
                  className="text-[10px] px-1 rounded shrink-0 font-mono"
                  style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}
                >
                  ⏰
                </span>
              )}
            </div>
            {automation.description && (
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                {automation.description}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
            No automations found
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/automations/SkillList.tsx components/automations/AutomationList.tsx
git commit -m "feat: SkillList and AutomationList components"
```

---

## Task 10: Components — LogHistory + RunOutput

**Files:**
- Create: `components/automations/LogHistory.tsx`
- Create: `components/automations/RunOutput.tsx`

- [ ] **Step 1: Create LogHistory**

Create `components/automations/LogHistory.tsx`:

```tsx
'use client'

import useSWR from 'swr'
import type { RunLog } from '@/lib/types/automations'

const fetcher = (url: string) => fetch(url).then(r => r.json() as Promise<RunLog[]>)

interface LogHistoryProps {
  automationId: string
}

export default function LogHistory({ automationId }: LogHistoryProps) {
  const { data: logs } = useSWR<RunLog[]>(
    `/api/automations/${automationId}/logs`,
    fetcher,
    { refreshInterval: 5000 }
  )

  if (!logs?.length) {
    return (
      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
        No runs yet
      </p>
    )
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-3)' }}>
        Last runs
      </p>
      <div className="flex flex-col gap-1">
        {[...logs]
          .reverse()
          .slice(0, 10)
          .map(log => (
            <div key={log.runId} className="flex items-center gap-2 text-[11px]">
              <span style={{ color: log.status === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                {log.status === 'ok' ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-2)' }}>
                {new Date(log.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: 10 }}>exit {log.exitCode}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RunOutput**

Create `components/automations/RunOutput.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface RunOutputProps {
  automationId: string
  inputs: Record<string, string>
  onComplete: (exitCode: number) => void
}

type OutputLine = { type: 'stdout' | 'stderr'; text: string }

export default function RunOutput({ automationId, inputs, onComplete }: RunOutputProps) {
  const [lines, setLines] = useState<OutputLine[]>([])
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/automations/${automationId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.body) return
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          buffer += decoder.decode(value, { stream: true })

          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''

          for (const event of events) {
            const dataLine = event.split('\n').find(l => l.startsWith('data: '))
            if (!dataLine) continue
            try {
              const parsed = JSON.parse(dataLine.slice(6)) as {
                type: string
                text?: string
                exitCode?: number
              }
              if (parsed.type === 'stdout' || parsed.type === 'stderr') {
                setLines(prev => [
                  ...prev,
                  { type: parsed.type as 'stdout' | 'stderr', text: parsed.text ?? '' },
                ])
              } else if (parsed.type === 'done') {
                setDone(true)
                onComplete(parsed.exitCode ?? -1)
              }
            } catch {
              // malformed event, skip
            }
          }
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [automationId, inputs, onComplete])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div
      className="font-mono text-xs p-3 rounded overflow-auto max-h-64"
      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
    >
      {lines.length === 0 && !done && (
        <span style={{ color: 'var(--text-3)' }}>Starting…</span>
      )}
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            color: line.type === 'stderr' ? 'var(--red)' : 'var(--green)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {line.text}
        </div>
      ))}
      {!done && lines.length > 0 && (
        <span className="animate-pulse" style={{ color: 'var(--text-3)' }}>▊</span>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/automations/LogHistory.tsx components/automations/RunOutput.tsx
git commit -m "feat: LogHistory (SWR poll) and RunOutput (SSE stream) components"
```

---

## Task 11: Components — editors

**Files:**
- Create: `components/automations/SkillEditor.tsx`
- Create: `components/automations/AutomationEditor.tsx`

- [ ] **Step 1: Create SkillEditor**

Create `components/automations/SkillEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Skill } from '@/lib/types/automations'

interface SkillEditorProps {
  skill: Skill | null
  onSave: (skill: Skill) => void
  onDelete: (name: string) => void
}

export default function SkillEditor({ skill, onSave, onDelete }: SkillEditorProps) {
  const isNew = skill === null
  const [name, setName] = useState(skill?.name ?? '')
  const [content, setContent] = useState(skill?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        isNew ? '/api/skills' : `/api/skills/${skill!.name}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isNew ? { name, content } : { content }),
        }
      )
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Save failed')
      onSave(await res.json() as Skill)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!skill) return
    const res = await fetch(`/api/skills/${skill.name}`, { method: 'DELETE' })
    if (res.ok) onDelete(skill.name)
  }

  const inputStyle = {
    width: '100%',
    padding: '5px 8px',
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    color: 'var(--text)',
  } as const

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {isNew ? (
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
            Name (slug)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="my-skill"
            style={inputStyle}
          />
        </div>
      ) : (
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {skill.name}
        </p>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
          Content (Markdown)
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="flex-1 p-2 font-mono text-xs resize-none rounded"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            minHeight: 200,
          }}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--red)' }}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim() || !content.trim()}
          className="ml-auto px-4 py-1.5 text-xs rounded text-white"
          style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create AutomationEditor**

Create `components/automations/AutomationEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Automation, InputDef } from '@/lib/types/automations'
import LogHistory from './LogHistory'

interface AutomationEditorProps {
  automation: Automation | null
  onSave: (automation: Automation) => void
  onDelete: (id: string) => void
  onRun: (automation: Automation) => void
}

const CRON_PRESETS: Record<string, string> = {
  '0 9 * * 1-5': 'weekdays at 09:00',
  '0 * * * *': 'every hour',
  '*/5 * * * *': 'every 5 minutes',
  '0 0 * * *': 'daily at midnight',
  '0 9 * * 1': 'every Monday at 09:00',
}

function cronHint(expr: string): string {
  return CRON_PRESETS[expr.trim()] ?? ''
}

export default function AutomationEditor({
  automation,
  onSave,
  onDelete,
  onRun,
}: AutomationEditorProps) {
  const isNew = automation === null
  const [name, setName] = useState(automation?.name ?? '')
  const [description, setDescription] = useState(automation?.description ?? '')
  const [script, setScript] = useState(automation?.script ?? '#!/bin/bash\n\n')
  const [schedule, setSchedule] = useState(automation?.schedule ?? '')
  const [inputs, setInputs] = useState<InputDef[]>(automation?.inputs ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body: Partial<Automation> = {
        name,
        description,
        script,
        schedule: schedule.trim() || null,
        inputs,
      }
      const url = isNew ? '/api/automations' : `/api/automations/${automation!.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Save failed')
      onSave(await res.json() as Automation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!automation) return
    await fetch(`/api/automations/${automation.id}`, { method: 'DELETE' })
    onDelete(automation.id)
  }

  function addInput() {
    setInputs(prev => [
      ...prev,
      { key: `input_${prev.length + 1}`, label: '', type: 'text', required: false },
    ])
  }

  function updateInput(i: number, patch: Partial<InputDef>) {
    setInputs(prev => prev.map((inp, idx) => (idx === i ? { ...inp, ...patch } : inp)))
  }

  const hint = cronHint(schedule)

  const inputBase = {
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
  } as const

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded"
            style={inputBase}
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded"
            style={inputBase}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Script (bash)</label>
        <textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          rows={8}
          className="w-full p-2 font-mono text-xs rounded resize-y"
          style={inputBase}
        />
      </div>

      <div>
        <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
          Schedule (cron)
          {hint && (
            <span className="ml-2 text-[10px]" style={{ color: 'var(--accent)' }}>
              = {hint}
            </span>
          )}
        </label>
        <input
          value={schedule}
          onChange={e => setSchedule(e.target.value)}
          placeholder="0 9 * * 1-5  (leave empty for manual only)"
          className="w-full px-2 py-1.5 text-xs font-mono rounded"
          style={inputBase}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px]" style={{ color: 'var(--text-3)' }}>Inputs</label>
          <button
            type="button"
            onClick={addInput}
            className="text-[11px]"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + Add
          </button>
        </div>
        {inputs.map((inp, i) => (
          <div key={i} className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '1fr 1fr auto auto' }}>
            <input
              value={inp.label}
              onChange={e => updateInput(i, { label: e.target.value })}
              placeholder="Label"
              className="px-2 py-1 text-xs rounded"
              style={inputBase}
            />
            <select
              value={inp.type}
              onChange={e => updateInput(i, { type: e.target.value as InputDef['type'] })}
              className="px-2 py-1 text-xs rounded"
              style={inputBase}
            >
              <option value="text">Text</option>
              <option value="vault-file">Vault file</option>
              <option value="inbox-item">Inbox item</option>
              <option value="todo-item">Todo item</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
              <input
                type="checkbox"
                checked={inp.required}
                onChange={e => updateInput(i, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => setInputs(prev => prev.filter((_, idx) => idx !== i))}
              style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {!isNew && <LogHistory automationId={automation!.id} />}

      {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}

      <div className="flex gap-2 mt-auto pt-2">
        {!isNew && (
          <>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--red)' }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => onRun(automation!)}
              className="px-4 py-1.5 text-xs rounded text-white"
              style={{ background: 'var(--accent)' }}
            >
              ▶ Run
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="ml-auto px-4 py-1.5 text-xs rounded text-white"
          style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/automations/SkillEditor.tsx components/automations/AutomationEditor.tsx
git commit -m "feat: SkillEditor and AutomationEditor components"
```

---

## Task 12: Components — RunModal

**Files:**
- Create: `components/automations/RunModal.tsx`

- [ ] **Step 1: Create RunModal**

Create `components/automations/RunModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Automation } from '@/lib/types/automations'
import RunOutput from './RunOutput'

interface RunModalProps {
  automation: Automation
  onClose: () => void
}

export default function RunModal({ automation, onClose }: RunModalProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)

  const missingRequired = automation.inputs
    .filter(i => i.required && !inputValues[i.key]?.trim())
    .map(i => i.key)

  const canRun = missingRequired.length === 0

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Run ${automation.name}`}
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', paddingTop: '14vh' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-[480px] max-w-[90vw] rounded-lg p-6 flex flex-col gap-4"
        style={{ background: 'var(--panel)', border: '1px solid var(--border-strong)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          ▶ Run: {automation.name}
        </h2>

        {!running &&
          automation.inputs.map(input => (
            <div key={input.key}>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
                {input.label || input.key}
                {input.required && <span style={{ color: 'var(--red)' }}> *</span>}
              </label>
              <input
                type="text"
                value={inputValues[input.key] ?? ''}
                onChange={e =>
                  setInputValues(prev => ({ ...prev, [input.key]: e.target.value }))
                }
                className="w-full px-2 py-1.5 text-xs rounded"
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
          ))}

        {running && (
          <RunOutput
            automationId={automation.id}
            inputs={inputValues}
            onComplete={code => setExitCode(code)}
          />
        )}

        {exitCode !== null && (
          <p
            className="text-xs"
            style={{ color: exitCode === 0 ? 'var(--green)' : 'var(--red)' }}
          >
            {exitCode === 0 ? '✓ Completed successfully' : `✗ Exited with code ${exitCode}`}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            {exitCode !== null ? 'Close' : 'Cancel'}
          </button>
          {!running && (
            <button
              type="button"
              onClick={() => setRunning(true)}
              disabled={!canRun}
              className="px-4 py-1.5 text-xs rounded text-white"
              style={{ background: 'var(--accent)', opacity: canRun ? 1 : 0.4 }}
              aria-disabled={!canRun}
            >
              ▶ Run
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/automations/RunModal.tsx
git commit -m "feat: RunModal component - input collection + live output"
```

---

## Task 13: AutomationsPage + route page

**Files:**
- Create: `components/automations/AutomationsPage.tsx`
- Create: `app/dashboard/automations/page.tsx`

- [ ] **Step 1: Create AutomationsPage (client root)**

Create `components/automations/AutomationsPage.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Skill, Automation } from '@/lib/types/automations'
import SkillList from './SkillList'
import AutomationList from './AutomationList'
import SkillEditor from './SkillEditor'
import AutomationEditor from './AutomationEditor'
import RunModal from './RunModal'

type Tab = 'skills' | 'automations'

interface AutomationsPageProps {
  initialSkills: Skill[]
  initialAutomations: Automation[]
}

export default function AutomationsPage({
  initialSkills,
  initialAutomations,
}: AutomationsPageProps) {
  const [tab, setTab] = useState<Tab>('skills')
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [runTarget, setRunTarget] = useState<Automation | null>(null)

  function handleNewClick() {
    setCreatingNew(true)
    setSelectedSkill(null)
    setSelectedAutomation(null)
  }

  function handleSkillSave(saved: Skill) {
    setSkills(prev => {
      const idx = prev.findIndex(s => s.name === saved.name)
      return idx >= 0 ? prev.map(s => (s.name === saved.name ? saved : s)) : [...prev, saved]
    })
    setSelectedSkill(saved)
    setCreatingNew(false)
  }

  function handleAutomationSave(saved: Automation) {
    setAutomations(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      return idx >= 0 ? prev.map(a => (a.id === saved.id ? saved : a)) : [...prev, saved]
    })
    setSelectedAutomation(saved)
    setCreatingNew(false)
  }

  const showDetail = selectedSkill !== null || selectedAutomation !== null || creatingNew

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {(['skills', 'automations'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setCreatingNew(false) }}
            className="px-3 py-1 text-xs rounded capitalize"
            style={{
              background: tab === t ? 'var(--accent-soft)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-2)',
              fontWeight: tab === t ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={handleNewClick}
          className="ml-auto px-3 py-1 text-xs rounded text-white"
          style={{ background: 'var(--accent)', border: 'none', cursor: 'pointer' }}
        >
          + New
        </button>
      </div>

      {/* 2-col body */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div
          className="w-[280px] shrink-0 overflow-hidden"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          {tab === 'skills' ? (
            <SkillList
              skills={skills}
              selected={selectedSkill}
              onSelect={s => { setSelectedSkill(s); setCreatingNew(false) }}
            />
          ) : (
            <AutomationList
              automations={automations}
              selected={selectedAutomation}
              onSelect={a => { setSelectedAutomation(a); setCreatingNew(false) }}
            />
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden">
          {showDetail ? (
            tab === 'skills' ? (
              <SkillEditor
                skill={creatingNew ? null : selectedSkill}
                onSave={handleSkillSave}
                onDelete={name => {
                  setSkills(prev => prev.filter(s => s.name !== name))
                  setSelectedSkill(null)
                }}
              />
            ) : (
              <AutomationEditor
                automation={creatingNew ? null : selectedAutomation}
                onSave={handleAutomationSave}
                onDelete={id => {
                  setAutomations(prev => prev.filter(a => a.id !== id))
                  setSelectedAutomation(null)
                }}
                onRun={a => setRunTarget(a)}
              />
            )
          ) : (
            <div
              className="flex items-center justify-center h-full text-xs"
              style={{ color: 'var(--text-3)' }}
            >
              Select {tab === 'skills' ? 'a skill' : 'an automation'} or click + New
            </div>
          )}
        </div>
      </div>

      {runTarget && (
        <RunModal automation={runTarget} onClose={() => setRunTarget(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create page.tsx server component**

Create `app/dashboard/automations/page.tsx`:

```tsx
import { listSkills } from '@/lib/skills'
import { listAutomations } from '@/lib/automations'
import AutomationsPage from '@/components/automations/AutomationsPage'

export default async function AutomationsRoute() {
  const [skills, automations] = await Promise.all([
    listSkills().catch(() => []),
    listAutomations().catch(() => []),
  ])
  return <AutomationsPage initialSkills={skills} initialAutomations={automations} />
}
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/automations/AutomationsPage.tsx app/dashboard/automations/page.tsx
git commit -m "feat: AutomationsPage client root + server page route"
```

---

## Task 14: Sidebar — add Automations nav item

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Add Zap import and Automations nav item**

In `components/layout/Sidebar.tsx`, find the imports block:

```ts
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  BookOpen,
  FolderKanban,
  FlaskConical,
  Calendar,
  Settings,
  Plus,
} from "lucide-react";
```

Replace with:

```ts
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  BookOpen,
  FolderKanban,
  FlaskConical,
  Zap,
  Calendar,
  Settings,
  Plus,
} from "lucide-react";
```

- [ ] **Step 2: Add Automations to navItems**

Find the `navItems` array. It currently ends with:

```ts
  { icon: FlaskConical, label: "Research" },
  { icon: Calendar, label: "Calendar" },
```

Change to:

```ts
  { icon: FlaskConical, label: "Research" },
  { icon: Zap, label: "Automations" },
  { icon: Calendar, label: "Calendar" },
```

- [ ] **Step 3: Verify dev server renders sidebar correctly**

```bash
pnpm dev &
sleep 3
```

Open `http://localhost:3000` in browser. Confirm "Automations" appears between Research and Calendar in the sidebar with the ⚡ icon.

Navigate to `http://localhost:3000/dashboard/automations` — confirm the page loads (Skills/Automations tabs, + New button visible).

```bash
kill %1
```

- [ ] **Step 4: Run full test suite + lint**

```bash
pnpm test 2>&1 | tail -10
pnpm lint 2>&1 | tail -10
```

Expected: tests pass, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add Automations nav item to sidebar"
```

---

## Task 15: End-to-end smoke test

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Create a skill**

1. Navigate to `http://localhost:3000/dashboard/automations`
2. Click **+ New** while on the Skills tab
3. Enter name `test-skill`, content `---\ndescription: My first skill\n---\n\n# Test\nHello`
4. Click Save
5. Confirm skill appears in the list with description "My first skill"

- [ ] **Step 3: Create and run an automation**

1. Switch to **Automations** tab, click **+ New**
2. Name: `echo-test`, Script: `echo "Hello from automation"`
3. Click Save
4. Click **▶ Run**
5. In RunModal, click **▶ Run** (no inputs required)
6. Confirm green output: `Hello from automation`
7. Confirm status `✓ Completed successfully`

- [ ] **Step 4: Check log history**

1. Open the `echo-test` automation
2. Scroll to **Last runs** — confirm one `✓` entry

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: automations tab complete - smoke test passed"
```
