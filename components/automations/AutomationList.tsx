'use client'

import { useState } from 'react'
import type { Automation } from '@/lib/types/automations'

interface AutomationListProps {
  automations: Automation[]
  selected: Automation | null
  onSelect: (automation: Automation) => void
}

export default function AutomationList({ automations, selected, onSelect }: AutomationListProps) {
  const [filter, setFilter] = useState('')
  const filtered = automations.filter(
    a =>
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.description.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter automations…"
          className="w-full px-2 py-1 text-xs rounded"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(automation => (
          <button
            key={automation.id}
            type="button"
            onClick={() => onSelect(automation)}
            className="w-full text-left px-3 py-2"
            style={{
              background: selected?.id === automation.id ? 'var(--accent-soft)' : 'transparent',
              borderLeft: `2px solid ${selected?.id === automation.id ? 'var(--accent)' : 'transparent'}`,
              color: 'var(--text)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium flex-1 truncate">{automation.name}</span>
              {automation.schedule && (
                <span
                  className="text-[10px] px-1 rounded shrink-0 font-mono"
                  style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}
                >
                  ⏰
                </span>
              )}
            </div>
            {automation.description && (
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                {automation.description}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
            No automations found
          </p>
        )}
      </div>
    </div>
  )
}
