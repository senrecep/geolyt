import type { ConnectionOptions } from 'bullmq'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redisConnection: ConnectionOptions = {
  url: REDIS_URL,
}
