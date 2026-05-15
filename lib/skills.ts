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
