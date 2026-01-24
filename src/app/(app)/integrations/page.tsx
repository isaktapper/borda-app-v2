import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SlackConnectionCard } from '@/components/dashboard/settings/slack-connection-card'
import { TeamsConnectionCard } from '@/components/dashboard/settings/teams-connection-card'
import { IntegrationEventTracker } from '@/components/integration-event-tracker'
import { Loader2 } from 'lucide-react'
import { getCachedUser, getCachedOrgMember } from '@/lib/queries/user'

async function IntegrationsContent() {
  const supabase = await createClient()

  // Use cached user query (deduplicates with layout)
  const { user } = await getCachedUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Use cached org member query (deduplicates with layout)
  const { data: membership } = await getCachedOrgMember(user.id)

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
    <div className="grid gap-4 sm:grid-cols-2">
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
    <div className="space-y-8">
      {/* Track integration events from URL params */}
      <Suspense fallback={null}>
        <IntegrationEventTracker />
      </Suspense>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect the tools you and your team use every day.
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
