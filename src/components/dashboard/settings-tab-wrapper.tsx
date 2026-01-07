import { createClient } from '@/lib/supabase/server'
import { SettingsTabContent } from './settings-tab-content'
import { ProjectBrandingSection } from './project-branding-section'

interface SettingsTabWrapperProps {
  projectId: string
  organizationId: string
  projectName: string
}

export async function SettingsTabWrapper({ projectId, organizationId, projectName }: SettingsTabWrapperProps) {
  const supabase = await createClient()

  // Fetch project branding
  const { data: project } = await supabase
    .from('projects')
    .select('logo_path, brand_color, client_logo_url, background_gradient')
    .eq('id', projectId)
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
      <ProjectBrandingSection
        projectId={projectId}
        organizationId={organizationId}
        projectName={projectName}
        initialLogoPath={project?.logo_path || null}
        initialBrandColor={project?.brand_color || null}
        initialClientLogoUrl={project?.client_logo_url || null}
        organizationLogoPath={organization?.logo_path || null}
        organizationBrandColor={organization?.brand_color || '#bef264'}
        initialBackgroundGradient={project?.background_gradient || null}
        organizationBackgroundGradient={organization?.background_gradient || null}
      />

      {/* Templates Section */}
      <SettingsTabContent projectId={projectId} />
    </div>
  )
}
