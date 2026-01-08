'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyPortalSession } from '@/lib/portal-auth'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/app/(app)/spaces/progress-actions'

async function getAuthPortalClient(spaceId: string) {
    // 1. Check if internal staff (Supabase user) - they bypass portal session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: membership } = await supabase
            .from('space_members')
            .select('id')
            .eq('space_id', spaceId)
            .single()

        if (membership) {
            return supabase // Staff uses their own client (RLS handles it)
        }
    }

    // 2. For non-staff, ALWAYS require a portal session
    // The session is created by the access page after proper authentication (password, email, etc.)
    const session = await verifyPortalSession(spaceId)

    if (!session) {
        // No session = no access (they need to go through /access page first)
        return null
    }

    // 3. Session exists - use admin client for data access
    const adminSupabase = await createAdminClient()

    // Check project access mode to determine if we need membership verification
    const { data: project } = await adminSupabase
        .from('spaces')
        .select('access_mode')
        .eq('id', spaceId)
        .single()

    // For public access mode, allow any valid session (including anonymous)
    if (project?.access_mode === 'public') {
        return adminSupabase
    }

    // For restricted access, verify the session email is in the approved list
    const { data: member, error: memberError } = await adminSupabase
        .from('space_members')
        .select('id, role, invited_email')
        .eq('space_id', spaceId)
        .eq('invited_email', session.email)
        .single()

    if (memberError) {
        console.error('[getAuthPortalClient] Error checking membership:', memberError)
    }

    if (!member) {
        console.error('[getAuthPortalClient] No membership found for', session.email)
        return null
    }

    return adminSupabase
}

export async function validatePortalAccess(spaceId: string) {
    const adminSupabase = await createAdminClient()

    // Check project status
    const { data: project } = await adminSupabase
        .from('spaces')
        .select('status, client_name')
        .eq('id', spaceId)
        .single()

    if (!project) {
        return { allowed: false, reason: 'not_found' as const, readOnly: false }
    }

    // Block draft projects
    if (project.status === 'draft') {
        return { allowed: false, reason: 'not_ready' as const, readOnly: false }
    }

    // Block archived projects
    if (project.status === 'archived') {
        return { allowed: false, reason: 'archived' as const, readOnly: false }
    }

    // Allow active and completed projects
    // Completed projects are read-only
    return {
        allowed: true,
        reason: null,
        readOnly: project.status === 'completed'
    }
}

export async function getPortalSpace(spaceId: string) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return null

    // Validate access based on status
    const accessCheck = await validatePortalAccess(spaceId)
    if (!accessCheck.allowed) {
        return null
    }

    const { data: project, error } = await supabase
        .from('spaces')
        .select(`
            *,
            organization:organizations(name, logo_path, brand_color)
        `)
        .eq('id', spaceId)
        .in('status', ['active', 'completed']) // Allow both active and completed
        .is('deleted_at', null)
        .single()

    if (error || !project) {
        console.error('Portal access error:', error)
        return null
    }

    return project
}

export async function getPortalPages(spaceId: string) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return []

    const { data: pages, error } = await supabase
        .from('pages')
        .select('id, title, slug, sort_order')
        .eq('space_id', spaceId)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching portal pages:', error)
        return []
    }

    return pages
}

export async function getPortalPageWithBlocks(spaceId: string, pageSlug: string) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return null

    // First get the page
    const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('space_id', spaceId)
        .eq('slug', pageSlug)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .single()

    if (pageError || !page) {
        return null
    }

    // Then get blocks (exclude deleted ones)
    const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .eq('page_id', page.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

    if (blocksError) {
        console.error('Error fetching portal blocks:', blocksError)
        return { ...page, blocks: [] }
    }

    return { ...page, blocks }
}

export async function getPortalTasks(spaceId: string, pageId: string) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return {}

    // 1. Get all task blocks for this page
    const { data: blocks } = await supabase
        .from('blocks')
        .select('id')
        .eq('page_id', pageId)
        .eq('type', 'task')

    if (!blocks || blocks.length === 0) return {}

    // 2. Get responses for those blocks (task statuses are stored in responses now)
    const blockIds = blocks.map(b => b.id)
    const { data: responses } = await supabase
        .from('responses')
        .select('block_id, value')
        .in('block_id', blockIds)

    // 3. Expand task statuses into composite keys
    const taskMap: Record<string, 'pending' | 'completed'> = {}
    responses?.forEach(r => {
        if (r.value && r.value.tasks) {
            // New format: { tasks: { "taskId": "status" } }
            Object.entries(r.value.tasks).forEach(([taskId, status]) => {
                const compositeKey = `${r.block_id}-${taskId}`
                taskMap[compositeKey] = status as 'pending' | 'completed'
            })
        }
    })

    return taskMap
}

export async function toggleTaskStatus(blockId: string, spaceId: string, taskTitle?: string) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(spaceId)
    if (accessCheck.readOnly) {
        return { error: 'This project is archived and cannot be edited.' }
    }

    // Get current status
    const { data: task } = await supabase
        .from('tasks')
        .select('status')
        .eq('block_id', blockId)
        .single()

    if (!task) return { error: 'Task not found' }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed'

    const { error } = await supabase
        .from('tasks')
        .update({
            status: newStatus,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('block_id', blockId)

    if (error) return { error: error.message }

    // Log activity with task title in metadata
    const session = await verifyPortalSession(spaceId)
    const actorEmail = session?.email || 'anonymous'
    await logActivity(
        spaceId,
        actorEmail,
        newStatus === 'completed' ? 'task.completed' : 'task.reopened',
        'task',
        blockId,
        { taskTitle: taskTitle || 'Unknown task' }
    )

    revalidatePath(`/space/${spaceId}/shared`, 'layout')
    return { success: true, status: newStatus }
}

export async function saveResponse(blockId: string, spaceId: string, value: any) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(spaceId)
    if (accessCheck.readOnly) {
        return { error: 'This project is archived and cannot be edited.' }
    }

    // Check if this is a portal customer or authenticated staff (for tracking only)
    const session = await verifyPortalSession(spaceId)
    const isPortalCustomer = !!session

    let responseData: any = {
        block_id: blockId,
        value,
        updated_at: new Date().toISOString()
    }

    let actorEmail = 'unknown'

    // Optional: Track who last updated (for audit trail)
    if (isPortalCustomer) {
        responseData.customer_email = session.email
        actorEmail = session.email
    } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            responseData.user_id = user.id
            const { data: userData } = await supabase
                .from('auth.users')
                .select('email')
                .eq('id', user.id)
                .single()
            actorEmail = userData?.email || user.email || 'unknown'
        }
    }

    // Check if this is a new response or update
    const { data: existing } = await supabase
        .from('responses')
        .select('id')
        .eq('block_id', blockId)
        .single()

    const { data, error } = await supabase
        .from('responses')
        .upsert(responseData, {
            onConflict: 'block_id'
        })
        .select()

    if (error) {
        console.error('[saveResponse] Failed:', error)
        return { error: error.message }
    }

    // Log activity for form submissions
    const { data: block } = await supabase
        .from('blocks')
        .select('type, content')
        .eq('id', blockId)
        .single()

    if (block && block.type === 'form') {
        const formTitle = (block.content as any)?.title || 'Form'
        await logActivity(
            spaceId,
            actorEmail,
            'form.submitted',
            'form',
            blockId,
            { formTitle }
        )
    }

    return { success: true }
}

export async function getResponses(pageId: string) {
    // We need space_id to verify access, but getResponses only gets pageId.
    // For simplicity, we can fetch page first to get space_id, 
    // or assume the library/caller already verified.
    // Let's use standard client for now if it's hitting a page the user is already on.
    // Actually, to be safe:
    const admin = await createAdminClient()
    const { data: page } = await admin.from('pages').select('space_id').eq('id', pageId).single()
    if (!page) return []

    const supabase = await getAuthPortalClient(page.space_id)
    if (!supabase) return []

    const { data: blocks } = await supabase
        .from('blocks')
        .select('id')
        .eq('page_id', pageId)

    if (!blocks || blocks.length === 0) return []

    const blockIds = blocks.map(b => b.id)

    const { data: responses } = await supabase
        .from('responses')
        .select('*')
        .in('block_id', blockIds)

    return responses || []
}

export async function uploadFile(
    blockId: string,
    spaceId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    storagePath: string
) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(spaceId)
    if (accessCheck.readOnly) {
        return { error: 'This project is archived and cannot be edited.' }
    }

    const { data, error } = await supabase
        .from('files')
        .insert({
            block_id: blockId,
            space_id: spaceId,
            original_name: fileName,
            mime_type: fileType,
            file_size_bytes: fileSize,
            storage_path: storagePath
        })
        .select()
        .single()

    if (error) return { error: error.message }

    // Log activity
    const session = await verifyPortalSession(spaceId)
    const actorEmail = session?.email || 'unknown'
    await logActivity(
        spaceId,
        actorEmail,
        'file.uploaded',
        'file',
        data.id,
        { fileName, fileType, fileSize }
    )

    revalidatePath(`/space/${spaceId}/shared`, 'layout')
    return { success: true, file: data }
}

export async function deleteFile(fileId: string, spaceId: string, fileName?: string) {
    const supabase = await getAuthPortalClient(spaceId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(spaceId)
    if (accessCheck.readOnly) {
        return { error: 'This project is archived and cannot be edited.' }
    }

    // Get file name if not provided
    let actualFileName = fileName
    if (!actualFileName) {
        const { data: file } = await supabase
            .from('files')
            .select('original_name')
            .eq('id', fileId)
            .single()
        actualFileName = file?.original_name || 'Unknown file'
    }

    const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId)

    if (error) return { error: error.message }

    // Log activity with file name
    const session = await verifyPortalSession(spaceId)
    const actorEmail = session?.email || 'anonymous'
    await logActivity(
        spaceId,
        actorEmail,
        'file.deleted',
        'file',
        fileId,
        { fileName: actualFileName }
    )

    revalidatePath(`/space/${spaceId}/shared`, 'layout')
    return { success: true }
}

export async function getFilesForBlock(blockId: string) {
    // Similar to getResponses, need project security
    const admin = await createAdminClient()
    const { data: block } = await admin.from('blocks').select('page:pages(space_id)').eq('id', blockId).single()
    if (!block?.page) return []

    const supabase = await getAuthPortalClient((block.page as any).space_id)
    if (!supabase) return []

    const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('block_id', blockId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) return []
    return data
}

/**
 * Log when a customer views a specific page
 */
export async function logPageView(spaceId: string, pageId: string, pageName: string) {
    const session = await verifyPortalSession(spaceId)
    const actorEmail = session?.email || 'anonymous'

    await logActivity(
        spaceId,
        actorEmail,
        'page.viewed',
        'page',
        pageId,
        { pageName }
    )
}

/**
 * Log when a customer downloads a file
 */
export async function logFileDownload(spaceId: string, fileId: string, fileName: string) {
    const session = await verifyPortalSession(spaceId)
    const actorEmail = session?.email || 'anonymous'

    await logActivity(
        spaceId,
        actorEmail,
        'file.downloaded',
        'file',
        fileId,
        { fileName }
    )
}

/**
 * Log when a customer completes or reopens a task
 */
export async function logTaskActivity(
    spaceId: string,
    blockId: string,
    taskId: string,
    taskTitle: string,
    newStatus: 'completed' | 'pending'
) {
    const session = await verifyPortalSession(spaceId)
    const actorEmail = session?.email || 'anonymous'

    await logActivity(
        spaceId,
        actorEmail,
        newStatus === 'completed' ? 'task.completed' : 'task.reopened',
        'task',
        `${blockId}-${taskId}`,
        { taskTitle }
    )
}
