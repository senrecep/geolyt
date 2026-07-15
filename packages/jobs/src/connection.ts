import type { ConnectionOptions } from 'bullmq'
import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redisConnection: ConnectionOptions = {
  url: REDIS_URL,
}

export const aiRedisConnection = new Redis(REDIS_URL)
