'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyPortalSession } from '@/lib/portal-auth'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/app/dashboard/progress-actions'

async function getAuthPortalClient(projectId: string) {
    // 1. Verify custom portal session
    const session = await verifyPortalSession(projectId)

    // 2. If no session, they might be internal staff (Supabase user)
    if (!session) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // If staff, verify they have access to this project
        if (user) {
            const { data: membership } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .single()

            if (membership) return supabase // Staff uses their own client (RLS handles it)
        }

        return null // No valid session or staff access
    }

    // 3. For customers with a valid cookie, use admin client
    // We trust the cookie because it's signed and contains the email/projectId
    const adminSupabase = await createAdminClient()

    // Double check membership for this email just in case (revocation support)
    const { data: member, error: memberError } = await adminSupabase
        .from('project_members')
        .select('id, role, invited_email')
        .eq('project_id', projectId)
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

export async function validatePortalAccess(projectId: string) {
    const adminSupabase = await createAdminClient()

    // Check project status
    const { data: project } = await adminSupabase
        .from('projects')
        .select('status, client_name')
        .eq('id', projectId)
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

export async function getPortalProject(projectId: string) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return null

    // Validate access based on status
    const accessCheck = await validatePortalAccess(projectId)
    if (!accessCheck.allowed) {
        return null
    }

    const { data: project, error } = await supabase
        .from('projects')
        .select(`
            *,
            organization:organizations(name, logo_path, brand_color)
        `)
        .eq('id', projectId)
        .in('status', ['active', 'completed']) // Allow both active and completed
        .is('deleted_at', null)
        .single()

    if (error || !project) {
        console.error('Portal access error:', error)
        return null
    }

    return project
}

export async function getPortalPages(projectId: string) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return []

    const { data: pages, error } = await supabase
        .from('pages')
        .select('id, title, slug, sort_order')
        .eq('project_id', projectId)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching portal pages:', error)
        return []
    }

    return pages
}

export async function getPortalPageWithBlocks(projectId: string, pageSlug: string) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return null

    // First get the page
    const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', projectId)
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

export async function getPortalTasks(projectId: string, pageId: string) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return {}

    // 1. Get all task blocks for this page
    const { data: blocks } = await supabase
        .from('blocks')
        .select('id')
        .eq('page_id', pageId)
        .eq('type', 'task')

    if (!blocks || blocks.length === 0) return {}

    // 2. Get task records for those blocks
    const blockIds = blocks.map(b => b.id)
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, block_id, status')
        .in('block_id', blockIds)

    const taskMap: Record<string, 'pending' | 'completed'> = {}
    tasks?.forEach(t => {
        taskMap[t.block_id] = t.status as 'pending' | 'completed'
    })
    return taskMap
}

export async function toggleTaskStatus(blockId: string, projectId: string) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(projectId)
    if (accessCheck.readOnly) {
        return { error: 'Detta projekt är avslutat och kan inte längre redigeras.' }
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

    // Log activity
    const session = await verifyPortalSession(projectId)
    const actorEmail = session?.email || 'unknown'
    await logActivity(
        projectId,
        actorEmail,
        newStatus === 'completed' ? 'task.completed' : 'task.uncompleted',
        'task',
        blockId
    )

    revalidatePath(`/portal/${projectId}`, 'layout')
    return { success: true, status: newStatus }
}

export async function saveResponse(blockId: string, projectId: string, value: any) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(projectId)
    if (accessCheck.readOnly) {
        return { error: 'Detta projekt är avslutat och kan inte längre redigeras.' }
    }

    // Check if this is a portal customer or authenticated staff (for tracking only)
    const session = await verifyPortalSession(projectId)
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

    // Log activity - determine if it's a question or checklist
    const { data: block } = await supabase
        .from('blocks')
        .select('type')
        .eq('id', blockId)
        .single()

    if (block) {
        const action = block.type === 'question' ? 'question.answered' : 'checklist.updated'
        await logActivity(projectId, actorEmail, action, block.type, blockId)
    }

    return { success: true }
}

export async function getResponses(pageId: string) {
    // We need project_id to verify access, but getResponses only gets pageId.
    // For simplicity, we can fetch page first to get project_id, 
    // or assume the library/caller already verified.
    // Let's use standard client for now if it's hitting a page the user is already on.
    // Actually, to be safe:
    const admin = await createAdminClient()
    const { data: page } = await admin.from('pages').select('project_id').eq('id', pageId).single()
    if (!page) return []

    const supabase = await getAuthPortalClient(page.project_id)
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
    projectId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    storagePath: string
) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(projectId)
    if (accessCheck.readOnly) {
        return { error: 'Detta projekt är avslutat och kan inte längre redigeras.' }
    }

    const { data, error } = await supabase
        .from('files')
        .insert({
            block_id: blockId,
            project_id: projectId,
            original_name: fileName,
            mime_type: fileType,
            file_size_bytes: fileSize,
            storage_path: storagePath
        })
        .select()
        .single()

    if (error) return { error: error.message }

    // Log activity
    const session = await verifyPortalSession(projectId)
    const actorEmail = session?.email || 'unknown'
    await logActivity(
        projectId,
        actorEmail,
        'file.uploaded',
        'file',
        data.id,
        { fileName, fileType, fileSize }
    )

    revalidatePath(`/portal/${projectId}`, 'layout')
    return { success: true, file: data }
}

export async function deleteFile(fileId: string, projectId: string) {
    const supabase = await getAuthPortalClient(projectId)
    if (!supabase) return { error: 'Not authorized' }

    // Check if project is read-only
    const accessCheck = await validatePortalAccess(projectId)
    if (accessCheck.readOnly) {
        return { error: 'Detta projekt är avslutat och kan inte längre redigeras.' }
    }

    const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId)

    if (error) return { error: error.message }

    // Log activity
    const session = await verifyPortalSession(projectId)
    const actorEmail = session?.email || 'unknown'
    await logActivity(
        projectId,
        actorEmail,
        'file.deleted',
        'file',
        fileId
    )

    revalidatePath(`/portal/${projectId}`, 'layout')
    return { success: true }
}

export async function getFilesForBlock(blockId: string) {
    // Similar to getResponses, need project security
    const admin = await createAdminClient()
    const { data: block } = await admin.from('blocks').select('page:pages(project_id)').eq('id', blockId).single()
    if (!block?.page) return []

    const supabase = await getAuthPortalClient((block.page as any).project_id)
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
