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

// Plan configuration with lookup keys instead of hardcoded price IDs
export const PLANS = {
  growth: {
    name: 'Growth',
    description: 'For growing teams',
    productId: 'prod_TlhLu6cGvFI9xv',
    lookupKeys: {
      month: 'growth_monthly',
      year: 'growth_yearly',
    },
    // Default amounts (in cents) used as fallback if Stripe API is unavailable
    defaultAmounts: {
      month: 3900, // $39
      year: 38400, // $384 ($32/month)
    },
    features: [
      '5 active spaces',
      '2 templates',
      'Unlimited team members',
      'All integrations',
      'Custom branding',
      'Email support',
    ],
  },
  scale: {
    name: 'Scale',
    description: 'For larger organizations',
    productId: 'prod_TlhNmAKw2nccpH',
    lookupKeys: {
      month: 'scale_monthly',
      year: 'scale_yearly',
    },
    // Default amounts (in cents) used as fallback if Stripe API is unavailable
    defaultAmounts: {
      month: 7900, // $79
      year: 78000, // $780 ($65/month)
    },
    features: [
      'Unlimited spaces',
      'Unlimited templates',
      'Unlimited team members',
      'All integrations',
      'Remove Borda branding',
      'Priority support',
      'Analytics dashboard (coming soon)',
    ],
  },
} as const

export type PlanType = keyof typeof PLANS
export type BillingInterval = 'month' | 'year'

// Price data structure
export interface PriceData {
  id: string
  amount: number
  lookupKey: string
}

export interface PlanPrices {
  month: PriceData
  year: PriceData
}

export interface AllPrices {
  growth: PlanPrices
  scale: PlanPrices
}

// Cache for fetched prices (5 minute TTL)
let pricesCache: { data: AllPrices; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Fetch prices from Stripe using lookup keys
export async function getStripePrices(): Promise<AllPrices> {
  // Return cached prices if still valid
  if (pricesCache && Date.now() - pricesCache.timestamp < CACHE_TTL) {
    return pricesCache.data
  }

  try {
    const stripe = getStripe()

    // Fetch all prices with our lookup keys
    const lookupKeys = [
      PLANS.growth.lookupKeys.month,
      PLANS.growth.lookupKeys.year,
      PLANS.scale.lookupKeys.month,
      PLANS.scale.lookupKeys.year,
    ]

    const prices = await stripe.prices.list({
      lookup_keys: lookupKeys,
      active: true,
      expand: ['data.product'],
    })

    // Build price map
    const priceMap = new Map<string, Stripe.Price>()
    for (const price of prices.data) {
      if (price.lookup_key) {
        priceMap.set(price.lookup_key, price)
      }
    }

    // Build the AllPrices object
    const allPrices: AllPrices = {
      growth: {
        month: getPriceDataFromMap(priceMap, PLANS.growth.lookupKeys.month, PLANS.growth.defaultAmounts.month),
        year: getPriceDataFromMap(priceMap, PLANS.growth.lookupKeys.year, PLANS.growth.defaultAmounts.year),
      },
      scale: {
        month: getPriceDataFromMap(priceMap, PLANS.scale.lookupKeys.month, PLANS.scale.defaultAmounts.month),
        year: getPriceDataFromMap(priceMap, PLANS.scale.lookupKeys.year, PLANS.scale.defaultAmounts.year),
      },
    }

    // Update cache
    pricesCache = { data: allPrices, timestamp: Date.now() }

    return allPrices
  } catch (error) {
    console.error('Failed to fetch Stripe prices:', error)

    // Return default prices as fallback
    return getDefaultPrices()
  }
}

// Helper to extract price data from the map
function getPriceDataFromMap(
  priceMap: Map<string, Stripe.Price>,
  lookupKey: string,
  defaultAmount: number
): PriceData {
  const price = priceMap.get(lookupKey)
  if (price) {
    return {
      id: price.id,
      amount: price.unit_amount || defaultAmount,
      lookupKey,
    }
  }
  // Return a placeholder if price not found (will cause checkout to fail gracefully)
  return {
    id: `missing_${lookupKey}`,
    amount: defaultAmount,
    lookupKey,
  }
}

// Get default prices (used as fallback)
function getDefaultPrices(): AllPrices {
  return {
    growth: {
      month: { id: 'default_growth_monthly', amount: PLANS.growth.defaultAmounts.month, lookupKey: PLANS.growth.lookupKeys.month },
      year: { id: 'default_growth_yearly', amount: PLANS.growth.defaultAmounts.year, lookupKey: PLANS.growth.lookupKeys.year },
    },
    scale: {
      month: { id: 'default_scale_monthly', amount: PLANS.scale.defaultAmounts.month, lookupKey: PLANS.scale.lookupKeys.month },
      year: { id: 'default_scale_yearly', amount: PLANS.scale.defaultAmounts.year, lookupKey: PLANS.scale.lookupKeys.year },
    },
  }
}

// Helper to get price ID (now async)
export async function getPriceId(plan: PlanType, interval: BillingInterval): Promise<string> {
  const prices = await getStripePrices()
  return prices[plan][interval].id
}

// Helper to get all price data for frontend display
export async function getAllPriceData(): Promise<AllPrices> {
  return getStripePrices()
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

// Map Stripe price IDs to plan names (needs prices map for dynamic lookup)
export function getPlanFromPriceId(priceId: string, prices: AllPrices): PlanType | null {
  if (prices.growth.month.id === priceId || prices.growth.year.id === priceId) {
    return 'growth'
  }
  if (prices.scale.month.id === priceId || prices.scale.year.id === priceId) {
    return 'scale'
  }
  return null
}

// Get billing interval from price ID (needs prices map for dynamic lookup)
export function getIntervalFromPriceId(priceId: string, prices: AllPrices): BillingInterval | null {
  if (prices.growth.month.id === priceId || prices.scale.month.id === priceId) {
    return 'month'
  }
  if (prices.growth.year.id === priceId || prices.scale.year.id === priceId) {
    return 'year'
  }
  return null
}

// Trial duration in days
export const TRIAL_DAYS = 14
