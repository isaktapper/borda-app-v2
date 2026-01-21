'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  sendAccessRequestNotificationEmail,
  sendAccessRequestApprovedEmail,
  sendAccessRequestDeniedEmail,
} from '@/lib/email'

export interface AccessRequest {
  id: string
  email: string
  name: string | null
  organization_id: string
  status: 'pending' | 'approved' | 'denied'
  requested_at: string
  resolved_at: string | null
  resolved_by: string | null
}

/**
 * Get all access requests for an organization
 * Only accessible by owners and admins
 */
export async function getAccessRequests(organizationId: string): Promise<AccessRequest[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('Error fetching access requests:', error)
    return []
  }

  return data as AccessRequest[]
}

/**
 * Get pending access requests count for an organization
 */
export async function getPendingAccessRequestsCount(organizationId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('access_requests')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error counting access requests:', error)
    return 0
  }

  return count || 0
}

/**
 * Create an access request (called from onboarding when user doesn't have an account yet)
 * Uses admin client since user may not be authenticated
 */
export async function createAccessRequest(
  email: string,
  name: string | null,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = await createAdminClient()

  // Check if there's already a pending request
  const { data: existingRequest } = await adminClient
    .from('access_requests')
    .select('id')
    .eq('email', email)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .single()

  if (existingRequest) {
    return { success: false, error: 'You have already requested access to this organization' }
  }

  // Check if user is already a member
  const { data: existingMember } = await adminClient
    .from('organization_members')
    .select('id')
    .eq('invited_email', email)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (existingMember) {
    return { success: false, error: 'You are already a member of this organization' }
  }

  // Create the access request
  const { error: insertError } = await adminClient
    .from('access_requests')
    .insert({
      email,
      name,
      organization_id: organizationId,
      status: 'pending'
    })

  if (insertError) {
    console.error('Error creating access request:', insertError)
    return { success: false, error: 'Failed to submit request. Please try again.' }
  }

  // Get organization details and admins to notify
  const { data: org } = await adminClient
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  const { data: admins } = await adminClient
    .from('organization_members')
    .select('invited_email, users(full_name)')
    .eq('organization_id', organizationId)
    .in('role', ['owner', 'admin'])
    .is('deleted_at', null)

  // Send notification emails to all admins
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.borda.work'
  const settingsUrl = `${appUrl}/settings?tab=organization`

  if (admins && org) {
    for (const admin of admins) {
      await sendAccessRequestNotificationEmail({
        to: admin.invited_email,
        organizationId,
        organizationName: org.name,
        requesterEmail: email,
        requesterName: name,
        requestId: '', // We don't have the request ID here
        approveLink: settingsUrl,
        denyLink: settingsUrl,
      })
    }
  }

  return { success: true }
}

/**
 * Approve an access request
 * Adds the user as a member to the organization
 */
export async function approveAccessRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Get current user (the admin approving)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get the access request
  const { data: request } = await supabase
    .from('access_requests')
    .select('*, organizations(name)')
    .eq('id', requestId)
    .single()

  if (!request) {
    return { success: false, error: 'Access request not found' }
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' }
  }

  // Check if user has permission (must be owner or admin)
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', request.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Find the user by email (they should already have an account since they requested access)
  // Use ilike for case-insensitive matching
  const { data: requesterUser } = await adminClient
    .from('users')
    .select('id')
    .ilike('email', request.email)
    .single()

  // Update the access request status
  const { error: updateError } = await adminClient
    .from('access_requests')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating access request:', updateError)
    return { success: false, error: 'Failed to approve request' }
  }

  // Add user as member to organization
  if (requesterUser) {
    // User already has an account - add them directly as a member
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: request.organization_id,
        user_id: requesterUser.id,
        invited_email: request.email,
        role: 'member',
        invited_by: user.id,
        invited_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      // Don't fail - the request is still approved
    }
  } else {
    // User doesn't have an account yet - create a pending invitation
    const { error: inviteError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: request.organization_id,
        invited_email: request.email,
        role: 'member',
        invited_by: user.id,
        invited_at: new Date().toISOString()
      })

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
    }
  }

  // Send approval email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.borda.work'
  const org = request.organizations as { name: string } | null

  await sendAccessRequestApprovedEmail({
    to: request.email,
    organizationId: request.organization_id,
    organizationName: org?.name || 'the organization',
    requesterName: request.name,
    loginLink: `${appUrl}/login`,
    userId: requesterUser?.id,
  })

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Deny an access request
 */
export async function denyAccessRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get the access request
  const { data: request } = await supabase
    .from('access_requests')
    .select('*, organizations(name)')
    .eq('id', requestId)
    .single()

  if (!request) {
    return { success: false, error: 'Access request not found' }
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' }
  }

  // Check if user has permission (must be owner or admin)
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', request.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Update the access request status
  const { error: updateError } = await adminClient
    .from('access_requests')
    .update({
      status: 'denied',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating access request:', updateError)
    return { success: false, error: 'Failed to deny request' }
  }

  // Send denial email
  const org = request.organizations as { name: string } | null

  await sendAccessRequestDeniedEmail({
    to: request.email,
    organizationId: request.organization_id,
    organizationName: org?.name || 'the organization',
    requesterName: request.name,
  })

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Update organization join policy
 */
export async function updateJoinPolicy(
  organizationId: string,
  joinPolicy: 'invite_only' | 'domain_auto_join'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check if user has permission (must be owner or admin)
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Update the join policy
  const { error } = await supabase
    .from('organizations')
    .update({ join_policy: joinPolicy })
    .eq('id', organizationId)

  if (error) {
    console.error('Error updating join policy:', error)
    return { success: false, error: 'Failed to update join policy' }
  }

  revalidatePath('/settings/organization')
  return { success: true }
}
