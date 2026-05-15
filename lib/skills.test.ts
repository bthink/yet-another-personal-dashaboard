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

type ReaddirResult = Awaited<ReturnType<typeof fsp.readdir>>
type ReadFileResult = Awaited<ReturnType<typeof fsp.readFile>>

beforeEach(() => vi.clearAllMocks())

describe('listSkills', () => {
  it('returns empty array when directory is empty', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue([] as unknown as ReaddirResult)
    expect(await listSkills()).toEqual([])
  })

  it('parses skill name and description from frontmatter', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['my-skill.md'] as unknown as ReaddirResult)
    vi.mocked(fsp.readFile).mockResolvedValue(
      '---\ndescription: A test skill\n---\n\nBody here' as unknown as ReadFileResult
    )
    const result = await listSkills()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('my-skill')
    expect(result[0].description).toBe('A test skill')
  })

  it('ignores non-.md files', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['skill.md', 'readme.txt'] as unknown as ReaddirResult)
    vi.mocked(fsp.readFile).mockResolvedValue('# content' as unknown as ReadFileResult)
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
    vi.mocked(fsp.readFile).mockResolvedValue('---\ndescription: Exists\n---\nContent' as unknown as ReadFileResult)
    const skill = await getSkill('exists')
    expect(skill?.name).toBe('exists')
  })

  it('rethrows non-ENOENT errors', async () => {
    const permError = Object.assign(new Error('EACCES'), { code: 'EACCES' })
    vi.mocked(fsp.readFile).mockRejectedValue(permError)
    await expect(getSkill('test')).rejects.toThrow('EACCES')
  })
})

describe('deleteSkill', () => {
  it('calls unlink with correct path', async () => {
    vi.mocked(fsp.unlink).mockResolvedValue(undefined)
    await deleteSkill('test')
    expect(fsp.unlink).toHaveBeenCalledWith(expect.stringContaining('test.md'))
  })

  it('throws when file does not exist', async () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    vi.mocked(fsp.unlink).mockRejectedValue(err)
    await expect(deleteSkill('missing')).rejects.toThrow('ENOENT')
  })
})
