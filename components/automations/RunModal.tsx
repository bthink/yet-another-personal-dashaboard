'use client'

import { useCallback, useState } from 'react'
import type { Automation } from '@/lib/types/automations'
import RunOutput from './RunOutput'

interface RunModalProps {
  automation: Automation
  onClose: () => void
}

export default function RunModal({ automation, onClose }: RunModalProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)

  const handleComplete = useCallback((code: number) => setExitCode(code), [])

  const missingRequired = automation.inputs
    .filter(i => i.required && !inputValues[i.key]?.trim())
    .map(i => i.key)

  const canRun = missingRequired.length === 0

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', paddingTop: '14vh' }}
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Run ${automation.name}`}
        className="w-[480px] max-w-[90vw] rounded-lg p-6 flex flex-col gap-4"
        style={{ background: 'var(--panel)', border: '1px solid var(--border-strong)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          ▶ Run: {automation.name}
        </h2>

        {!running &&
          automation.inputs.map(input => (
            <div key={input.key}>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
                {input.label || input.key}
                {input.required && <span style={{ color: 'var(--red)' }}> *</span>}
              </label>
              <input
                type="text"
                value={inputValues[input.key] ?? ''}
                onChange={e =>
                  setInputValues(prev => ({ ...prev, [input.key]: e.target.value }))
                }
                className="w-full px-2 py-1.5 text-xs rounded"
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
          ))}

        {running && (
          <RunOutput
            automationId={automation.id}
            inputs={inputValues}
            onComplete={handleComplete}
          />
        )}

        {exitCode !== null && (
          <p
            className="text-xs"
            style={{ color: exitCode === 0 ? 'var(--green)' : 'var(--red)' }}
          >
            {exitCode === 0 ? '✓ Completed successfully' : `✗ Exited with code ${exitCode}`}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            {exitCode !== null ? 'Close' : 'Cancel'}
          </button>
          {!running && (
            <button
              type="button"
              onClick={() => setRunning(true)}
              disabled={!canRun}
              className="px-4 py-1.5 text-xs rounded text-white"
              style={{ background: 'var(--accent)', opacity: canRun ? 1 : 0.4 }}
              aria-disabled={!canRun}
            >
              ▶ Run
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
