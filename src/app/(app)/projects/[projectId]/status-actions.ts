'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/app/(app)/projects/progress-actions'
import { canTransitionTo, type ProjectStatus } from './status-utils'

export type { ProjectStatus } from './status-utils'

export async function updateProjectStatus(
  projectId: string,
  newStatus: ProjectStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return { success: false, error: 'Project not found' }
  }

  // Validate transition
  if (!canTransitionTo(project.status as ProjectStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${project.status} to ${newStatus}`
    }
  }

  // Update status
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Log activity
  await logActivity(
    projectId,
    user.email || 'unknown',
    'project.status_changed',
    'project',
    projectId,
    {
      from: project.status,
      to: newStatus
    }
  )

  // Revalidate
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/projects')
  revalidatePath('/projects')

  return { success: true }
}
