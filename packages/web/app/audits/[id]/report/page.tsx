import { fetchReport } from '@/lib/api'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Header } from '../../../_components/header'

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

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl p-6">
        <h1 className="mb-2 text-2xl font-semibold">Report</h1>
        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
          Audit {report.audit_id} · Format: {report.format}
        </p>

        {report.format === 'pdf' ? (
          <embed
            src={report.public_url}
            type="application/pdf"
            className="h-[80vh] w-full rounded-xl border border-[var(--color-border)]"
          />
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
