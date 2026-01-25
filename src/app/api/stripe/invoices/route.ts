import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization ID from query params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
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

    // Get subscription with Stripe customer ID
    const adminSupabase = await createAdminClient()
    const { data: subscription } = await adminSupabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single()

    if (!subscription?.stripe_customer_id || subscription.stripe_customer_id.startsWith('cus_test')) {
      // No real Stripe customer, return empty invoices
      return NextResponse.json({ invoices: [] })
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 10,
    })

    // Transform to simpler format
    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      date: invoice.created,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.lines.data[0]?.description || 'Subscription',
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    }))

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error: any) {
    console.error('Invoices fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
