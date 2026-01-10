import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripe, getPriceId, PlanType, BillingInterval } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { plan, interval, organizationId } = await request.json() as {
      plan: PlanType
      interval: BillingInterval
      organizationId: string
    }

    if (!plan || !interval || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user is member of organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Only owners and admins can manage billing
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get subscription record
    const adminSupabase = await createAdminClient()
    let { data: subscription } = await adminSupabase
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('organization_id', organizationId)
      .single()

    // Get organization name for Stripe customer
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    let customerId = subscription?.stripe_customer_id

    // If no customer ID or it's a test ID, create a real Stripe customer
    if (!customerId || customerId.startsWith('cus_test')) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: org?.name || 'Organization',
        metadata: {
          organization_id: organizationId,
        },
      })
      customerId = customer.id

      // Update or create subscription record
      if (subscription) {
        await adminSupabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('organization_id', organizationId)
      } else {
        await adminSupabase
          .from('subscriptions')
          .insert({
            organization_id: organizationId,
            stripe_customer_id: customerId,
            plan: 'trial',
            status: 'trialing',
          })
      }
    }

    // Get price ID
    const priceId = getPriceId(plan, interval)

    // Create checkout session - no trial, pay immediately
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&canceled=true`,
      metadata: {
        organization_id: organizationId,
        plan,
        interval,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
