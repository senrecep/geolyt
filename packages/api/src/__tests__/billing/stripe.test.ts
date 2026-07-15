import { describe, expect, it, spyOn } from 'bun:test'
import { createStripeClient, reportUsage } from '../../billing/stripe.js'

describe('Stripe billing helpers', () => {
  it('creates a Stripe client from a secret key', () => {
    const client = createStripeClient('sk_test_123')
    expect(client).toBeDefined()
  })

  it('reports usage to a subscription item', async () => {
    const client = createStripeClient('sk_test_123')
    const createUsageRecord = spyOn(
      (
        client as {
          subscriptionItems: {
            createUsageRecord: typeof client.subscriptionItems.createUsageRecord
          }
        }
      ).subscriptionItems,
      'createUsageRecord',
    ).mockResolvedValue({} as never)

    await reportUsage(client, 'si_123', 1)

    expect(createUsageRecord).toHaveBeenCalledTimes(1)
    const call = createUsageRecord.mock.calls[0]
    expect(call?.[0]).toBe('si_123')
    expect(call?.[1]).toMatchObject({
      quantity: 1,
      action: 'increment',
    })

    createUsageRecord.mockRestore()
  })
})
