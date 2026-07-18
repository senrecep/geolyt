import { MarkdownReport } from '@/app/_components/markdown-report'
import { fetchReport, fetchReportMarkdown } from '@/lib/api'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

interface ReportPageProps {
  params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const report = await fetchReport(id, cookieStore.toString()).catch(() => null)

  if (!report) {
    notFound()
  }

  const markdownContent =
    report.format === 'markdown' && report.public_url
      ? await fetchReportMarkdown(report.public_url).catch(() => null)
      : null

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="mb-2 text-2xl font-semibold">Report</h1>
        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
          Audit {report.audit_id} · Format: {report.format}
        </p>

        {report.format === 'pdf' && report.public_url ? (
          <embed
            src={report.public_url}
            type="application/pdf"
            className="h-[80vh] w-full rounded-xl border border-[var(--color-border)]"
          />
        ) : markdownContent ? (
          <MarkdownReport content={markdownContent} />
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Report preview for this format is not available yet.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
