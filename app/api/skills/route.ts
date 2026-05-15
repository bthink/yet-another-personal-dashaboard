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
