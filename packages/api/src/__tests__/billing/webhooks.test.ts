import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { clients, db } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { handleStripeEvent, stripeWebhookSecret } from '../../billing/webhooks.js'

function checkoutSessionCompletedEvent(payload: {
  clientId: string
  customerId: string
  subscriptionId: string
  subscriptionItemId: string
  plan: string
  quota: number
}): Stripe.Event {
  return {
    id: 'evt_test_checkout',
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Date.now(),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test',
        object: 'checkout.session',
        client_reference_id: payload.clientId,
        customer: payload.customerId,
        subscription: payload.subscriptionId,
        metadata: {
          plan: payload.plan,
          quota: String(payload.quota),
          subscription_item_id: payload.subscriptionItemId,
        },
      } as unknown as Stripe.Checkout.Session,
    },
  } as unknown as Stripe.Event
}

function subscriptionUpdatedEvent(payload: {
  subscriptionId: string
  status: Stripe.Subscription.Status
  plan: string
  quota: number
}): Stripe.Event {
  return {
    id: 'evt_test_updated',
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Date.now(),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: payload.subscriptionId,
        object: 'subscription',
        status: payload.status,
        metadata: {
          plan: payload.plan,
          quota: String(payload.quota),
        },
      } as unknown as Stripe.Subscription,
    },
  } as unknown as Stripe.Event
}

function subscriptionDeletedEvent(subscriptionId: string): Stripe.Event {
  return {
    id: 'evt_test_deleted',
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Date.now(),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
      } as unknown as Stripe.Subscription,
    },
  } as unknown as Stripe.Event
}

describe('handleStripeEvent', () => {
  let clientId: string

  beforeAll(async () => {
    const inserted = await db
      .insert(clients)
      .values({ name: 'Webhook test', email: 'webhook-stripe@test.com' })
      .returning()
    clientId = inserted[0]?.id ?? ''
  })

  afterEach(async () => {
    await db
      .update(clients)
      .set({
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null,
        plan: 'free',
        monthlyQuota: 0,
      })
      .where(eq(clients.id, clientId))
  })

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId))
  })

  it('records customer and subscription details from a completed checkout session', async () => {
    const event = checkoutSessionCompletedEvent({
      clientId,
      customerId: 'cus_test',
      subscriptionId: 'sub_test',
      subscriptionItemId: 'si_test',
      plan: 'pro',
      quota: 100,
    })

    const result = await handleStripeEvent(event)

    expect(result.ok).toBe(true)
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    })
    expect(client?.stripeCustomerId).toBe('cus_test')
    expect(client?.stripeSubscriptionId).toBe('sub_test')
    expect(client?.stripeSubscriptionItemId).toBe('si_test')
    expect(client?.plan).toBe('pro')
    expect(client?.monthlyQuota).toBe(100)
  })

  it('updates plan and quota from a subscription update event', async () => {
    await db
      .update(clients)
      .set({ stripeSubscriptionId: 'sub_update' })
      .where(eq(clients.id, clientId))

    const event = subscriptionUpdatedEvent({
      subscriptionId: 'sub_update',
      status: 'active',
      plan: 'standard',
      quota: 50,
    })

    const result = await handleStripeEvent(event)

    expect(result.ok).toBe(true)
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    })
    expect(client?.plan).toBe('standard')
    expect(client?.monthlyQuota).toBe(50)
  })

  it('downgrades a client when their subscription is deleted', async () => {
    await db
      .update(clients)
      .set({
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_delete',
        stripeSubscriptionItemId: 'si_test',
        plan: 'pro',
        monthlyQuota: 100,
      })
      .where(eq(clients.id, clientId))

    const result = await handleStripeEvent(subscriptionDeletedEvent('sub_delete'))

    expect(result.ok).toBe(true)
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    })
    expect(client?.plan).toBe('free')
    expect(client?.monthlyQuota).toBe(0)
    expect(client?.stripeSubscriptionItemId).toBeNull()
  })
})

describe('stripeWebhookSecret', () => {
  it('reads the webhook secret from the environment', () => {
    expect(stripeWebhookSecret()).toBe(process.env.STRIPE_WEBHOOK_SECRET)
  })
})
