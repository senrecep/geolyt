import { Queue } from 'bullmq'
import { redisConnection } from './connection.js'

export const QUEUE_NAMES = {
  collect: 'audit.collect',
  score: 'audit.score',
  synthesize: 'audit.synthesize',
  report: 'audit.report',
} as const

export const collectQueue = new Queue(QUEUE_NAMES.collect, { connection: redisConnection })
export const scoreQueue = new Queue(QUEUE_NAMES.score, { connection: redisConnection })
export const synthesizeQueue = new Queue(QUEUE_NAMES.synthesize, { connection: redisConnection })
export const reportQueue = new Queue(QUEUE_NAMES.report, { connection: redisConnection })
