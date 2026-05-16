// Client-only helper — persists preferences to localStorage and applies to documentElement

export type Accent = "blue" | "green" | "amber"
export type Density = "compact" | "cozy"

const ACCENT_KEY = "accent"
const DENSITY_KEY = "density"

const DEFAULT_ACCENT: Accent = "blue"
const DEFAULT_DENSITY: Density = "compact"

export function getAccent(): Accent {
  if (typeof window === "undefined") return DEFAULT_ACCENT
  const stored = localStorage.getItem(ACCENT_KEY)
  if (stored === "blue" || stored === "green" || stored === "amber") return stored
  return DEFAULT_ACCENT
}

export function setAccent(accent: Accent): void {
  localStorage.setItem(ACCENT_KEY, accent)
  document.documentElement.dataset.accent = accent
}

export function getDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY
  const stored = localStorage.getItem(DENSITY_KEY)
  if (stored === "compact" || stored === "cozy") return stored
  return DEFAULT_DENSITY
}

export function setDensity(density: Density): void {
  localStorage.setItem(DENSITY_KEY, density)
  document.documentElement.dataset.density = density
}

/** Apply all stored preferences to documentElement (call on mount) */
export function applyStoredPreferences(): void {
  document.documentElement.dataset.accent = getAccent()
  document.documentElement.dataset.density = getDensity()
}
