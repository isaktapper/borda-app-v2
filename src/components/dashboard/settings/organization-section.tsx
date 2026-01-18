import { createClient } from '@/lib/supabase/server'
import { getOrgMembers } from '@/app/(app)/settings/team-actions'
import { getPendingAccessRequestsCount } from '@/app/(app)/settings/access-request-actions'
import { OrganizationNameSection } from '../organization-name-section'
import { JoinPolicySettings } from '../join-policy-settings'
import { InviteMemberForm } from '@/components/dashboard/invite-member-form'
import { TeamMembersTable } from '@/components/dashboard/team-members-table'
import { AccessRequestsSection } from '../access-requests-section'
import { Shield } from 'lucide-react'

export async function OrganizationSection() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's organization with join policy
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name, domain, join_policy)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return <div>No organization found</div>
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  const canManageOrg = ['owner', 'admin'].includes(membership.role)

  // Get team members
  const members = await getOrgMembers(membership.organization_id)
  
  // Get pending access requests count
  const pendingRequestsCount = canManageOrg 
    ? await getPendingAccessRequestsCount(membership.organization_id)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Organization</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organization settings and team
        </p>
      </div>

      {/* Settings rows */}
      <div className="divide-y">
        <OrganizationNameSection
          organizationId={membership.organization_id}
          initialName={organization?.name || ''}
          canManage={canManageOrg}
        />
        
        <JoinPolicySettings
          organizationId={membership.organization_id}
          domain={organization?.domain || null}
          currentPolicy={(organization?.join_policy as 'invite_only' | 'domain_auto_join') || 'invite_only'}
          canManage={canManageOrg}
        />
      </div>

      {/* Access Requests */}
      {canManageOrg && pendingRequestsCount > 0 && (
        <AccessRequestsSection 
          organizationId={membership.organization_id}
          pendingCount={pendingRequestsCount}
        />
      )}

      {/* Team Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Team Members</h3>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''} in your organization
            </p>
          </div>
        </div>

        {/* Invite Form */}
        {canManageOrg && (
          <div className="flex gap-3 items-start">
            <InviteMemberForm organizationId={membership.organization_id} currentRole={membership.role} />
          </div>
        )}

        <TeamMembersTable
          members={members}
          currentUserId={user.id}
          currentUserRole={membership.role}
          canManageTeam={canManageOrg}
        />
      </div>

      {/* Roles Info */}
      <div className="p-4 rounded-lg bg-muted/40 text-sm">
        <div className="flex gap-3">
          <Shield className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">Roles: </span>
            <span><strong>Owner</strong> — full access including billing</span>
            <span className="mx-2">•</span>
            <span><strong>Admin</strong> — manage users and projects</span>
            <span className="mx-2">•</span>
            <span><strong>Member</strong> — create and edit projects</span>
          </div>
        </div>
      </div>
    </div>
  )
}
