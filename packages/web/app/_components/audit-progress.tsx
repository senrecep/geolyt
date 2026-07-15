'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from './status-badge'

interface AuditProgressProps {
  auditId: string
  initialStatus?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_GEOLYT_API_URL ?? 'http://localhost:3000'

export function AuditProgress({ auditId, initialStatus = 'pending' }: AuditProgressProps) {
  const [status, setStatus] = useState<string>(initialStatus)

  useEffect(() => {
    if (!auditId) return

    const source = new EventSource(`${API_BASE_URL}/audits/${auditId}/stream`, {
      withCredentials: true,
    })

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { status: string; progress: number }
        setStatus(payload.status)

        if (payload.status === 'completed' || payload.status === 'failed') {
          source.close()
        }
      } catch {
        // Ignore malformed events.
      }
    }

    source.onerror = () => {
      source.close()
    }

    return () => {
      source.close()
    }
  }, [auditId])

  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={status} />
      {status === 'completed' && (
        <a
          href={`/audits/${auditId}/report`}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          View report →
        </a>
      )}
    </div>
  )
}
