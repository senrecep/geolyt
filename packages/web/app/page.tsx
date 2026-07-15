import { fetchAudits } from '@/lib/api'
import { AuditList } from './_components/audit-list'
import { Header } from './_components/header'
import { SubmitForm } from './_components/submit-form'

export default async function DashboardPage() {
  const apiKey = process.env.GEOLYT_DASHBOARD_API_KEY ?? ''
  const audits = apiKey ? await fetchAudits(apiKey).catch(() => []) : []

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl p-6">
        <h1 className="mb-8 text-3xl font-semibold">Dashboard</h1>

        <section className="mb-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h2 className="mb-4 text-lg font-medium">Start a new audit</h2>
          <SubmitForm />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-medium">Recent audits</h2>
          <AuditList audits={audits} />
        </section>
      </main>
    </div>
  )
}
