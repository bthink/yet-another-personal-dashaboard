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
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
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
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
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
