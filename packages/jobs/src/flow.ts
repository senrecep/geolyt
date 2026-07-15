import { FlowProducer } from 'bullmq'
import { redisConnection } from './connection.js'
import { QUEUE_NAMES } from './queues.js'

export type AuditFlowInput = {
  auditId: string
  url: string
  reportFormat: 'json' | 'markdown' | 'pdf'
}

export async function enqueueAudit(input: AuditFlowInput): Promise<void> {
  const flow = new FlowProducer({ connection: redisConnection })

  await flow.add({
    name: 'report',
    queueName: QUEUE_NAMES.report,
    data: input,
    opts: { jobId: input.auditId },
    children: [
      {
        name: 'synthesize',
        queueName: QUEUE_NAMES.synthesize,
        data: input,
        opts: { jobId: input.auditId },
        children: [
          {
            name: 'score',
            queueName: QUEUE_NAMES.score,
            data: input,
            opts: { jobId: input.auditId },
            children: [
              {
                name: 'collect',
                queueName: QUEUE_NAMES.collect,
                data: input,
                opts: { jobId: input.auditId },
              },
            ],
          },
        ],
      },
    ],
  })

  await flow.close()
}
