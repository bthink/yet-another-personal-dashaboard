'use client'

import useSWR from 'swr'
import type { RunLog } from '@/lib/types/automations'

const fetcher = (url: string) => fetch(url).then(r => r.json() as Promise<RunLog[]>)

interface LogHistoryProps {
  automationId: string
}

export default function LogHistory({ automationId }: LogHistoryProps) {
  const { data: logs } = useSWR<RunLog[]>(
    `/api/automations/${automationId}/logs`,
    fetcher,
    { refreshInterval: 5000 }
  )

  if (!logs?.length) {
    return (
      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
        No runs yet
      </p>
    )
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-3)' }}>
        Last runs
      </p>
      <div className="flex flex-col gap-1">
        {[...logs]
          .reverse()
          .slice(0, 10)
          .map(log => (
            <div key={log.runId} className="flex items-center gap-2 text-[11px]">
              <span style={{ color: log.status === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                {log.status === 'ok' ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-2)' }}>
                {new Date(log.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: 10 }}>exit {log.exitCode}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
