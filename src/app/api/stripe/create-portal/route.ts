import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { organizationId } = await request.json() as {
      organizationId: string
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 })
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

    // Only owners and admins can access billing portal
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get subscription record
    const adminSupabase = await createAdminClient()
    const { data: subscription } = await adminSupabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single()

    let customerId = subscription?.stripe_customer_id

    // If no valid customer ID, create one
    if (!customerId || customerId.startsWith('cus_test')) {
      const { data: org } = await adminSupabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()

      const customer = await stripe.customers.create({
        email: user.email!,
        name: org?.name || 'Organization',
        metadata: { organization_id: organizationId },
      })
      customerId = customer.id

      // Update subscription record
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

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
