import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SlackConnectionCard } from '@/components/dashboard/settings/slack-connection-card'
import { TeamsConnectionCard } from '@/components/dashboard/settings/teams-connection-card'
import { Loader2 } from 'lucide-react'

async function IntegrationsContent() {
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
  )
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect third-party services to enhance your workflow
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <IntegrationsContent />
      </Suspense>
    </div>
  )
}

