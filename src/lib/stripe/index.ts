import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors when env vars aren't available
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return _stripe
}

// Proxy object that lazily initializes Stripe when accessed
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: keyof Stripe) {
    return getStripe()[prop]
  }
})

// Plan configuration
export const PLANS = {
  growth: {
    name: 'Growth',
    description: 'För växande team',
    productId: 'prod_TlhLu6cGvFI9xv',
    prices: {
      month: {
        id: 'price_1So9wtGa0mrbt3N89elxpnHs',
        amount: 4900, // $49
      },
      year: {
        id: 'price_1So9yBGa0mrbt3N8NNgRd1nR',
        amount: 49200, // $492 ($41/month)
      },
    },
    features: [
      'Upp till 15 aktiva spaces',
      '5 team members',
      'Slack integration',
      'Custom branding',
      'Email support',
    ],
  },
  scale: {
    name: 'Scale',
    description: 'För större organisationer',
    productId: 'prod_TlhNmAKw2nccpH',
    prices: {
      month: {
        id: 'price_1So9z3Ga0mrbt3N8H3n6vOpI',
        amount: 9900, // $99
      },
      year: {
        id: 'price_1So9zmGa0mrbt3N8T5eKzn6D',
        amount: 98400, // $984 ($82/month)
      },
    },
    features: [
      'Obegränsat antal spaces',
      'Obegränsat antal team members',
      'Slack + Teams integration',
      'Advanced branding',
      'Priority support',
      'Analytics dashboard',
    ],
  },
} as const

export type PlanType = keyof typeof PLANS
export type BillingInterval = 'month' | 'year'

// Helper to get price ID
export function getPriceId(plan: PlanType, interval: BillingInterval): string {
  return PLANS[plan].prices[interval].id
}

// Helper to format price for display
export function formatPrice(amount: number, interval: BillingInterval): string {
  const price = (amount / 100).toFixed(0)
  return interval === 'month' ? `$${price}/mo` : `$${price}/yr`
}

// Get monthly equivalent for yearly plans
export function getMonthlyEquivalent(amount: number): number {
  return Math.round(amount / 12)
}

// Trial duration in days
export const TRIAL_DAYS = 14
