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
