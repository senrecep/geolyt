import Stripe from 'stripe'

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey)
}

export async function reportUsage(
  stripe: Stripe,
  subscriptionItemId: string,
  quantity = 1,
): Promise<void> {
  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',
  })
}
