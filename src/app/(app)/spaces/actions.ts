'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSpaceProgress } from '@/app/(app)/spaces/progress-actions'
import { sanitizeStoragePath, isValidStoragePath } from '@/lib/storage-security'

export async function createSpace(formData: FormData) {
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
        return { error: 'Customer name is required' }
    }

    // Insert project (defaults to 'draft' status in database)
    const { data: project, error: projectError } = await supabase
        .from('spaces')
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
        .from('space_members')
        .insert({
            space_id: project.id,
            user_id: user.id,
            role: 'owner',
            joined_at: new Date().toISOString()
        })

    if (memberError) {
        // Optional: cleanup project if membership fails
        await supabase.from('spaces').delete().eq('id', project.id)
        return { error: memberError.message }
    }

    revalidatePath('/spaces')
    return { success: true, spaceId: project.id, organizationId: membership.organization_id }
}

export async function getSpaces(includeArchived: boolean = false) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Build query
    let query = supabase
        .from('spaces_with_assigned')
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
    const spaceIds = projects.map(p => p.id)

    // Fetch activity data
    const { data: activityData } = await supabase
        .from('activity_log')
        .select('space_id, created_at')
        .in('space_id', spaceIds)
        .order('created_at', { ascending: false })

    // Fetch task blocks and responses for overdue calculation
    // Fetch overdue tasks logic (blocks/responses)
    const { data: pages } = await supabase
        .from('pages')
        .select('id, space_id')
        .in('space_id', spaceIds)
        .is('deleted_at', null)

    const pageIds = pages?.map(p => p.id) || []

    // Fetch portal visits data
    const { data: visitsData } = await supabase
        .from('portal_visits')
        .select('space_id, visited_at')
        .in('space_id', spaceIds)
        .order('visited_at', { ascending: false })

    // Fetch tags for all projects
    const { data: projectTagsData } = await supabase
        .from('space_tags')
        .select('space_id, tag_id, tags(id, name, color)')
        .in('space_id', spaceIds)

    const { data: taskBlocks } = await supabase
        .from('blocks')
        .select('id, page_id, content')
        .in('page_id', pageIds)
        .eq('type', 'task')

    const taskBlockIds = taskBlocks?.map(b => b.id) || []

    const { data: taskResponses } = await supabase
        .from('responses')
        .select('block_id, value')
        .in('block_id', taskBlockIds)

    // Build lookup maps for computed fields
    const lastActivityMap = new Map<string, string>()
    activityData?.forEach(activity => {
        if (!lastActivityMap.has(activity.space_id)) {
            lastActivityMap.set(activity.space_id, activity.created_at)
        }
    })

    // Calculate overdue and next due date
    const overdueTasksMap = new Map<string, number>()
    const nextDueDateMap = new Map<string, string | null>()
    const today = new Date().toISOString().split('T')[0]

    // Create a map of pageId -> spaceId for quick lookup
    const pageToSpaceMap = new Map<string, string>()
    pages?.forEach(p => pageToSpaceMap.set(p.id, p.space_id))

    taskBlocks?.forEach(block => {
        const spaceId = pageToSpaceMap.get(block.page_id)
        if (!spaceId) return

        const content = block.content as any
        const tasks = content?.tasks || []
        const response = taskResponses?.find(r => r.block_id === block.id)
        const taskStatuses = response?.value?.tasks || {}

        tasks.forEach((task: any) => {
            const status = taskStatuses[task.id] || 'pending'

            // Count overdue tasks
            if (task.dueDate && task.dueDate < today && status !== 'completed') {
                overdueTasksMap.set(spaceId, (overdueTasksMap.get(spaceId) || 0) + 1)
            }

            // Find next due date
            if (task.dueDate && task.dueDate >= today && status !== 'completed') {
                const current = nextDueDateMap.get(spaceId)
                if (!current || task.dueDate < current) {
                    nextDueDateMap.set(spaceId, task.dueDate)
                }
            }
        })
    })

    const lastVisitMap = new Map<string, string>()
    const visitsCountMap = new Map<string, number>()
    visitsData?.forEach(visit => {
        // Track last visit
        if (!lastVisitMap.has(visit.space_id)) {
            lastVisitMap.set(visit.space_id, visit.visited_at)
        }
        // Count visits
        visitsCountMap.set(visit.space_id, (visitsCountMap.get(visit.space_id) || 0) + 1)
    })

    // Build tags map
    const tagsMap = new Map<string, Array<{ id: string; name: string; color: string }>>()
    projectTagsData?.forEach(pt => {
        const tag = pt.tags as any
        if (tag) {
            const existing = tagsMap.get(pt.space_id) || []
            existing.push({ id: tag.id, name: tag.name, color: tag.color })
            tagsMap.set(pt.space_id, existing)
        }
    })

    // Enhance projects with computed fields and avatars
    const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
            const { createClient: createServerClient } = await import('@/lib/supabase/server')
            const supabase = await createServerClient()

            // Generate signed URL for avatar (with path validation)
            let avatarUrl = null
            if (project.assigned_user?.avatar_url && isValidStoragePath(project.assigned_user.avatar_url)) {
                const safePath = sanitizeStoragePath(project.assigned_user.avatar_url)
                const { data } = await supabase.storage
                    .from('avatars')
                    .createSignedUrl(safePath, 60 * 60 * 24)
                avatarUrl = data?.signedUrl || null
            }

            // Generate signed URL for client logo (with path validation)
            let clientLogoUrl = null
            if (project.client_logo_url && isValidStoragePath(project.client_logo_url)) {
                const safePath = sanitizeStoragePath(project.client_logo_url)
                const { data } = await supabase.storage
                    .from('client-logos')
                    .createSignedUrl(safePath, 60 * 60 * 24)
                clientLogoUrl = data?.signedUrl || null
            }

            // Calculate project progress
            const progressData = await getSpaceProgress(project.id)
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
        .from('spaces')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !project) {
        console.error('Error fetching project:', error)
        return null
    }

    return project
}

export async function deleteSpaces(spaceIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // First verify user has access to these projects (RLS check)
    const { data: projects, error: checkError } = await supabase
        .from('spaces')
        .select('id')
        .in('id', spaceIds)

    if (checkError || !projects || projects.length !== spaceIds.length) {
        return { error: 'Unauthorized or projects not found' }
    }

    // Use admin client to perform soft delete (bypass RLS)
    const adminClient = await createAdminClient()
    const { error } = await adminClient
        .from('spaces')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', spaceIds)

    if (error) {
        console.error('Error deleting projects:', error)
        return { error: error.message }
    }

    revalidatePath('/spaces')
    return { success: true, count: spaceIds.length }
}

export async function duplicateSpace(spaceId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Use admin client for data operations to ensure no RLS blocking during copy
    const adminClient = await createAdminClient()

    // 1. Get original space
    const { data: originalSpace, error: spaceError } = await adminClient
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single()

    if (spaceError || !originalSpace) {
        return { error: 'Original space not found' }
    }

    // 2. Create new space
    const { data: newSpace, error: createError } = await adminClient
        .from('spaces')
        .insert({
            organization_id: originalSpace.organization_id,
            name: `${originalSpace.name} (Copy)`,
            client_name: originalSpace.client_name,
            client_logo_url: originalSpace.client_logo_url,
            target_go_live_date: originalSpace.target_go_live_date,
            status: 'draft',
            created_by: user.id,
            assigned_to: user.id
        })
        .select()
        .single()

    if (createError) {
        return { error: `Failed to create space: ${createError.message}` }
    }

    // 3. Add owner membership
    const { error: memberError } = await adminClient
        .from('space_members')
        .insert({
            space_id: newSpace.id,
            user_id: user.id,
            role: 'owner',
            joined_at: new Date().toISOString()
        })

    if (memberError) {
        await adminClient.from('spaces').delete().eq('id', newSpace.id)
        return { error: `Failed to add member: ${memberError.message}` }
    }

    // 4. Copy Pages
    const { data: pages } = await adminClient
        .from('pages')
        .select('*')
        .eq('space_id', spaceId)
        .is('deleted_at', null)

    if (pages && pages.length > 0) {
        for (const page of pages) {
            // Create new page
            const { data: newPage, error: pageCreateError } = await adminClient
                .from('pages')
                .insert({
                    space_id: newSpace.id,
                    title: page.title,
                    slug: page.slug, // Reusing slug; might be an issue if constraints exist
                    order: page.order
                })
                .select()
                .single()

            if (pageCreateError) {
                console.error('Failed to copy page:', pageCreateError)
                continue
            }

            // 5. Copy Blocks for this page
            const { data: blocks } = await adminClient
                .from('blocks')
                .select('*')
                .eq('page_id', page.id)

            if (blocks && blocks.length > 0) {
                // Strip system fields 
                // Note: We need to handle potential nulls if select * returns nullable fields
                const blocksToInsert = blocks.map(b => {
                    const { id, created_at, updated_at, page_id, ...rest } = b
                    return {
                        ...rest,
                        page_id: newPage.id
                    }
                })

                if (blocksToInsert.length > 0) {
                    const { error: blocksError } = await adminClient.from('blocks').insert(blocksToInsert)
                    if (blocksError) {
                        console.error('Failed to copy blocks:', blocksError)
                    }
                }
            }
        }
    }

    revalidatePath('/spaces')
    return { success: true, spaceId: newSpace.id }
}
