export type GraphNode = {
  id: string
  label: string
  folder: string
  linkCount: number // outgoing wikilinks to existing vault files
}

export type GraphLink = {
  source: string
  target: string
}

export type GraphData = {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function extractWikilinks(markdown: string): string[] {
  const matches = [...markdown.matchAll(/\[\[([^\]\n]+)\]\]/g)]
  return matches.map(m => {
    const raw = m[1]
    return raw.includes('|') ? raw.split('|')[0].trim() : raw.trim()
  })
}

export function getParaFolder(relativePath: string): string {
  return relativePath.split('/')[0] ?? relativePath
}

export function buildGraphData(
  files: { path: string; content: string }[]
): GraphData {
  const pathByName = new Map<string, string>()
  for (const { path } of files) {
    const name = path.split('/').pop()?.replace(/\.md$/, '') ?? ''
    pathByName.set(name.toLowerCase(), path)
  }

  const linkCountMap = new Map<string, number>(files.map(f => [f.path, 0]))
  const links: GraphLink[] = []

  for (const { path, content } of files) {
    const names = extractWikilinks(content)
    let count = 0
    for (const name of names) {
      const targetPath = pathByName.get(name.toLowerCase())
      if (targetPath && targetPath !== path) {
        links.push({ source: path, target: targetPath })
        count++
      }
    }
    linkCountMap.set(path, count)
  }

  const nodes: GraphNode[] = files.map(({ path }) => ({
    id: path,
    label: path.split('/').pop()?.replace(/\.md$/, '') ?? path,
    folder: getParaFolder(path),
    linkCount: linkCountMap.get(path) ?? 0,
  }))

  return { nodes, links }
}
