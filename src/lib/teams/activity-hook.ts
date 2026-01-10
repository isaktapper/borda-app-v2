import { sendTeamsNotification } from './notifications'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Hook to trigger Teams notifications for activity log events
 * Call this after logging activity in activity_log table
 */
export async function triggerTeamsNotification(
  spaceId: string,
  organizationId: string,
  actorEmail: string,
  action: string,
  metadata?: any
) {
  // Only notify for specified customer activity events
  const notifiableEvents = [
    'task.completed',
    'form.submitted',
    'form.answered', // Legacy support
    'file.uploaded',
    'portal.first_visit', // NEW
    'space.status_changed' // NEW
  ]

  if (!notifiableEvents.includes(action)) {
    return
  }

  // Get space details for context
  const supabase = await createAdminClient()

  const { data: space } = await supabase
    .from('spaces')
    .select('name, client_name')
    .eq('id', spaceId)
    .single()

  if (!space) return

  // Send notification (fire-and-forget, don't block)
  sendTeamsNotification(organizationId, {
    spaceId,
    projectName: space.name,
    clientName: space.client_name,
    actorEmail,
    action,
    metadata
  }).catch(error => {
    console.error('Failed to send Teams notification:', error)
  })
}
