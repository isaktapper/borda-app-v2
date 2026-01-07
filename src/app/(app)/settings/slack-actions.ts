'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { decryptToken } from '@/lib/slack/encryption'

export async function getSlackChannels(integrationId: string) {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('slack_integrations')
    .select('access_token')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    return { error: 'Integration not found' }
  }

  try {
    const accessToken = decryptToken(integration.access_token)

    // Fetch public channels
    const publicResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    const publicData = await publicResponse.json()

    // Fetch private channels user has access to
    const privateResponse = await fetch('https://slack.com/api/conversations.list?types=private_channel&limit=200', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    const privateData = await privateResponse.json()

    const channels = [
      ...(publicData.channels || []),
      ...(privateData.channels || [])
    ].map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private || false
    }))

    return { channels }
  } catch (error: any) {
    console.error('Failed to fetch Slack channels:', error)
    return { error: 'Failed to load channels' }
  }
}

export async function updateSlackSettings(
  integrationId: string,
  settings: {
    enabled_events: string[]
    notification_channel_id: string
    notification_channel_name: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify user has admin access
  const { data: integration } = await supabase
    .from('slack_integrations')
    .select('organization_id')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    return { error: 'Integration not found' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', integration.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Only admins can modify integration settings' }
  }

  // Update settings
  const { error } = await supabase
    .from('slack_integrations')
    .update({
      enabled_events: settings.enabled_events,
      notification_channel_id: settings.notification_channel_id,
      notification_channel_name: settings.notification_channel_name,
      updated_at: new Date().toISOString()
    })
    .eq('id', integrationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function disconnectSlack(integrationId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Soft delete (preserves history)
  const { error } = await supabase
    .from('slack_integrations')
    .update({
      enabled: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', integrationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}
