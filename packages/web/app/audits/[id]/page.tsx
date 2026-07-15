import { fetchAudit } from '@/lib/api'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AuditProgress } from '../../_components/audit-progress'
import { ScoreBadge } from '../../_components/score-badge'

interface AuditDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const audit = await fetchAudit(id, cookieStore.toString()).catch(() => null)

  if (!audit) {
    notFound()
  }

  const scores = audit.result?.scores
  const findings = audit.result?.findings ?? []
  const crawlerAccess = audit.result?.crawlerAccess ?? []

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{audit.url}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
            <AuditProgress auditId={id} initialStatus={audit.status} />
            <span>Created {new Date(audit.created_at).toLocaleString()}</span>
            {audit.completed_at && (
              <span>Completed {new Date(audit.completed_at).toLocaleString()}</span>
            )}
          </div>
          <div className="mt-4">
            <Link
              href={`/audits/${id}/report`}
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              View report →
            </Link>
          </div>
        </div>

        {scores && (
          <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <h2 className="mb-4 text-lg font-medium">Score breakdown</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <ScoreBadge score={scores.composite} label="Composite" />
              <ScoreBadge score={scores.aiCitability} label="Citability" />
              <ScoreBadge score={scores.brandAuthority} label="Brand" />
              <ScoreBadge score={scores.contentQuality} label="Content" />
              <ScoreBadge score={scores.technicalFoundation} label="Technical" />
              <ScoreBadge score={scores.structuredData} label="Schema" />
              <ScoreBadge score={scores.platformOptimization} label="Platform" />
            </div>
          </section>
        )}

        {findings.length > 0 && (
          <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <h2 className="mb-4 text-lg font-medium">Findings</h2>
            <ul className="space-y-3">
              {findings.map((finding) => (
                <li
                  key={finding.code}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${
                        finding.severity === 'critical' || finding.severity === 'high'
                          ? 'bg-red-500/10 text-red-400'
                          : finding.severity === 'medium'
                            ? 'bg-orange-500/10 text-orange-400'
                            : finding.severity === 'low'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-neutral-500/10 text-neutral-400'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-sm font-medium">{finding.title}</span>
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {finding.description}
                  </p>
                  {finding.recommendation && (
                    <p className="mt-2 text-sm text-[var(--color-primary)]">
                      {finding.recommendation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {crawlerAccess.length > 0 && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <h2 className="mb-4 text-lg font-medium">AI crawler access</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted-foreground)]">
                    <th className="pb-2 font-medium">Crawler</th>
                    <th className="pb-2 font-medium">Tier</th>
                    <th className="pb-2 font-medium">Allowed</th>
                    <th className="pb-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlerAccess.map((crawler) => (
                    <tr
                      key={crawler.name}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-3">{crawler.name}</td>
                      <td className="py-3">{crawler.tier}</td>
                      <td className="py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            crawler.allowed
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {crawler.allowed ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--color-muted-foreground)]">
                        {crawler.reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
