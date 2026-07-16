import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { auditResults, audits, db, reports } from '@geolyt/db'
import { Queue } from 'bullmq'
import { eq } from 'drizzle-orm'
import { redisConnection } from '../../connection.js'
import { enqueueAudit } from '../../flow.js'
import { QUEUE_NAMES } from '../../queues.js'
import { collectWorker } from '../../workers/collect.js'
import { reportWorker } from '../../workers/report.js'
import { scoreWorker } from '../../workers/score.js'
import { synthesizeWorker } from '../../workers/synthesize.js'

describe('end-to-end audit pipeline', () => {
  const auditId = '00000000-0000-0000-0000-0000000000e2'
  const url = 'https://example.com'
  const reportFormat = 'markdown'

  async function removeJobsIfExist(): Promise<void> {
    const reportQueue = new Queue(QUEUE_NAMES.report, { connection: redisConnection })
    const existing = await reportQueue.getJob(auditId)
    if (existing) {
      await existing.remove({ removeChildren: true })
    }
    await reportQueue.close()
  }

  beforeAll(async () => {
    await removeJobsIfExist()

    await db.insert(audits).values({
      id: auditId,
      url,
      status: 'pending',
      reportFormat,
    })

    await Promise.all([
      collectWorker.waitUntilReady(),
      scoreWorker.waitUntilReady(),
      synthesizeWorker.waitUntilReady(),
      reportWorker.waitUntilReady(),
    ])

    await enqueueAudit({ auditId, url, reportFormat })
  })

  afterAll(async () => {
    await collectWorker.close()
    await scoreWorker.close()
    await synthesizeWorker.close()
    await reportWorker.close()
    await db.delete(reports).where(eq(reports.auditId, auditId))
    await db.delete(auditResults).where(eq(auditResults.auditId, auditId))
    await db.delete(audits).where(eq(audits.id, auditId))
  })

  // Skipped by default: this test needs the full worker runtime to be active
  // and a reachable Redis instance. Run it explicitly with:
  //   bun test packages/jobs/src/__tests__/e2e/pipeline.test.ts
  it.skip('runs collect, score, synthesize and report stages to completion', async () => {
    let completed = false
    let attempts = 0
    const maxAttempts = 90

    while (!completed && attempts < maxAttempts) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const audit = await db.query.audits.findFirst({
        where: eq(audits.id, auditId),
      })
      if (audit?.status === 'completed' || audit?.status === 'failed') {
        completed = true
      }
    }

    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, auditId),
    })

    expect(audit?.status).toBe('completed')

    const result = await db.query.auditResults.findFirst({
      where: eq(auditResults.auditId, auditId),
    })
    expect(result).not.toBeNull()
    expect(result?.data.scores.composite).toBeGreaterThan(0)

    const report = await db.query.reports.findFirst({
      where: eq(reports.auditId, auditId),
    })
    expect(report).not.toBeNull()
    expect(report?.format).toBe(reportFormat)
  }, 90000)
})
