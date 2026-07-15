import { beforeAll, describe, expect, it } from 'bun:test'
import { createApp } from '../index.js'

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-must-be-at-least-32-characters-long'
  process.env.BETTER_AUTH_URL = 'http://localhost'
})

describe('better-auth routes', () => {
  it('mounts the auth handler under /api/auth/', async () => {
    const app = createApp()
    const response = await app.handle(new Request('http://localhost/api/auth/error'))

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('error')
  })
})
