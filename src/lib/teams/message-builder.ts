export interface NotificationContext {
  spaceId: string
  projectName: string
  clientName?: string
  actorEmail: string
  action: string
  metadata?: any
}

export interface AdaptiveCardPayload {
  type: 'message'
  attachments: Array<{
    contentType: 'application/vnd.microsoft.card.adaptive'
    content: {
      $schema: string
      type: 'AdaptiveCard'
      version: string
      body: any[]
      actions?: any[]
    }
  }>
}

/**
 * Build a Teams Adaptive Card message based on the notification context
 */
export function buildTeamsMessage(context: NotificationContext): AdaptiveCardPayload {
  const { projectName, actorEmail, action, metadata, spaceId } = context

  const projectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/spaces/${spaceId}`

  // Get display name from email (part before @) or use email
  const actorName = actorEmail === 'anonymous'
    ? 'Anonymous'
    : actorEmail.includes('@') ? actorEmail.split('@')[0] : actorEmail

  // Build message content based on action type
  let icon = '✅'
  let title = 'Activity Update'
  let description = `**${actorName}** performed an action`

  switch (action) {
    case 'task.completed':
      icon = '✅'
      title = 'Task Completed'
      const taskTitle = metadata?.taskTitle || metadata?.title
      description = taskTitle
        ? `**${actorName}** completed task "${taskTitle}"`
        : `**${actorName}** completed a task`
      break

    case 'form.submitted':
    case 'form.answered':
      icon = '📝'
      title = 'Form Submitted'
      const formTitle = metadata?.formTitle
      description = formTitle
        ? `**${actorName}** submitted form "${formTitle}"`
        : `**${actorName}** submitted a form`
      break

    case 'file.uploaded':
      icon = '📎'
      title = 'File Uploaded'
      const fileName = metadata?.fileName
      description = fileName
        ? `**${actorName}** uploaded file "${fileName}"`
        : `**${actorName}** uploaded a file`
      break

    case 'portal.first_visit':
      icon = '👋'
      title = 'Portal First Visit'
      description = `**${actorName}** opened the portal for the first time`
      break

    case 'space.status_changed':
      icon = '🔄'
      title = 'Status Changed'
      const newStatus = metadata?.newStatus || 'unknown'
      const oldStatus = metadata?.oldStatus
      description = oldStatus
        ? `**${actorName}** changed status from "${oldStatus}" to "${newStatus}"`
        : `**${actorName}** changed status to "${newStatus}"`
      break

    default:
      icon = '📌'
      title = 'Activity Update'
      description = `**${actorName}** performed ${action}`
  }

  // Build Adaptive Card
  const card: AdaptiveCardPayload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `${icon} ${title}`,
              weight: 'bolder',
              size: 'medium',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: description,
              wrap: true,
              spacing: 'small'
            },
            {
              type: 'TextBlock',
              text: `Space: ${projectName}`,
              isSubtle: true,
              spacing: 'small',
              wrap: true
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View in Borda',
              url: projectUrl
            }
          ]
        }
      }
    ]
  }

  return card
}

/**
 * Build a test message for webhook verification
 */
export function buildTestMessage(): AdaptiveCardPayload {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: '✅ Test Connection Successful',
              weight: 'bolder',
              size: 'medium',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: '**test@example.com** completed task "Example Task"',
              wrap: true,
              spacing: 'small'
            },
            {
              type: 'TextBlock',
              text: 'Space: Example Project',
              isSubtle: true,
              spacing: 'small',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: 'This is a test notification from Borda. Your Teams integration is configured correctly!',
              isSubtle: true,
              spacing: 'medium',
              wrap: true
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Go to Borda',
              url: process.env.NEXT_PUBLIC_APP_URL || 'https://borda.app'
            }
          ]
        }
      }
    ]
  }
}
