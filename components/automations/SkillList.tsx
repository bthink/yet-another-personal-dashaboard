'use client'

import { useState } from 'react'
import type { Skill } from '@/lib/types/automations'

interface SkillListProps {
  skills: Skill[]
  selected: Skill | null
  onSelect: (skill: Skill) => void
}

export default function SkillList({ skills, selected, onSelect }: SkillListProps) {
  const [filter, setFilter] = useState('')
  const filtered = skills.filter(
    s =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter skills…"
          className="w-full px-2 py-1 text-xs rounded"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(skill => (
          <button
            key={skill.name}
            type="button"
            onClick={() => onSelect(skill)}
            className="w-full text-left px-3 py-2"
            style={{
              background: selected?.name === skill.name ? 'var(--accent-soft)' : 'transparent',
              borderLeft: `2px solid ${selected?.name === skill.name ? 'var(--accent)' : 'transparent'}`,
              color: 'var(--text)',
            }}
          >
            <div className="text-xs font-medium truncate">{skill.name}</div>
            {skill.description && (
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                {skill.description}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
            No skills found
          </p>
        )}
      </div>
    </div>
  )
}
