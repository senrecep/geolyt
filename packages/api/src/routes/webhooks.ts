import { Elysia, t } from 'elysia'
import type Stripe from 'stripe'
import { createStripeClient } from '../billing/stripe.js'
import { handleStripeEvent, stripeWebhookSecret } from '../billing/webhooks.js'

export const webhooksRoute = new Elysia({ prefix: '/webhooks' }).post(
  '/stripe',
  async ({ body, headers, set }) => {
    const secret = stripeWebhookSecret()
    if (!secret || !process.env.STRIPE_SECRET_KEY) {
      set.status = 500
      return { error: 'Stripe webhook not configured' }
    }

    const signature = headers['stripe-signature']
    if (typeof signature !== 'string') {
      set.status = 400
      return { error: 'Missing stripe-signature header' }
    }

    const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body as string, signature, secret)
    } catch (error) {
      set.status = 400
      return { error: `Invalid signature: ${error}` }
    }

    const result = await handleStripeEvent(event).toResult()
    if (!result.ok) {
      set.status = 500
      return { error: result.errors.map((error) => error.description).join(', ') }
    }

    return { received: true }
  },
  {
    body: t.String(),
  },
)
