'use client'

import { useState } from 'react'
import { submitAudit } from '../_actions/submit-audit'
import { AuditProgress } from './audit-progress'

export function SubmitForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [auditId, setAuditId] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setMessage(null)
    setAuditId(null)

    const result = await submitAudit(formData)

    setPending(false)

    if (result.success) {
      setAuditId(result.auditId ?? null)
      setMessage(`Audit started: ${result.auditId}`)
    } else {
      setMessage(result.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="url" className="sr-only">
            URL to audit
          </label>
          <input
            id="url"
            name="url"
            type="url"
            placeholder="https://example.com"
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <label htmlFor="reportFormat" className="sr-only">
            Report format
          </label>
          <select
            id="reportFormat"
            name="reportFormat"
            defaultValue="pdf"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] sm:w-40"
          >
            <option value="pdf">PDF</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-blue-600 disabled:opacity-50"
        >
          {pending ? 'Starting...' : 'Start audit'}
        </button>
      </form>

      {auditId && <AuditProgress auditId={auditId} />}

      {message && !auditId && (
        <p
          className={`text-sm ${message.startsWith('Audit started') ? 'text-green-400' : 'text-red-400'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
