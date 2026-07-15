import type { Redis } from 'ioredis'

export async function checkCollectRateLimit(redis: Redis, hostname: string): Promise<boolean> {
  const key = `rate-limit:collect:${hostname}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, 1)
  }
  return count <= 1
}
