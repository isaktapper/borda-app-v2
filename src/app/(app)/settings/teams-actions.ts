'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildTestMessage } from '@/lib/teams/message-builder'

// Regex to validate Teams webhook URL format
// Supports both traditional Teams Incoming Webhooks (webhook.office.com) and Power Automate webhooks (powerplatform.com)
const TEAMS_WEBHOOK_REGEX = /^https:\/\/[a-zA-Z0-9.-]+(webhook\.office\.com|powerplatform\.com|office\.com)/i

/**
 * Test a Teams webhook URL by sending a test message
 */
export async function testTeamsWebhook(webhookUrl: string) {
  try {
    // Validate webhook URL format
    if (!TEAMS_WEBHOOK_REGEX.test(webhookUrl)) {
      return {
        success: false,
        error: 'Invalid Teams webhook URL format. Please check the URL and try again.'
      }
    }

    // Build test message
    const testMessage = buildTestMessage()

    // Send test message to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Failed to send test message: HTTP ${response.status}${errorText ? ` - ${errorText}` : ''}`
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Test webhook error:', error)
    return { success: false, error: error.message || 'Failed to test webhook' }
  }
}

/**
 * Create or update Teams integration
 */
export async function createTeamsIntegration(
  organizationId: string,
  webhookUrl: string,
  channelName?: string
) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate webhook URL
  if (!TEAMS_WEBHOOK_REGEX.test(webhookUrl)) {
    return { error: 'Invalid Teams webhook URL format' }
  }

  // Check if user is admin/owner of the organization
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return { error: 'Unauthorized. Only admins and owners can configure integrations.' }
  }

  // Use admin client to insert (bypasses RLS)
  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .from('teams_integrations')
    .upsert({
      organization_id: organizationId,
      webhook_url: webhookUrl,
      channel_name: channelName || null,
      enabled_events: ['task.completed', 'form.submitted', 'file.uploaded', 'portal.first_visit', 'space.status_changed'],
      enabled: true,
      installed_by_user_id: user.id
    }, {
      onConflict: 'organization_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create Teams integration:', error)
    return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/integrations')

  return { success: true, data }
}

/**
 * Update Teams integration settings
 */
export async function updateTeamsSettings(
  integrationId: string,
  settings: {
    webhookUrl?: string
    channelName?: string
    enabledEvents?: string[]
  }
) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get integration to verify permissions
  const { data: integration } = await supabase
    .from('teams_integrations')
    .select('organization_id')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    return { error: 'Integration not found' }
  }

  // Check if user is admin/owner
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', integration.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return { error: 'Unauthorized. Only admins and owners can update integrations.' }
  }

  // Validate webhook URL if provided
  if (settings.webhookUrl && !TEAMS_WEBHOOK_REGEX.test(settings.webhookUrl)) {
    return { error: 'Invalid Teams webhook URL format' }
  }

  // Build update object
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (settings.webhookUrl !== undefined) {
    updateData.webhook_url = settings.webhookUrl
  }
  if (settings.channelName !== undefined) {
    updateData.channel_name = settings.channelName || null
  }
  if (settings.enabledEvents !== undefined) {
    updateData.enabled_events = settings.enabledEvents
  }

  // Update integration
  const { error } = await supabase
    .from('teams_integrations')
    .update(updateData)
    .eq('id', integrationId)

  if (error) {
    console.error('Failed to update Teams integration:', error)
    return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/integrations')

  return { success: true }
}

/**
 * Disconnect Teams integration (soft delete)
 */
export async function disconnectTeams(integrationId: string) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get integration to verify permissions
  const { data: integration } = await supabase
    .from('teams_integrations')
    .select('organization_id')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    return { error: 'Integration not found' }
  }

  // Check if user is admin/owner
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', integration.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return { error: 'Unauthorized. Only admins and owners can disconnect integrations.' }
  }

  // Soft delete
  const { error } = await supabase
    .from('teams_integrations')
    .update({
      enabled: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', integrationId)

  if (error) {
    console.error('Failed to disconnect Teams integration:', error)
    return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/integrations')

  return { success: true }
}

/**
 * Get Teams integration for an organization
 */
export async function getTeamsIntegration(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teams_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('Failed to get Teams integration:', error)
    return { error: error.message }
  }

  return { data }
}
