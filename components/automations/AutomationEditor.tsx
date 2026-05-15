'use client'

import { useState } from 'react'
import type { Automation, InputDef } from '@/lib/types/automations'
import LogHistory from './LogHistory'

interface AutomationEditorProps {
  automation: Automation | null
  onSave: (automation: Automation) => void
  onDelete: (id: string) => void
  onRun: (automation: Automation) => void
}

const CRON_PRESETS: Record<string, string> = {
  '0 9 * * 1-5': 'weekdays at 09:00',
  '0 * * * *': 'every hour',
  '*/5 * * * *': 'every 5 minutes',
  '0 0 * * *': 'daily at midnight',
  '0 9 * * 1': 'every Monday at 09:00',
}

function cronHint(expr: string): string {
  return CRON_PRESETS[expr.trim()] ?? ''
}

export default function AutomationEditor({
  automation,
  onSave,
  onDelete,
  onRun,
}: AutomationEditorProps) {
  const isNew = automation === null
  const [name, setName] = useState(automation?.name ?? '')
  const [description, setDescription] = useState(automation?.description ?? '')
  const [script, setScript] = useState(automation?.script ?? '#!/bin/bash\n\n')
  const [schedule, setSchedule] = useState(automation?.schedule ?? '')
  const [inputs, setInputs] = useState<InputDef[]>(automation?.inputs ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body: Partial<Automation> = {
        name,
        description,
        script,
        schedule: schedule.trim() || null,
        inputs,
      }
      const url = isNew ? '/api/automations' : `/api/automations/${automation!.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Save failed')
      onSave(await res.json() as Automation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!automation) return
    const res = await fetch(`/api/automations/${automation.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(automation.id)
  }

  function addInput() {
    setInputs(prev => [
      ...prev,
      { key: `input_${prev.length + 1}`, label: '', type: 'text', required: false },
    ])
  }

  function updateInput(i: number, patch: Partial<InputDef>) {
    setInputs(prev => prev.map((inp, idx) => (idx === i ? { ...inp, ...patch } : inp)))
  }

  const hint = cronHint(schedule)

  const inputBase = {
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
  } as const

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded"
            style={inputBase}
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded"
            style={inputBase}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Script (bash)</label>
        <textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          rows={8}
          className="w-full p-2 font-mono text-xs rounded resize-y"
          style={inputBase}
        />
      </div>

      <div>
        <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
          Schedule (cron)
          {hint && (
            <span className="ml-2 text-[10px]" style={{ color: 'var(--accent)' }}>
              = {hint}
            </span>
          )}
        </label>
        <input
          value={schedule}
          onChange={e => setSchedule(e.target.value)}
          placeholder="0 9 * * 1-5  (leave empty for manual only)"
          className="w-full px-2 py-1.5 text-xs font-mono rounded"
          style={inputBase}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px]" style={{ color: 'var(--text-3)' }}>Inputs</label>
          <button
            type="button"
            onClick={addInput}
            className="text-[11px]"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + Add
          </button>
        </div>
        {inputs.map((inp, i) => (
          <div key={inp.key} className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '1fr 1fr auto auto' }}>
            <input
              value={inp.label}
              onChange={e => updateInput(i, { label: e.target.value })}
              placeholder="Label"
              className="px-2 py-1 text-xs rounded"
              style={inputBase}
            />
            <select
              value={inp.type}
              onChange={e => updateInput(i, { type: e.target.value as InputDef['type'] })}
              className="px-2 py-1 text-xs rounded"
              style={inputBase}
            >
              <option value="text">Text</option>
              <option value="vault-file">Vault file</option>
              <option value="inbox-item">Inbox item</option>
              <option value="todo-item">Todo item</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
              <input
                type="checkbox"
                checked={inp.required}
                onChange={e => updateInput(i, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => setInputs(prev => prev.filter((_, idx) => idx !== i))}
              style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {!isNew && <LogHistory automationId={automation!.id} />}

      {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}

      <div className="flex gap-2 mt-auto pt-2">
        {!isNew && (
          <>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--red)' }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => onRun(automation!)}
              className="px-4 py-1.5 text-xs rounded text-white"
              style={{ background: 'var(--accent)' }}
            >
              ▶ Run
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="ml-auto px-4 py-1.5 text-xs rounded text-white"
          style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
