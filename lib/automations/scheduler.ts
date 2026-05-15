import cron from 'node-cron'
import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { listAutomations, getAutomation, appendLog } from '../automations'

const jobs = new Map<string, cron.ScheduledTask>()

export function scheduleJob(id: string, cronExpr: string): void {
  cancelJob(id)
  const task = cron.schedule(cronExpr, () => { void runAutomationCron(id).catch(console.error) })
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

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('bash', ['-c', automation.script], {
      env: { ...process.env },
    })
    const timeout = setTimeout(() => proc.kill('SIGTERM'), 60_000)

    proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { output += chunk.toString() })

    proc.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    proc.on('close', async (exitCode: number | null) => {
      clearTimeout(timeout)
      try {
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
      } catch (err) {
        console.error('Failed to write run log:', err)
      }
      resolve()
    })
  })
}
