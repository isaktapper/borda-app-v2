import { createAdminClient } from '@/lib/supabase/server'
import { decryptToken } from './encryption'

interface SlackMessage {
  channel: string
  text: string
  blocks?: any[]
  thread_ts?: string
}

interface NotificationContext {
  spaceId: string
  projectName: string
  clientName?: string
  actorEmail: string
  action: string
  metadata?: any
}

export async function sendSlackNotification(
  organizationId: string,
  context: NotificationContext
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createAdminClient()

  // Get Slack integration for this org
  const { data: integration, error: integrationError } = await supabase
    .from('slack_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .is('deleted_at', null)
    .single()

  if (integrationError || !integration) {
    console.log(`No Slack integration for org ${organizationId}`)
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

  // Check if notification channel is configured
  if (!integration.notification_channel_id) {
    console.log(`No notification channel configured for org ${organizationId}`)
    return { success: false, error: 'No channel configured' }
  }

  try {
    // Decrypt token
    const accessToken = decryptToken(integration.access_token)

    // Build message
    const message = buildSlackMessage(context, integration.notification_channel_id)

    // Send to Slack
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    const result = await response.json()

    if (!result.ok) {
      console.error('Slack API error:', result)

      // Update error tracking
      await supabase
        .from('slack_integrations')
        .update({
          error_count: (integration.error_count || 0) + 1,
          last_error_at: new Date().toISOString(),
          last_error_message: result.error || 'Unknown error'
        })
        .eq('id', integration.id)

      return { success: false, error: result.error }
    }

    // Log successful notification
    await supabase
      .from('slack_notifications')
      .insert({
        slack_integration_id: integration.id,
        space_id: context.spaceId,
        event_type: context.action,
        message_payload: message,
        status: 'sent',
        slack_ts: result.ts,
        slack_channel: result.channel,
        sent_at: new Date().toISOString()
      })

    // Update last notification timestamp
    await supabase
      .from('slack_integrations')
      .update({
        last_notification_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    return { success: true }

  } catch (error: any) {
    console.error('Failed to send Slack notification:', error)

    // Update error tracking
    await supabase
      .from('slack_integrations')
      .update({
        error_count: (integration.error_count || 0) + 1,
        last_error_at: new Date().toISOString(),
        last_error_message: error.message
      })
      .eq('id', integration.id)

    return { success: false, error: error.message }
  }
}

function buildSlackMessage(context: NotificationContext, channel: string): SlackMessage {
  const { projectName, actorEmail, action, metadata, spaceId } = context

  const projectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/spaces/${spaceId}`

  // Get display name from email (part before @) or use email
  const actorName = actorEmail === 'anonymous' 
    ? 'Anonymous' 
    : actorEmail.includes('@') ? actorEmail.split('@')[0] : actorEmail

  // Build message based on action type
  let icon = '✅'
  let actionText = 'completed an action'

  switch (action) {
    case 'task.completed':
      icon = '✅'
      const taskTitle = metadata?.taskTitle || metadata?.title
      actionText = taskTitle ? `completed task "${taskTitle}"` : 'completed a task'
      break

    case 'form.submitted':
    case 'form.answered':
      icon = '📝'
      const formTitle = metadata?.formTitle
      actionText = formTitle ? `submitted form "${formTitle}"` : 'submitted a form'
      break

    case 'file.uploaded':
      icon = '📎'
      const fileName = metadata?.fileName
      actionText = fileName ? `uploaded file "${fileName}"` : 'uploaded a file'
      break

    case 'portal.first_visit':
      icon = '👋'
      actionText = 'opened the portal for the first time'
      break

    case 'space.status_changed':
      icon = '🔄'
      const newStatus = metadata?.newStatus || 'unknown'
      const oldStatus = metadata?.oldStatus
      actionText = oldStatus
        ? `changed status from "${oldStatus}" to "${newStatus}"`
        : `changed status to "${newStatus}"`
      break
  }

  const messageText = `${icon} *${actorName}* ${actionText}`
  const fallbackText = `${icon} ${actorName} ${actionText}`

  return {
    channel,
    text: fallbackText,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: messageText
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Project: *${projectName}* • <${projectUrl}|View>`
          }
        ]
      }
    ]
  }
}
