'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/app/(app)/spaces/progress-actions'
import { canTransitionTo, type SpaceStatus } from './status-utils'

export type { SpaceStatus } from './status-utils'

export async function updateSpaceStatus(
  spaceId: string,
  newStatus: SpaceStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current project
  const { data: project, error: projectError } = await supabase
    .from('spaces')
    .select('id, status')
    .eq('id', spaceId)
    .single()

  if (projectError || !project) {
    return { success: false, error: 'Project not found' }
  }

  // Validate transition
  if (!canTransitionTo(project.status as SpaceStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${project.status} to ${newStatus}`
    }
  }

  // Update status
  const { error: updateError } = await supabase
    .from('spaces')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', spaceId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Log activity
  await logActivity(
    spaceId,
    user.email || 'unknown',
    'project.status_changed',
    'project',
    spaceId,
    {
      from: project.status,
      to: newStatus
    }
  )

  // Revalidate
  revalidatePath(`/dashboard/spaces/${spaceId}`)
  revalidatePath('/spaces')
  revalidatePath('/spaces')

  return { success: true }
}
