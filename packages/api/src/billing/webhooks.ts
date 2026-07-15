import { clients, db } from '@geolyt/db'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { Err } from 'tsentials/errors'
import { ResultAsync } from 'tsentials/result'

export function stripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET
}

export function handleStripeEvent(event: Stripe.Event): ResultAsync<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
    default:
      return ResultAsync.success(undefined)
  }
}

function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): ResultAsync<void> {
  const clientId = session.client_reference_id
  if (!clientId) {
    return ResultAsync.success(undefined)
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const metadata = session.metadata ?? {}
  const subscriptionItemId = metadata.subscription_item_id
  const plan = metadata.plan ?? 'free'
  const quota = Number.parseInt(metadata.quota ?? '0', 10)

  return ResultAsync.try(
    async () => {
      await db
        .update(clients)
        .set({
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId ?? null,
          stripeSubscriptionItemId: subscriptionItemId ?? null,
          plan,
          monthlyQuota: Number.isNaN(quota) ? 0 : quota,
        })
        .where(eq(clients.id, clientId))
    },
    (error) =>
      Err.unexpected(
        'StripeWebhook.CheckoutSession',
        `Failed to process checkout session: ${error}`,
      ),
  )
}

function handleSubscriptionUpdated(subscription: Stripe.Subscription): ResultAsync<void> {
  const metadata = subscription.metadata ?? {}
  const plan = metadata.plan ?? 'free'
  const requestedQuota = Number.parseInt(metadata.quota ?? '0', 10)
  const quota =
    subscription.status === 'active' && !Number.isNaN(requestedQuota) ? requestedQuota : 0

  return ResultAsync.try(
    async () => {
      await db
        .update(clients)
        .set({ plan, monthlyQuota: quota })
        .where(eq(clients.stripeSubscriptionId, subscription.id))
    },
    (error) =>
      Err.unexpected(
        'StripeWebhook.SubscriptionUpdated',
        `Failed to update subscription: ${error}`,
      ),
  )
}

function handleSubscriptionDeleted(subscription: Stripe.Subscription): ResultAsync<void> {
  return ResultAsync.try(
    async () => {
      await db
        .update(clients)
        .set({
          plan: 'free',
          monthlyQuota: 0,
          stripeSubscriptionItemId: null,
        })
        .where(eq(clients.stripeSubscriptionId, subscription.id))
    },
    (error) =>
      Err.unexpected(
        'StripeWebhook.SubscriptionDeleted',
        `Failed to delete subscription: ${error}`,
      ),
  )
}
