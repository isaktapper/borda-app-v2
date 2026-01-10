import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingSection } from '@/components/dashboard/settings/billing-section'
import { getOrganizationSubscription, getTrialDaysRemaining } from '@/lib/stripe/subscription'

export default async function BillingPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!membership) {
    redirect('/onboarding')
  }

  // Get organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', membership.organization_id)
    .single()

  if (!organization) {
    redirect('/onboarding')
  }

  // Get subscription data
  const subscription = await getOrganizationSubscription(membership.organization_id)
  const trialDaysRemaining = await getTrialDaysRemaining(membership.organization_id)
  
  const canManageBilling = membership.role === 'owner'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details
        </p>
      </div>

      <BillingSection 
        organizationId={organization.id}
        organizationName={organization.name}
        subscription={subscription}
        trialDaysRemaining={trialDaysRemaining}
        canManageBilling={canManageBilling}
        userRole={membership.role}
      />
    </div>
  )
}
