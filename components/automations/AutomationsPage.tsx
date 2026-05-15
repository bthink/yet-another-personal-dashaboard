'use client'

import { useState } from 'react'
import type { Skill, Automation } from '@/lib/types/automations'
import SkillList from './SkillList'
import AutomationList from './AutomationList'
import SkillEditor from './SkillEditor'
import AutomationEditor from './AutomationEditor'
import RunModal from './RunModal'

type Tab = 'skills' | 'automations'

interface AutomationsPageProps {
  initialSkills: Skill[]
  initialAutomations: Automation[]
}

export default function AutomationsPage({
  initialSkills,
  initialAutomations,
}: AutomationsPageProps) {
  const [tab, setTab] = useState<Tab>('skills')
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [runTarget, setRunTarget] = useState<Automation | null>(null)

  function handleNewClick() {
    setCreatingNew(true)
    setSelectedSkill(null)
    setSelectedAutomation(null)
  }

  function handleSkillSave(saved: Skill) {
    setSkills(prev => {
      const idx = prev.findIndex(s => s.name === saved.name)
      return idx >= 0 ? prev.map(s => (s.name === saved.name ? saved : s)) : [...prev, saved]
    })
    setSelectedSkill(saved)
    setCreatingNew(false)
  }

  function handleAutomationSave(saved: Automation) {
    setAutomations(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      return idx >= 0 ? prev.map(a => (a.id === saved.id ? saved : a)) : [...prev, saved]
    })
    setSelectedAutomation(saved)
    setCreatingNew(false)
  }

  const showDetail = selectedSkill !== null || selectedAutomation !== null || creatingNew

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {(['skills', 'automations'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setCreatingNew(false) }}
            className="px-3 py-1 text-xs rounded capitalize"
            style={{
              background: tab === t ? 'var(--accent-soft)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-2)',
              fontWeight: tab === t ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={handleNewClick}
          className="ml-auto px-3 py-1 text-xs rounded text-white"
          style={{ background: 'var(--accent)', border: 'none', cursor: 'pointer' }}
        >
          + New
        </button>
      </div>

      {/* 2-col body */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div
          className="w-[280px] shrink-0 overflow-hidden"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          {tab === 'skills' ? (
            <SkillList
              skills={skills}
              selected={selectedSkill}
              onSelect={s => { setSelectedSkill(s); setCreatingNew(false) }}
            />
          ) : (
            <AutomationList
              automations={automations}
              selected={selectedAutomation}
              onSelect={a => { setSelectedAutomation(a); setCreatingNew(false) }}
            />
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden">
          {showDetail ? (
            tab === 'skills' ? (
              <SkillEditor
                skill={creatingNew ? null : selectedSkill}
                onSave={handleSkillSave}
                onDelete={name => {
                  setSkills(prev => prev.filter(s => s.name !== name))
                  setSelectedSkill(null)
                }}
              />
            ) : (
              <AutomationEditor
                automation={creatingNew ? null : selectedAutomation}
                onSave={handleAutomationSave}
                onDelete={id => {
                  setAutomations(prev => prev.filter(a => a.id !== id))
                  setSelectedAutomation(null)
                }}
                onRun={a => setRunTarget(a)}
              />
            )
          ) : (
            <div
              className="flex items-center justify-center h-full text-xs"
              style={{ color: 'var(--text-3)' }}
            >
              Select {tab === 'skills' ? 'a skill' : 'an automation'} or click + New
            </div>
          )}
        </div>
      </div>

      {runTarget && (
        <RunModal automation={runTarget} onClose={() => setRunTarget(null)} />
      )}
    </div>
  )
}
