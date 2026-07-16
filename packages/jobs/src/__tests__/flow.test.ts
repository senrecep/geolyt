import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { FlowProducer } from 'bullmq'
import { redisConnection } from '../connection.js'
import { enqueueAudit } from '../flow.js'
import { QUEUE_NAMES, reportQueue } from '../queues.js'

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
      if (existing) await existing.remove({ removeChildren: true })
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

  it('creates the full collect-score-synthesize-report job tree', async () => {
    await enqueueAudit(input)

    const flow = new FlowProducer({ connection: redisConnection })
    const tree = await flow.getFlow({
      id: auditId,
      queueName: QUEUE_NAMES.report,
    })
    await flow.close()

    expect(tree.job.queueName).toBe(QUEUE_NAMES.report)
    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]?.job.queueName).toBe(QUEUE_NAMES.synthesize)
    expect(tree.children[0]?.children).toHaveLength(1)
    expect(tree.children[0]?.children[0]?.job.queueName).toBe(QUEUE_NAMES.score)
    expect(tree.children[0]?.children[0]?.children).toHaveLength(1)
    expect(tree.children[0]?.children[0]?.children[0]?.job.queueName).toBe(QUEUE_NAMES.collect)
  })
})
