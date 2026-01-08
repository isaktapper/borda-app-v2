import { sendSlackNotification } from './notifications'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Hook to trigger Slack notifications for activity log events
 * Call this after logging activity in activity_log table
 */
export async function triggerSlackNotification(
  spaceId: string,
  organizationId: string,
  actorEmail: string,
  action: string,
  metadata?: any
) {
  // Only notify for customer activity events
  const notifiableEvents = [
    'task.completed',
    'form.submitted',
    'form.answered', // Legacy support
    'file.uploaded'
  ]

  if (!notifiableEvents.includes(action)) {
    return
  }

  // Get project details for context
  const supabase = await createAdminClient()

  const { data: project } = await supabase
    .from('spaces')
    .select('name, client_name')
    .eq('id', spaceId)
    .single()

  if (!project) return

  // Send notification (fire-and-forget, don't block)
  sendSlackNotification(organizationId, {
    spaceId,
    projectName: project.name,
    clientName: project.client_name,
    actorEmail,
    action,
    metadata
  }).catch(error => {
    console.error('Failed to send Slack notification:', error)
  })
}
