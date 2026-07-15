import Link from 'next/link'
import { ScoreBadge } from './score-badge'
import { StatusBadge } from './status-badge'

interface Audit {
  audit_id: string
  url: string
  status: string
  created_at: string
  completed_at: string | null
  result: {
    scores?: {
      composite?: number
      aiCitability?: number
      brandAuthority?: number
      contentQuality?: number
      technicalFoundation?: number
      structuredData?: number
      platformOptimization?: number
    }
  } | null
}

interface AuditListProps {
  audits: Audit[]
}

export function AuditList({ audits }: AuditListProps) {
  if (audits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted-foreground)]">
        No audits yet. Submit a URL above to get started.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {audits.map((audit) => (
        <Link
          key={audit.audit_id}
          href={`/audits/${audit.audit_id}`}
          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition hover:border-[var(--color-primary)]"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-[var(--color-card-foreground)] group-hover:text-[var(--color-primary)]">
                {audit.url}
              </h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {new Date(audit.created_at).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={audit.status} />
          </div>

          {audit.result?.scores && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <ScoreBadge score={audit.result.scores.composite} label="Composite" />
              <ScoreBadge score={audit.result.scores.aiCitability} label="Citability" />
              <ScoreBadge score={audit.result.scores.brandAuthority} label="Brand" />
              <ScoreBadge score={audit.result.scores.contentQuality} label="Content" />
              <ScoreBadge score={audit.result.scores.technicalFoundation} label="Technical" />
              <ScoreBadge score={audit.result.scores.structuredData} label="Schema" />
              <ScoreBadge score={audit.result.scores.platformOptimization} label="Platform" />
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
