import { afterEach, describe, expect, it } from 'bun:test'
import { aiRedisConnection } from '../connection.js'
import { checkCollectRateLimit } from '../rate-limit.js'

describe('checkCollectRateLimit', () => {
  const hostname = 'rate-limit-test.example.com'

  afterEach(async () => {
    await aiRedisConnection.del(`rate-limit:collect:${hostname}`)
  })

  it('allows the first request for a domain', async () => {
    const allowed = await checkCollectRateLimit(aiRedisConnection, hostname)
    expect(allowed).toBe(true)
  })

  it('blocks a second request within the same window', async () => {
    await checkCollectRateLimit(aiRedisConnection, hostname)
    const allowed = await checkCollectRateLimit(aiRedisConnection, hostname)
    expect(allowed).toBe(false)
  })
})
