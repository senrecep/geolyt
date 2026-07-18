import { Elysia, t } from 'elysia'
import type Stripe from 'stripe'
import { Err } from 'tsentials/errors'
import { Result } from 'tsentials/result'
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
    const parsedEvent: Result<Stripe.Event> = Result.try(
      () => stripe.webhooks.constructEvent(body as string, signature, secret),
      (error) => Err.unexpected('StripeWebhook.InvalidSignature', `Invalid signature: ${error}`),
    )
    if (!parsedEvent.ok) {
      set.status = 400
      return { error: parsedEvent.errors.map((error) => error.description).join(', ') }
    }

    const result = await handleStripeEvent(parsedEvent.value).toResult()
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
