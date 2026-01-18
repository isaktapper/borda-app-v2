import { createClient } from '@/lib/supabase/server'
import { OrganizationBrandingForm } from './organization-branding-form'

export async function BrandingSection() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's organization with branding
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name, logo_path, brand_color, background_gradient)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return <div>No organization found</div>
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  const canManageOrg = ['owner', 'admin'].includes(membership.role)

  // Generate signed URL for logo if exists
  let logoUrl = null
  if (organization?.logo_path) {
    const { data } = await supabase.storage
      .from('branding')
      .createSignedUrl(organization.logo_path, 60 * 60)
    logoUrl = data?.signedUrl || null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Branding</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your organization&apos;s logo and colors
        </p>
      </div>

      <OrganizationBrandingForm
        organizationId={membership.organization_id}
        organizationName={organization?.name || 'Organization'}
        initialLogoPath={organization?.logo_path || null}
        initialLogoUrl={logoUrl}
        initialBrandColor={organization?.brand_color || '#000000'}
        initialBackgroundGradient={organization?.background_gradient || null}
        canManage={canManageOrg}
      />
    </div>
  )
}
