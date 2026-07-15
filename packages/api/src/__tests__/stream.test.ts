import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { apiKeys, audits, db } from '@geolyt/db'
import { reportQueue } from '@geolyt/jobs'
import { createApp } from '../index.js'

const API_KEY = 'test-api-key-geolyt-stream'

async function setupApiKey(): Promise<void> {
  const hash = await Bun.password.hash(API_KEY)
  await db.insert(apiKeys).values({ name: 'Stream test key', keyHash: hash })
}

async function cleanupTables(): Promise<void> {
  await db.delete(audits)
  await db.delete(apiKeys)
}

describe('GET /audits/:id/stream', () => {
  const app = createApp()

  beforeAll(async () => {
    await setupApiKey()
  })

  afterAll(async () => {
    await cleanupTables()
  })

  it('returns 404 when the job does not exist', async () => {
    const response = await app.fetch(
      new Request('http://localhost/audits/00000000-0000-0000-0000-000000000000/stream', {
        headers: { 'x-api-key': API_KEY },
      }),
    )
    expect(response.status).toBe(404)
  })

  it('streams status events for an existing job', async () => {
    const getJobSpy = spyOn(reportQueue, 'getJob').mockResolvedValue({
      getState: async () => 'completed',
      progress: 100,
    } as never)

    const response = await app.fetch(
      new Request('http://localhost/audits/00000000-0000-0000-0000-000000000000/stream', {
        headers: { 'x-api-key': API_KEY },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Expected response body to have a reader')
    }

    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    expect(text).toContain('event: status')
    expect(text).toContain('"status":"completed"')
    expect(text).toContain('"progress":100')

    getJobSpy.mockRestore()
  })
})
