'use client'

import { useState } from 'react'
import type { Skill } from '@/lib/types/automations'

interface SkillEditorProps {
  skill: Skill | null
  onSave: (skill: Skill) => void
  onDelete: (name: string) => void
}

export default function SkillEditor({ skill, onSave, onDelete }: SkillEditorProps) {
  const isNew = skill === null
  const [name, setName] = useState(skill?.name ?? '')
  const [content, setContent] = useState(skill?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        isNew ? '/api/skills' : `/api/skills/${skill!.name}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isNew ? { name, content } : { content }),
        }
      )
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Save failed')
      onSave(await res.json() as Skill)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!skill) return
    setError(null)
    try {
      const res = await fetch(`/api/skills/${skill.name}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onDelete(skill.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '5px 8px',
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    color: 'var(--text)',
  } as const

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {isNew ? (
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
            Name (slug)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="my-skill"
            style={inputStyle}
          />
        </div>
      ) : (
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {skill.name}
        </p>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
          Content (Markdown)
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="flex-1 p-2 font-mono text-xs resize-none rounded"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            minHeight: 200,
          }}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--red)' }}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim() || !content.trim()}
          className="ml-auto px-4 py-1.5 text-xs rounded text-white"
          style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
