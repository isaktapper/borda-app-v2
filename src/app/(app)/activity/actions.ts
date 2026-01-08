'use server'

import { createClient } from '@/lib/supabase/server'

export interface ActivityItem {
  id: string
  space_id: string
  actor_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, any>
  created_at: string
  space_name: string
  client_name: string
}

export type ActivityFilter = 'all' | 'task' | 'file' | 'form' | 'checklist' | 'space'

export async function getActivities(
  scope: 'assigned' | 'organization' = 'assigned',
  filter: ActivityFilter = 'all'
): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return []

  // Base query for activities
  let query = supabase
    .from('activity_log')
    .select(`
      id,
      space_id,
      actor_email,
      action,
      resource_type,
      resource_id,
      metadata,
      created_at,
      spaces!inner (
        name,
        client_name,
        organization_id,
        assigned_to
      )
    `)
    .eq('spaces.organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Filter by scope
  if (scope === 'assigned') {
    // Only show activities from spaces assigned to the user
    query = query.eq('spaces.assigned_to', user.id)
  }

  // Filter by action type
  if (filter !== 'all') {
    query = query.like('action', `${filter}.%`)
  }

  const { data: activities, error } = await query

  if (error) {
    console.error('Error fetching activities:', error)
    return []
  }

  // Transform the data
  return (activities || []).map((activity: any) => ({
    id: activity.id,
    space_id: activity.space_id,
    actor_email: activity.actor_email,
    action: activity.action,
    resource_type: activity.resource_type,
    resource_id: activity.resource_id,
    metadata: activity.metadata || {},
    created_at: activity.created_at,
    space_name: activity.spaces.name,
    client_name: activity.spaces.client_name,
  }))
}

export async function getActivityStats(scope: 'assigned' | 'organization' = 'assigned'): Promise<{
  totalActivities: number
  todayActivities: number
  taskCompletions: number
  fileUploads: number
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalActivities: 0, todayActivities: 0, taskCompletions: 0, fileUploads: 0 }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { totalActivities: 0, todayActivities: 0, taskCompletions: 0, fileUploads: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // First, get the project IDs based on scope
  let projectsQuery = supabase
    .from('spaces')
    .select('id')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)

  if (scope === 'assigned') {
    projectsQuery = projectsQuery.eq('assigned_to', user.id)
  }

  const { data: projects } = await projectsQuery

  if (!projects || projects.length === 0) {
    return { totalActivities: 0, todayActivities: 0, taskCompletions: 0, fileUploads: 0 }
  }

  const spaceIds = projects.map(p => p.id)

  // Query all activities for these projects
  const { data: allActivities } = await supabase
    .from('activity_log')
    .select('id, action, created_at')
    .in('space_id', spaceIds)
    .order('created_at', { ascending: false })

  if (!allActivities || allActivities.length === 0) {
    return { totalActivities: 0, todayActivities: 0, taskCompletions: 0, fileUploads: 0 }
  }

  // Count today's activities
  const todayActivities = allActivities.filter(a => 
    new Date(a.created_at) >= today
  ).length

  // Count task completions
  const taskCompletions = allActivities.filter(a => 
    a.action === 'task.completed'
  ).length

  // Count file uploads
  const fileUploads = allActivities.filter(a => 
    a.action === 'file.uploaded'
  ).length

  return {
    totalActivities: allActivities.length,
    todayActivities,
    taskCompletions,
    fileUploads
  }
}

