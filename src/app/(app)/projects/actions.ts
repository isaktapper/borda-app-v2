'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProjectProgress } from '@/app/(app)/projects/progress-actions'

export async function createProject(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get user's organization
    const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) throw new Error('User has no organization')

    const clientName = formData.get('clientName') as string
    const projectNameInput = formData.get('projectName') as string
    const targetGoLiveDate = formData.get('targetGoLiveDate') as string

    const projectName = projectNameInput || clientName

    if (!clientName) {
        return { error: 'Client name is required' }
    }

    // Insert project (defaults to 'draft' status in database)
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
            organization_id: membership.organization_id,
            name: projectName,
            client_name: clientName,
            target_go_live_date: targetGoLiveDate || null,
            created_by: user.id,
            assigned_to: user.id  // Automatically assign creator to project
        })
        .select()
        .single()

    if (projectError) {
        return { error: projectError.message }
    }

    // Create initial membership (owner)
    const { error: memberError } = await supabase
        .from('project_members')
        .insert({
            project_id: project.id,
            user_id: user.id,
            role: 'owner',
            joined_at: new Date().toISOString()
        })

    if (memberError) {
        // Optional: cleanup project if membership fails
        await supabase.from('projects').delete().eq('id', project.id)
        return { error: memberError.message }
    }

    revalidatePath('/projects')
    return { success: true, projectId: project.id, organizationId: membership.organization_id }
}

export async function getProjects(includeArchived: boolean = false) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Build query
    let query = supabase
        .from('projects_with_assigned')
        .select('*')

    // Exclude archived projects by default
    if (!includeArchived) {
        query = query.neq('status', 'archived')
    }

    // Fetch projects
    const { data: projects, error } = await query.order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
        return []
    }

    // Fetch template names separately for projects that have template_id
    const projectsWithTemplateIds = projects.filter(p => p.template_id)
    const templateIds = [...new Set(projectsWithTemplateIds.map(p => p.template_id))]

    let templateMap = new Map<string, string>()
    if (templateIds.length > 0) {
        const { data: templates } = await supabase
            .from('templates')
            .select('id, name')
            .in('id', templateIds)

        templates?.forEach(t => {
            templateMap.set(t.id, t.name)
        })
    }

    // Batch fetch computed fields for all projects
    const projectIds = projects.map(p => p.id)

    // Fetch activity data
    const { data: activityData } = await supabase
        .from('activity_log')
        .select('project_id, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

    // Fetch tasks data for overdue and next due date
    const { data: tasksData } = await supabase
        .from('tasks')
        .select('project_id, due_date, status, pages!inner(project_id)')
        .in('pages.project_id', projectIds)

    // Fetch portal visits data
    const { data: visitsData } = await supabase
        .from('portal_visits')
        .select('project_id, visited_at')
        .in('project_id', projectIds)
        .order('visited_at', { ascending: false })

    // Fetch tags for all projects
    const { data: projectTagsData } = await supabase
        .from('project_tags')
        .select('project_id, tag_id, tags(id, name, color)')
        .in('project_id', projectIds)

    // Build lookup maps for computed fields
    const lastActivityMap = new Map<string, string>()
    activityData?.forEach(activity => {
        if (!lastActivityMap.has(activity.project_id)) {
            lastActivityMap.set(activity.project_id, activity.created_at)
        }
    })

    const overdueTasksMap = new Map<string, number>()
    const nextDueDateMap = new Map<string, string | null>()
    const today = new Date().toISOString().split('T')[0]

    tasksData?.forEach(task => {
        const projectId = (task.pages as any).project_id

        // Count overdue tasks
        if (task.due_date && task.due_date < today && task.status !== 'completed') {
            overdueTasksMap.set(projectId, (overdueTasksMap.get(projectId) || 0) + 1)
        }

        // Find next due date
        if (task.due_date && task.due_date >= today && task.status !== 'completed') {
            const current = nextDueDateMap.get(projectId)
            if (!current || task.due_date < current) {
                nextDueDateMap.set(projectId, task.due_date)
            }
        }
    })

    const lastVisitMap = new Map<string, string>()
    const visitsCountMap = new Map<string, number>()
    visitsData?.forEach(visit => {
        // Track last visit
        if (!lastVisitMap.has(visit.project_id)) {
            lastVisitMap.set(visit.project_id, visit.visited_at)
        }
        // Count visits
        visitsCountMap.set(visit.project_id, (visitsCountMap.get(visit.project_id) || 0) + 1)
    })

    // Build tags map
    const tagsMap = new Map<string, Array<{ id: string; name: string; color: string }>>()
    projectTagsData?.forEach(pt => {
        const tag = pt.tags as any
        if (tag) {
            const existing = tagsMap.get(pt.project_id) || []
            existing.push({ id: tag.id, name: tag.name, color: tag.color })
            tagsMap.set(pt.project_id, existing)
        }
    })

    // Enhance projects with computed fields and avatars
    const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
            const { createClient: createServerClient } = await import('@/lib/supabase/server')
            const supabase = await createServerClient()

            // Generate signed URL for avatar
            let avatarUrl = null
            if (project.assigned_user?.avatar_url) {
                const { data } = await supabase.storage
                    .from('avatars')
                    .createSignedUrl(project.assigned_user.avatar_url, 60 * 60 * 24)
                avatarUrl = data?.signedUrl || null
            }

            // Generate signed URL for client logo
            let clientLogoUrl = null
            if (project.client_logo_url) {
                const { data } = await supabase.storage
                    .from('client-logos')
                    .createSignedUrl(project.client_logo_url, 60 * 60 * 24)
                clientLogoUrl = data?.signedUrl || null
            }

            // Calculate project progress
            const progressData = await getProjectProgress(project.id)
            const progress = progressData?.progressPercentage || 0

            return {
                ...project,
                assigned_user: project.assigned_user ? {
                    ...project.assigned_user,
                    avatar_url: avatarUrl
                } : null,
                client_logo_url: clientLogoUrl,
                progress,
                template_name: project.template_id ? templateMap.get(project.template_id) || null : null,
                last_activity_at: lastActivityMap.get(project.id) || null,
                overdue_tasks_count: overdueTasksMap.get(project.id) || 0,
                next_due_date: nextDueDateMap.get(project.id) || null,
                last_visit_at: lastVisitMap.get(project.id) || null,
                visits_count: visitsCountMap.get(project.id) || 0,
                tags: tagsMap.get(project.id) || [],
                engagement_score: project.engagement_score || null,
                engagement_level: project.engagement_level || null,
                engagement_calculated_at: project.engagement_calculated_at || null
            }
        })
    )

    return enhancedProjects
}

export async function getProject(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !project) {
        console.error('Error fetching project:', error)
        return null
    }

    return project
}

export async function deleteProjects(projectIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // First verify user has access to these projects (RLS check)
    const { data: projects, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .in('id', projectIds)

    if (checkError || !projects || projects.length !== projectIds.length) {
        return { error: 'Unauthorized or projects not found' }
    }

    // Use admin client to perform soft delete (bypass RLS)
    const adminClient = await createAdminClient()
    const { error } = await adminClient
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', projectIds)

    if (error) {
        console.error('Error deleting projects:', error)
        return { error: error.message }
    }

    revalidatePath('/projects')
    return { success: true, count: projectIds.length }
}
