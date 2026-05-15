'use client'

import { useEffect, useRef, useState } from 'react'

interface RunOutputProps {
  automationId: string
  inputs: Record<string, string>
  onComplete: (exitCode: number) => void
}

type OutputLine = { type: 'stdout' | 'stderr'; text: string }

export default function RunOutput({ automationId, inputs, onComplete }: RunOutputProps) {
  const [lines, setLines] = useState<OutputLine[]>([])
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/automations/${automationId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.body) return
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          buffer += decoder.decode(value, { stream: true })

          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''

          for (const event of events) {
            const dataLine = event.split('\n').find(l => l.startsWith('data: '))
            if (!dataLine) continue
            try {
              const parsed = JSON.parse(dataLine.slice(6)) as {
                type: string
                text?: string
                exitCode?: number
              }
              if (parsed.type === 'stdout' || parsed.type === 'stderr') {
                setLines(prev => [
                  ...prev,
                  { type: parsed.type as 'stdout' | 'stderr', text: parsed.text ?? '' },
                ])
              } else if (parsed.type === 'done') {
                setDone(true)
                onComplete(parsed.exitCode ?? -1)
              }
            } catch {
              // malformed SSE event, skip
            }
          }
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [automationId, inputs, onComplete])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div
      className="font-mono text-xs p-3 rounded overflow-auto max-h-64"
      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
    >
      {lines.length === 0 && !done && (
        <span style={{ color: 'var(--text-3)' }}>Starting…</span>
      )}
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            color: line.type === 'stderr' ? 'var(--red)' : 'var(--green)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {line.text}
        </div>
      ))}
      {!done && lines.length > 0 && (
        <span className="animate-pulse" style={{ color: 'var(--text-3)' }}>▊</span>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
