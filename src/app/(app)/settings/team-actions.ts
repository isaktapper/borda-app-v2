'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendEmail } from '@/lib/email'
import { orgInviteTemplate } from '@/lib/email/templates'

export interface OrgMember {
  id: string
  user_id: string | null
  organization_id: string
  role: 'owner' | 'admin' | 'member'
  invited_email: string
  invited_by: string | null
  invited_at: string
  joined_at: string | null
  users?: {
    id: string
    email: string
    full_name: string | null
  } | null
}

export async function getOrgMembers(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      users:user_id(id, email, full_name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('invited_at', { ascending: false })

  if (error) {
    console.error('Error fetching org members:', error)
    return []
  }

  return data as OrgMember[]
}

export async function inviteToOrganization(
  organizationId: string,
  email: string,
  role: 'owner' | 'admin' | 'member' = 'member'
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check if user has permission (must be owner or admin)
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
    return { error: 'Insufficient permissions' }
  }

  // If inviting as owner, must be owner yourself
  if (role === 'owner' && currentMember.role !== 'owner') {
    return { error: 'Only owners can invite other owners' }
  }

  // Check if email is already invited or a member
  const { data: existing } = await supabase
    .from('organization_members')
    .select('id, user_id')
    .eq('organization_id', organizationId)
    .eq('invited_email', email)
    .is('deleted_at', null)
    .single()

  if (existing) {
    if (existing.user_id) {
      return { error: 'This user is already a member' }
    } else {
      return { error: 'This user has already been invited' }
    }
  }

  // Check if user exists with this email
  const { data: existingUser } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .single()

  // Create invitation
  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      invited_email: email,
      role,
      invited_by: user.id,
      user_id: existingUser?.id || null, // Auto-link if user exists
      joined_at: existingUser?.id ? new Date().toISOString() : null
    })
    .select()
    .single()

  if (error) {
    console.error('Error inviting user:', error)
    return { error: error.message }
  }

  // Get organization name and inviter name for email
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  const { data: inviter } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Send invitation email
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?email=${encodeURIComponent(email)}`

  await sendEmail({
    to: email,
    subject: `Invitation to ${organization?.name || 'an organization'} on Impel`,
    html: orgInviteTemplate({
      organizationName: organization?.name || 'the organization',
      invitedByName: inviter?.full_name || inviter?.email || 'en kollega',
      inviteLink
    }),
    type: 'org_invite',
    metadata: { organizationId, email, role }
  })

  revalidatePath('/dashboard/settings/team')
  return { success: true, member: data }
}

export async function updateOrgMemberRole(
  memberId: string,
  newRole: 'owner' | 'admin' | 'member'
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the member to update
  const { data: memberToUpdate } = await supabase
    .from('organization_members')
    .select('organization_id, role, user_id')
    .eq('id', memberId)
    .single()

  if (!memberToUpdate) return { error: 'Member not found' }

  // Check if current user has permission
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', memberToUpdate.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!currentMember) return { error: 'Not a member of this organization' }

  // Owners can change anyone's role
  // Admins can only change member ↔ admin (not owner)
  if (currentMember.role === 'admin') {
    if (memberToUpdate.role === 'owner' || newRole === 'owner') {
      return { error: 'Only owners can manage owner roles' }
    }
  } else if (currentMember.role !== 'owner') {
    return { error: 'Insufficient permissions' }
  }

  // Check if trying to remove last owner
  if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
    const { data: ownerCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', memberToUpdate.organization_id)
      .eq('role', 'owner')
      .is('deleted_at', null)

    if ((ownerCount as any) <= 1) {
      return { error: 'Cannot remove the last owner' }
    }
  }

  // Update role
  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) {
    console.error('Error updating role:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings/team')
  return { success: true }
}

export async function removeOrgMember(memberId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the member to remove
  const { data: memberToRemove } = await supabase
    .from('organization_members')
    .select('organization_id, role, user_id')
    .eq('id', memberId)
    .single()

  if (!memberToRemove) return { error: 'Member not found' }

  // Check if current user has permission
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role, user_id')
    .eq('organization_id', memberToRemove.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
    return { error: 'Insufficient permissions' }
  }

  // Cannot remove yourself if you're the only owner
  if (memberToRemove.user_id === user.id && memberToRemove.role === 'owner') {
    const { data: ownerCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', memberToRemove.organization_id)
      .eq('role', 'owner')
      .is('deleted_at', null)

    if ((ownerCount as any) <= 1) {
      return { error: 'Cannot remove yourself as the only owner' }
    }
  }

  // Soft delete
  const { error } = await supabase
    .from('organization_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) {
    console.error('Error removing member:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings/team')
  return { success: true }
}

export async function resendInvitation(memberId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('organization_members')
    .select('invited_email, organization_id')
    .eq('id', memberId)
    .is('user_id', null) // Only for pending invites
    .single()

  if (!member) return { error: 'Invitation not found' }

  // Get organization name and inviter name for email
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', member.organization_id)
    .single()

  const { data: inviter } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Resend invitation email
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?email=${encodeURIComponent(member.invited_email)}`

  await sendEmail({
    to: member.invited_email,
    subject: `Reminder: Invitation to ${organization?.name || 'an organization'} on Impel`,
    html: orgInviteTemplate({
      organizationName: organization?.name || 'the organization',
      invitedByName: inviter?.full_name || inviter?.email || 'en kollega',
      inviteLink
    }),
    type: 'org_invite_resend',
    metadata: { organizationId: member.organization_id, email: member.invited_email }
  })

  return { success: true }
}

// Project-specific action
export async function updateProjectAssignee(spaceId: string, userId: string | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('spaces')
    .update({ assigned_to: userId })
    .eq('id', spaceId)

  if (error) {
    console.error('Error updating project assignee:', error)
    return { error: error.message }
  }

  revalidatePath(`/dashboard/spaces/${spaceId}`)
  return { success: true }
}
