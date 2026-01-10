import { createClient } from '@/lib/supabase/server'
import { BrandingSection } from '@/components/dashboard/branding-section'
import { canRemoveBranding } from '@/lib/permissions'

export default async function OrganizationSettingsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's organization with branding
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name, logo_path, brand_color, show_borda_branding)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return <div>No organization found</div>
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  const canManageOrg = ['owner', 'admin'].includes(membership.role)
  
  // Check if plan allows removing Borda branding
  const canRemove = await canRemoveBranding(membership.organization_id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organization logo and color (used as default for all projects)</p>
      </div>

      <BrandingSection
        organizationId={membership.organization_id}
        organizationName={organization?.name || 'Organization'}
        initialLogoPath={organization?.logo_path || null}
        initialBrandColor={organization?.brand_color || '#000000'}
        canManage={canManageOrg}
        canRemoveBranding={canRemove}
        showBordaBranding={organization?.show_borda_branding ?? true}
      />
    </div>
  )
}
