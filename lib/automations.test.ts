import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
}))

import * as fsp from 'fs/promises'
import {
  listAutomations,
  getAutomation,
  saveAutomation,
  deleteAutomation,
  appendLog,
  getLogs,
} from './automations'
import type { Automation, RunLog } from './types/automations'

type ReaddirResult = Awaited<ReturnType<typeof fsp.readdir>>
type ReadFileResult = Awaited<ReturnType<typeof fsp.readFile>>

const mockAutomation: Automation = {
  id: 'abc123',
  name: 'Test',
  description: '',
  script: 'echo hi',
  schedule: null,
  inputs: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('listAutomations', () => {
  it('returns empty array when directory has no automation files', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['schedule.json'] as unknown as ReaddirResult)
    expect(await listAutomations()).toEqual([])
  })

  it('parses automation JSON files, skips schedule.json', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readdir).mockResolvedValue(['abc123.json', 'schedule.json'] as unknown as ReaddirResult)
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockAutomation) as unknown as ReadFileResult)
    const result = await listAutomations()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('abc123')
  })
})

describe('saveAutomation', () => {
  it('writes prettified JSON to [id].json', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)
    await saveAutomation(mockAutomation)
    expect(fsp.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('abc123.json'),
      expect.stringContaining('"id": "abc123"'),
      'utf-8'
    )
  })
})

describe('getAutomation', () => {
  it('returns null when file does not exist', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    expect(await getAutomation('missing')).toBeNull()
  })

  it('returns parsed automation when file exists', async () => {
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockAutomation) as unknown as ReadFileResult)
    const result = await getAutomation('abc123')
    expect(result?.id).toBe('abc123')
  })

  it('rethrows non-ENOENT errors', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }))
    await expect(getAutomation('test')).rejects.toThrow('EACCES')
  })
})

describe('deleteAutomation', () => {
  it('calls unlink with [id].json path', async () => {
    vi.mocked(fsp.unlink).mockResolvedValue(undefined)
    await deleteAutomation('abc123')
    expect(fsp.unlink).toHaveBeenCalledWith(expect.stringContaining('abc123.json'))
  })
})

describe('appendLog', () => {
  it('writes JSONL with new entry when file does not exist', async () => {
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
    vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined)

    const log: RunLog = {
      runId: 'r1',
      automationId: 'abc123',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z',
      status: 'ok',
      inputs: {},
      output: 'hello',
      exitCode: 0,
    }
    await appendLog(log)
    expect(fsp.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('abc123.jsonl'),
      expect.stringContaining('"runId":"r1"'),
      'utf-8'
    )
  })
})

describe('getLogs', () => {
  it('returns empty array when log file does not exist', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    expect(await getLogs('abc123')).toEqual([])
  })

  it('parses JSONL file into array of RunLog', async () => {
    const log: RunLog = {
      runId: 'r1', automationId: 'abc123',
      startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:01:00Z',
      status: 'ok', inputs: {}, output: '', exitCode: 0,
    }
    vi.mocked(fsp.readFile).mockResolvedValue((JSON.stringify(log) + '\n') as unknown as ReadFileResult)
    const result = await getLogs('abc123')
    expect(result).toHaveLength(1)
    expect(result[0].runId).toBe('r1')
  })
})
