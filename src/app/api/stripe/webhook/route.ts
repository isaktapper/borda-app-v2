import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe, stripe, PLANS, PlanType } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe price IDs to plan names
function getPlanFromPriceId(priceId: string): PlanType | null {
  for (const [plan, config] of Object.entries(PLANS)) {
    if (config.prices.month.id === priceId || config.prices.year.id === priceId) {
      return plan as PlanType
    }
  }
  return null
}

// Get billing interval from price ID
function getIntervalFromPriceId(priceId: string): 'month' | 'year' | null {
  for (const config of Object.values(PLANS)) {
    if (config.prices.month.id === priceId) return 'month'
    if (config.prices.year.id === priceId) return 'year'
  }
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout completed for customer:', session.customer)
        
        if (session.mode === 'subscription' && session.subscription) {
          // Get the subscription details
          const subscriptionResponse = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          // Handle both Response wrapper and direct Subscription types
          const subscription = 'lastResponse' in subscriptionResponse 
            ? subscriptionResponse 
            : subscriptionResponse as unknown as Stripe.Subscription
          
          const priceId = subscription.items.data[0]?.price.id
          const plan = getPlanFromPriceId(priceId)
          const interval = getIntervalFromPriceId(priceId)
          
          console.log('Checkout - Price ID:', priceId, 'Plan:', plan, 'Interval:', interval)
          
          // Get period timestamps from the subscription object
          const periodStart = (subscription as any).current_period_start
          const periodEnd = (subscription as any).current_period_end
          const trialEnd = (subscription as any).trial_end
          
          // Update subscription in database
          const { error } = await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscription.id,
              plan: plan || 'growth',
              billing_interval: interval || 'year',
              status: subscription.status,
              current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
              current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
              trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', session.customer as string)

          if (error) {
            console.error('Failed to update subscription:', error)
          } else {
            console.log('Checkout subscription updated successfully')
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        const priceId = subscription.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId)
        const interval = getIntervalFromPriceId(priceId)
        
        // Get period timestamps
        const periodStart = (subscription as any).current_period_start
        const periodEnd = (subscription as any).current_period_end
        const trialEnd = (subscription as any).trial_end

        console.log(`Processing ${event.type} for customer:`, subscription.customer)
        console.log('Plan:', plan, 'Interval:', interval, 'Status:', subscription.status)

        const { error } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            plan: plan || 'growth', // Default to growth if price not recognized
            billing_interval: interval || 'year', // Default to year
            status: subscription.status,
            current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer as string)

        if (error) {
          console.error('Failed to update subscription:', error)
        } else {
          console.log('Subscription updated successfully')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer as string)

        if (error) {
          console.error('Failed to update canceled subscription:', error)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription
        
        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', invoice.customer as string)

          if (error) {
            console.error('Failed to update payment failed subscription:', error)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
