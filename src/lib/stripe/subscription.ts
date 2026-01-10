import { createAdminClient } from '@/lib/supabase/server'
import { stripe, TRIAL_DAYS } from './index'

interface CreateCustomerParams {
  organizationId: string
  organizationName: string
  email: string
}

/**
 * Create a Stripe customer and subscription record for a new organization
 * Called during onboarding
 */
export async function createCustomerWithTrial({
  organizationId,
  organizationName,
  email,
}: CreateCustomerParams): Promise<{ customerId: string; error?: string }> {
  try {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: organizationName,
      metadata: {
        organization_id: organizationId,
      },
    })

    // Calculate trial end date
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

    // Create subscription record in database
    const supabase = await createAdminClient()
    
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: organizationId,
        stripe_customer_id: customer.id,
        plan: 'trial',
        status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
      })

    if (error) {
      console.error('Failed to create subscription record:', error)
      return { customerId: customer.id, error: error.message }
    }

    return { customerId: customer.id }
  } catch (error: any) {
    console.error('Failed to create Stripe customer:', error)
    return { customerId: '', error: error.message }
  }
}

/**
 * Get subscription data for an organization
 */
export async function getOrganizationSubscription(organizationId: string) {
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    console.error('Failed to get subscription:', error)
    return null
  }

  return data
}

/**
 * Check if organization has an active subscription
 */
export async function hasActiveSubscription(organizationId: string): Promise<boolean> {
  const subscription = await getOrganizationSubscription(organizationId)
  
  if (!subscription) return false
  
  return ['trialing', 'active'].includes(subscription.status)
}

/**
 * Check if trial has expired
 */
export async function isTrialExpired(organizationId: string): Promise<boolean> {
  const subscription = await getOrganizationSubscription(organizationId)
  
  if (!subscription) return true
  if (subscription.status !== 'trialing') return false
  if (!subscription.trial_ends_at) return false
  
  return new Date(subscription.trial_ends_at) < new Date()
}

/**
 * Get days remaining in trial
 */
export async function getTrialDaysRemaining(organizationId: string): Promise<number> {
  const subscription = await getOrganizationSubscription(organizationId)
  
  if (!subscription || subscription.status !== 'trialing' || !subscription.trial_ends_at) {
    return 0
  }
  
  const now = new Date()
  const trialEnd = new Date(subscription.trial_ends_at)
  const diffTime = trialEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}
