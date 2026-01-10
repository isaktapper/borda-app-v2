import { createAdminClient } from '@/lib/supabase/server'
import { buildTeamsMessage, NotificationContext } from './message-builder'

export async function sendTeamsNotification(
  organizationId: string,
  context: NotificationContext
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createAdminClient()

  // Get Teams integration for this org
  const { data: integration, error: integrationError } = await supabase
    .from('teams_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .is('deleted_at', null)
    .single()

  if (integrationError || !integration) {
    console.log(`No Teams integration for org ${organizationId}`)
    return { success: false, error: 'No integration found' }
  }

  // Check if this event type is enabled
  const enabledEvents = integration.enabled_events as string[]
  // Handle legacy form.answered -> form.submitted mapping
  const actionToCheck = context.action === 'form.submitted' ? ['form.submitted', 'form.answered'] : [context.action]
  const isEventEnabled = actionToCheck.some(action => enabledEvents.includes(action))

  if (!isEventEnabled) {
    console.log(`Event ${context.action} not enabled for org ${organizationId}`)
    return { success: false, error: 'Event not enabled' }
  }

  // Check if webhook URL is configured
  if (!integration.webhook_url) {
    console.log(`No webhook URL configured for org ${organizationId}`)
    return { success: false, error: 'No webhook URL configured' }
  }

  try {
    // Build Teams Adaptive Card message
    const message = buildTeamsMessage(context)

    // Send to Teams webhook
    const response = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    // Teams webhooks return 200 OK on success, but no JSON body
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Teams webhook error:', response.status, errorText)

      // Update error tracking
      await supabase
        .from('teams_integrations')
        .update({
          error_count: (integration.error_count || 0) + 1,
          last_error_at: new Date().toISOString(),
          last_error_message: `HTTP ${response.status}: ${errorText || 'Unknown error'}`
        })
        .eq('id', integration.id)

      return { success: false, error: `HTTP ${response.status}` }
    }

    // Log successful notification
    await supabase
      .from('teams_notifications')
      .insert({
        teams_integration_id: integration.id,
        space_id: context.spaceId,
        event_type: context.action,
        message_payload: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

    // Update last notification timestamp
    await supabase
      .from('teams_integrations')
      .update({
        last_notification_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    return { success: true }

  } catch (error: any) {
    console.error('Failed to send Teams notification:', error)

    // Update error tracking
    await supabase
      .from('teams_integrations')
      .update({
        error_count: (integration.error_count || 0) + 1,
        last_error_at: new Date().toISOString(),
        last_error_message: error.message
      })
      .eq('id', integration.id)

    return { success: false, error: error.message }
  }
}
