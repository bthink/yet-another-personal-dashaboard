'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/layout/ThemeProvider'
import {
  type Accent,
  type Density,
  getAccent,
  setAccent,
  getDensity,
  setDensity,
  applyStoredPreferences,
} from '@/lib/preferences'

interface HealthData {
  ok: boolean
  vaultName?: string
  inboxCount?: number
  error?: string
}

const ACCENT_OPTIONS: { value: Accent; label: string; color: string }[] = [
  { value: 'blue',  label: 'Blue',  color: 'oklch(0.52 0.17 260)' },
  { value: 'green', label: 'Green', color: 'oklch(0.55 0.13 155)' },
  { value: 'amber', label: 'Amber', color: 'oklch(0.62 0.14 70)' },
]

const AI_MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Sonnet', description: 'faster, cheaper' },
  { value: 'claude-opus-4-5',   label: 'Opus',   description: 'smarter' },
]

const sectionStyle: React.CSSProperties = {
  marginBottom: '32px',
  paddingBottom: '32px',
  borderBottom: '1px solid var(--border)',
}

const sectionLastStyle: React.CSSProperties = {
  marginBottom: '32px',
}

const headingStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-2)',
  marginBottom: '6px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
}

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
}

const valueStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono, monospace)',
  background: 'var(--panel-2, var(--muted))',
  padding: '3px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
}

const noteStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-3, var(--muted-foreground))',
  marginTop: '4px',
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          style={{
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid',
            borderColor: value === opt.value ? 'var(--accent)' : 'var(--border)',
            background: value === opt.value ? 'var(--accent-soft, var(--accent))' : 'transparent',
            color: value === opt.value ? 'var(--accent)' : 'var(--text-2)',
            cursor: 'pointer',
            fontWeight: value === opt.value ? 600 : 400,
            transition: 'all 0.12s ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage(): React.ReactElement {
  const { theme, toggleTheme } = useTheme()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [accent, setAccentState] = useState<Accent>('blue')
  const [density, setDensityState] = useState<Density>('compact')
  const [aiModel, setAiModelState] = useState<string>('claude-sonnet-4-6')

  useEffect(() => {
    applyStoredPreferences()
    setAccentState(getAccent())
    setDensityState(getDensity())

    const storedModel = localStorage.getItem('ai-model')
    if (storedModel) setAiModelState(storedModel)

    fetch('/api/vault/health')
      .then((r) => r.json())
      .then((data: HealthData) => setHealth(data))
      .catch(() => setHealth({ ok: false, error: 'Failed to reach API' }))
  }, [])

  function handleAccentChange(value: Accent): void {
    setAccent(value)
    setAccentState(value)
  }

  function handleDensityChange(value: Density): void {
    setDensity(value)
    setDensityState(value)
  }

  function handleModelChange(value: string): void {
    localStorage.setItem('ai-model', value)
    setAiModelState(value)
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
      <div style={{ maxWidth: '640px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-3, var(--muted-foreground))', marginBottom: '32px' }}>
          Vault, appearance, and model preferences.
        </p>

        {/* Vault section */}
        <section aria-labelledby="vault-heading" style={sectionStyle}>
          <h2 id="vault-heading" style={headingStyle}>Vault</h2>
          <div style={rowStyle}>
            <div style={fieldRowStyle}>
              <div>
                <p style={labelStyle}>Vault name</p>
                <p style={valueStyle}>
                  {health === null
                    ? 'Loading…'
                    : health.ok && health.vaultName
                    ? health.vaultName
                    : '—'}
                </p>
                <p style={noteStyle}>(configured via VAULT_PATH in .env.local)</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {health === null ? (
                  <span style={{ ...noteStyle, margin: 0 }}>checking…</span>
                ) : health.ok ? (
                  <>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--success, oklch(0.62 0.17 155))',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--success, oklch(0.62 0.17 155))' }}>
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--destructive)',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--destructive)' }}>Error</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section aria-labelledby="appearance-heading" style={sectionStyle}>
          <h2 id="appearance-heading" style={headingStyle}>Appearance</h2>
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>Theme</p>
              <ToggleGroup
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark',  label: 'Dark' },
                ]}
                value={theme}
                onChange={(v) => {
                  if (v !== theme) toggleTheme()
                }}
              />
            </div>

            <div>
              <p style={labelStyle}>Accent color</p>
              <div role="group" aria-label="Accent color" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {ACCENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAccentChange(opt.value)}
                    aria-label={opt.label}
                    aria-pressed={accent === opt.value}
                    title={opt.label}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: opt.color,
                      border: accent === opt.value ? '2px solid var(--text)' : '2px solid transparent',
                      outline: accent === opt.value ? '2px solid var(--border)' : 'none',
                      outlineOffset: '1px',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'outline 0.12s ease, border-color 0.12s ease',
                    }}
                  />
                ))}
                <span style={{ ...noteStyle, margin: 0, marginLeft: '4px' }}>
                  {ACCENT_OPTIONS.find((o) => o.value === accent)?.label}
                </span>
              </div>
            </div>

            <div>
              <p style={labelStyle}>Density</p>
              <ToggleGroup
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'cozy',    label: 'Cozy' },
                ]}
                value={density}
                onChange={handleDensityChange}
              />
            </div>
          </div>
        </section>

        {/* AI Model section */}
        <section aria-labelledby="model-heading" style={sectionStyle}>
          <h2 id="model-heading" style={headingStyle}>AI Model</h2>
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>Model</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                {AI_MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleModelChange(m.value)}
                    aria-pressed={aiModel === m.value}
                    style={{
                      fontSize: '12px',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid',
                      borderColor: aiModel === m.value ? 'var(--accent)' : 'var(--border)',
                      background: aiModel === m.value ? 'var(--accent-soft, var(--accent))' : 'transparent',
                      color: aiModel === m.value ? 'var(--accent)' : 'var(--text-2)',
                      cursor: 'pointer',
                      fontWeight: aiModel === m.value ? 600 : 400,
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {m.label}
                    <span style={{ color: 'var(--text-3, var(--muted-foreground))', marginLeft: '4px', fontWeight: 400 }}>
                      ({m.description})
                    </span>
                  </button>
                ))}
              </div>
              <p style={noteStyle}>
                UI preference only — actual API route changes are out of scope.
              </p>
            </div>
          </div>
        </section>

        {/* About section */}
        <section aria-labelledby="about-heading" style={sectionLastStyle}>
          <h2 id="about-heading" style={headingStyle}>About</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            {[
              { label: 'App', value: 'PersonalDashboard' },
              { label: 'Version', value: '0.1.0' },
              {
                label: 'Vault',
                value: health?.ok && health.vaultName ? health.vaultName : '—',
              },
              {
                label: 'Inbox',
                value:
                  health?.ok && health.inboxCount !== undefined
                    ? `${health.inboxCount} item${health.inboxCount !== 1 ? 's' : ''}`
                    : '—',
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={labelStyle}>{label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
