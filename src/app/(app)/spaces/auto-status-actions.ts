'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendProgressCompleteEmail, EMAIL_TYPES } from '@/lib/email'

/**
 * When progress reaches 100% and space is 'active', notify admins via email.
 * Space status is never auto-updated – admins must set it to "completed" manually.
 */
export async function autoUpdateSpaceStatus(spaceId: string) {
  const supabase = await createClient()

  // Get current space status and org
  const { data: space } = await supabase
    .from('spaces')
    .select('id, status, name, client_name, organization_id')
    .eq('id', spaceId)
    .single()

  if (!space || space.status !== 'active') {
    return
  }

  // Calculate progress (use getSpaceProgress for consistency)
  const { getSpaceProgress } = await import('./progress-actions')
  const progressData = await getSpaceProgress(spaceId)

  if (!progressData || progressData.progressPercentage < 100) {
    return
  }

  // Check if we've already sent this notification in the last 24 hours
  const adminClient = await createAdminClient()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { data: recentEmail } = await adminClient
    .from('email_log')
    .select('id')
    .eq('type', EMAIL_TYPES.PROGRESS_COMPLETE)
    .eq('space_id', spaceId)
    .eq('status', 'sent')
    .gte('sent_at', oneDayAgo.toISOString())
    .limit(1)
    .maybeSingle()

  if (recentEmail) {
    return
  }

  // Get org admins (owner + admin)
  const { data: admins } = await adminClient
    .from('organization_members')
    .select('invited_email, users:user_id(email)')
    .eq('organization_id', space.organization_id)
    .in('role', ['owner', 'admin'])
    .is('deleted_at', null)

  if (!admins || admins.length === 0) {
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.borda.work'
  const spaceLink = `${appUrl}/spaces/${spaceId}?tab=responses`
  const spaceName = space.client_name || space.name || 'Space'

  for (const admin of admins) {
    const email = (admin.users as { email?: string } | null)?.email ?? admin.invited_email
    if (!email) continue

    await sendProgressCompleteEmail({
      to: email,
      spaceName,
      spaceId,
      organizationId: space.organization_id,
      spaceLink,
    })
  }

  revalidatePath(`/spaces/${spaceId}`)
  revalidatePath('/spaces')
}
