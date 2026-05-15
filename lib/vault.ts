import fs from "node:fs"
import path from "node:path"

export function getVaultPath(): string {
  const vaultPath = process.env.VAULT_PATH
  if (!vaultPath) throw new Error("VAULT_PATH not set in environment")
  return vaultPath
}

export function vaultExists(vaultPath: string): boolean {
  try {
    return fs.statSync(vaultPath).isDirectory()
  } catch {
    return false
  }
}

export function readVaultFile(vaultPath: string, relativePath: string): string {
  return fs.readFileSync(resolveVaultPath(vaultPath, relativePath), "utf-8")
}

export function listVaultDir(vaultPath: string, relativePath: string): string[] {
  return fs.readdirSync(resolveVaultPath(vaultPath, relativePath))
}

export function statVaultFile(
  vaultPath: string,
  relativePath: string,
): fs.Stats {
  return fs.statSync(resolveVaultPath(vaultPath, relativePath))
}

export function joinVaultPath(vaultPath: string, ...parts: string[]): string {
  return path.join(vaultPath, ...parts)
}

export function writeVaultFile(
  vaultPath: string,
  relativePath: string,
  content: string,
): void {
  const fullPath = resolveVaultPath(vaultPath, relativePath)
  const tempPath = `${fullPath}.${process.pid}.${Date.now()}.tmp`

  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(tempPath, content, "utf-8")
  fs.renameSync(tempPath, fullPath)
}

export function deleteVaultFile(
  vaultPath: string,
  relativePath: string,
): void {
  fs.rmSync(resolveVaultPath(vaultPath, relativePath))
}

export function appendToVaultFile(
  vaultPath: string,
  relativePath: string,
  line: string,
): void {
  const fullPath = resolveVaultPath(vaultPath, relativePath)
  const current = fs.existsSync(fullPath)
    ? fs.readFileSync(fullPath, "utf-8")
    : ""
  const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : ""

  writeVaultFile(vaultPath, relativePath, `${current}${prefix}${line}\n`)
}

function resolveVaultPath(vaultPath: string, relativePath: string): string {
  const root = path.resolve(vaultPath)
  const fullPath = path.resolve(root, relativePath)

  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid vault path")
  }

  return fullPath
}
