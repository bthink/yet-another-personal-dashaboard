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
  return fs.readFileSync(path.join(vaultPath, relativePath), "utf-8")
}

export function listVaultDir(vaultPath: string, relativePath: string): string[] {
  return fs.readdirSync(path.join(vaultPath, relativePath))
}

export function statVaultFile(
  vaultPath: string,
  relativePath: string,
): fs.Stats {
  return fs.statSync(path.join(vaultPath, relativePath))
}

export function joinVaultPath(vaultPath: string, ...parts: string[]): string {
  return path.join(vaultPath, ...parts)
}
