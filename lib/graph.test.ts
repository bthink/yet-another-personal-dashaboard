import { describe, it, expect } from 'vitest'
import { extractWikilinks, buildGraphData, getParaFolder } from './graph'

describe('extractWikilinks', () => {
  it('extracts simple wikilinks', () => {
    expect(extractWikilinks('See [[React]] and [[Next.js]]')).toEqual(['React', 'Next.js'])
  })

  it('strips aliases', () => {
    expect(extractWikilinks('See [[React|the library]]')).toEqual(['React'])
  })

  it('returns empty array when no wikilinks', () => {
    expect(extractWikilinks('No links here')).toEqual([])
  })

  it('handles wikilinks with spaces', () => {
    expect(extractWikilinks('See [[My Note]]')).toEqual(['My Note'])
  })
})

describe('getParaFolder', () => {
  it('returns first path segment', () => {
    expect(getParaFolder('03_Knowledge/IT/React.md')).toBe('03_Knowledge')
  })

  it('returns filename for root-level files', () => {
    expect(getParaFolder('README.md')).toBe('README.md')
  })
})

describe('buildGraphData', () => {
  it('creates nodes for all files', () => {
    const files = [
      { path: '03_Knowledge/React.md', content: '# React' },
      { path: '03_Knowledge/Next.js.md', content: 'See [[React]]' },
    ]
    const { nodes } = buildGraphData(files)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).toBe('03_Knowledge/React.md')
    expect(nodes[0].label).toBe('React')
    expect(nodes[0].folder).toBe('03_Knowledge')
  })

  it('creates links for resolved wikilinks', () => {
    const files = [
      { path: '03_Knowledge/React.md', content: '# React' },
      { path: '03_Knowledge/Next.js.md', content: 'See [[React]]' },
    ]
    const { links } = buildGraphData(files)
    expect(links).toHaveLength(1)
    expect(links[0].source).toBe('03_Knowledge/Next.js.md')
    expect(links[0].target).toBe('03_Knowledge/React.md')
  })

  it('ignores wikilinks to non-existent files', () => {
    const files = [
      { path: '03_Knowledge/React.md', content: 'See [[NonExistent]]' },
    ]
    const { links } = buildGraphData(files)
    expect(links).toHaveLength(0)
  })

  it('counts linkCount as outgoing links to existing files', () => {
    const files = [
      { path: 'a.md', content: '' },
      { path: 'b.md', content: '[[a]]' },
      { path: 'c.md', content: '[[a]] [[b]]' },
    ]
    const { nodes } = buildGraphData(files)
    const c = nodes.find(n => n.id === 'c.md')!
    expect(c.linkCount).toBe(2)
  })

  it('resolves wikilinks case-insensitively', () => {
    const files = [
      { path: 'notes/React.md', content: '' },
      { path: 'notes/Index.md', content: '[[react]]' },
    ]
    const { links } = buildGraphData(files)
    expect(links).toHaveLength(1)
  })

  it('excludes self-links', () => {
    const files = [{ path: 'a.md', content: '[[a]]' }]
    const { links } = buildGraphData(files)
    expect(links).toHaveLength(0)
  })
})
