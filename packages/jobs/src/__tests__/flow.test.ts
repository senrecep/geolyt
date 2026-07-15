import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { enqueueAudit } from '../flow.js'
import { reportQueue } from '../queues.js'

describe('enqueueAudit', () => {
  const auditId = '00000000-0000-0000-0000-000000000001'
  const input = {
    auditId,
    url: 'https://example.com',
    reportFormat: 'pdf' as const,
  }

  async function removeIfExists(id: string): Promise<void> {
    try {
      const existing = await reportQueue.getJob(id)
      if (existing) await existing.remove(true)
    } catch {
      // The job may be locked by an unfinished child; ignore cleanup failures.
    }
  }

  beforeAll(async () => {
    await removeIfExists(auditId)
  })

  afterAll(async () => {
    await removeIfExists(auditId)
  })

  it('creates a flow job keyed by audit id', async () => {
    await enqueueAudit(input)

    const job = await reportQueue.getJob(auditId)
    expect(job).not.toBeNull()
    expect(job?.data.auditId).toBe(auditId)
  })
})
