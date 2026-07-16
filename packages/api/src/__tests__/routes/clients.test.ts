import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { clients, db } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import { createApp } from '../../index.js'

describe('clients route', () => {
  const app = createApp()
  let clientId: string

  beforeAll(async () => {
    const inserted = await db
      .insert(clients)
      .values({
        name: 'Custom domain agency',
        email: 'agency@example.com',
        whiteLabelConfig: {
          companyName: 'Agency',
          domain: 'dashboard.agency.test',
        },
      })
      .returning()
    clientId = inserted[0]?.id ?? ''
  })

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId))
  })

  it('looks up a client by custom domain', async () => {
    const response = await app.fetch(
      new Request('http://localhost/clients/lookup?domain=dashboard.agency.test'),
    )
    expect(response.status).toBe(200)
    const data = (await response.json()) as { id: string; white_label_config: { domain: string } }
    expect(data.id).toBe(clientId)
    expect(data.white_label_config.domain).toBe('dashboard.agency.test')
  })

  it('returns 404 when no client matches the domain', async () => {
    const response = await app.fetch(
      new Request('http://localhost/clients/lookup?domain=unknown.test'),
    )
    expect(response.status).toBe(404)
  })
})
