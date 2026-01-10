import { createClient } from '@/lib/supabase/server'
import { SlackConnectionCard } from './slack-connection-card'
import { TeamsConnectionCard } from './teams-connection-card'

export async function IntegrationsSection() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's organization and role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return <div>No organization found</div>
  }

  const canManage = ['owner', 'admin'].includes(membership.role)

  // Get Slack integration if exists
  const { data: slackIntegration } = await supabase
    .from('slack_integrations')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)
    .maybeSingle()

  // Get Teams integration if exists
  const { data: teamsIntegration } = await supabase
    .from('teams_integrations')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect third-party services to enhance your workflow
        </p>
      </div>

      <div className="space-y-4">
        <SlackConnectionCard
          organizationId={membership.organization_id}
          integration={slackIntegration}
          canManage={canManage}
        />

        <TeamsConnectionCard
          organizationId={membership.organization_id}
          integration={teamsIntegration}
          canManage={canManage}
        />

        {/* Future integrations can be added here */}
      </div>
    </div>
  )
}
