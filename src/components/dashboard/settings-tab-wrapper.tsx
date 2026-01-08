import { createClient } from '@/lib/supabase/server'
import { SettingsTabContent } from './settings-tab-content'
import { SpaceBrandingSection } from './space-branding-section'

interface SettingsTabWrapperProps {
  spaceId: string
  organizationId: string
  projectName: string
}

export async function SettingsTabWrapper({ spaceId, organizationId, projectName }: SettingsTabWrapperProps) {
  const supabase = await createClient()

  // Fetch project branding
  const { data: project } = await supabase
    .from('spaces')
    .select('logo_path, brand_color, client_logo_url, background_gradient')
    .eq('id', spaceId)
    .single()

  // Fetch organization branding
  const { data: organization } = await supabase
    .from('organizations')
    .select('logo_path, brand_color, background_gradient')
    .eq('id', organizationId)
    .single()

  return (
    <div className="space-y-4">
      {/* Branding Section */}
      <SpaceBrandingSection
        spaceId={spaceId}
        organizationId={organizationId}
        projectName={projectName}
        initialLogoPath={project?.logo_path || null}
        initialBrandColor={project?.brand_color || null}
        initialClientLogoUrl={project?.client_logo_url || null}
        organizationLogoPath={organization?.logo_path || null}
        organizationBrandColor={organization?.brand_color || '#000000'}
        initialBackgroundGradient={project?.background_gradient || null}
        organizationBackgroundGradient={organization?.background_gradient || null}
      />

      {/* Templates Section */}
      <SettingsTabContent spaceId={spaceId} />
    </div>
  )
}
