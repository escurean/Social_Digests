import Stripe from 'stripe'

let _stripe = null
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

export async function createPaymentIntent(amount, currency = 'kes', metadata = {}) {
  const stripe = getStripe()
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
  })
}

export function verifyWebhookSignature(payload, signature) {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}
