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
      const env: Record<string, string> = {}
      for (const [k, v] of Object.entries(process.env)) {
        if (v !== undefined) env[k] = v
      }
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

      proc.on('error', (err) => {
        clearTimeout(timeout)
        send({ type: 'stderr', text: err.message })
        send({ type: 'done', exitCode: -1 })
        controller.close()
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
        try {
          await appendLog(log)
        } catch (err) {
          console.error('Failed to write run log:', err)
        }
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
