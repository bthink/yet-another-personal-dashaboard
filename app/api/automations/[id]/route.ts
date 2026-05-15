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
