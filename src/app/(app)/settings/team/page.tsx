import { createClient } from '@/lib/supabase/server'
import { getOrgMembers } from '../team-actions'
import { Card } from '@/components/ui/card'
import { UserPlus, Shield } from 'lucide-react'
import { InviteMemberForm } from '@/components/dashboard/invite-member-form'
import { TeamMembersTable } from '@/components/dashboard/team-members-table'

export default async function TeamSettingsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return <div>No organization found</div>
  }

  const members = await getOrgMembers(membership.organization_id)
  const canManageTeam = ['owner', 'admin'].includes(membership.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage organization members and invitations
        </p>
      </div>

      {/* Invite Section */}
      {canManageTeam && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full p-3 bg-primary/10">
              <UserPlus className="size-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Invite new member</h3>
                <p className="text-sm text-muted-foreground">
                  Add new team members to your organization
                </p>
              </div>
              <InviteMemberForm organizationId={membership.organization_id} currentRole={membership.role} />
            </div>
          </div>
        </Card>
      )}

      {/* Members Table */}
      <div>
        <TeamMembersTable
          members={members}
          currentUserId={user.id}
          currentUserRole={membership.role}
          canManageTeam={canManageTeam}
        />
      </div>

      {/* Info */}
      <Card className="p-6 bg-muted/50">
        <div className="flex gap-4">
          <Shield className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Roles and permissions</p>
            <ul className="space-y-1">
              <li><strong>Owner:</strong> Full access including billing and user management</li>
              <li><strong>Admin:</strong> Can manage users and all projects (not billing)</li>
              <li><strong>Member:</strong> Kan skapa och redigera projekt</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
