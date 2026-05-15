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
