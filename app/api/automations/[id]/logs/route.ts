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
