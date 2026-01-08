'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getBlocks(pageId: string) {
    const supabase = await createClient()

    const { data: blocks, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('page_id', pageId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching blocks:', error)
        return []
    }

    return blocks || []
}

export async function createBlock(pageId: string, type: string, content: any = {}) {
    const supabase = await createClient()

    // 1. Get next sort order
    const { data: lastBlock } = await supabase
        .from('blocks')
        .select('sort_order')
        .eq('page_id', pageId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    const sortOrder = lastBlock ? lastBlock.sort_order + 1 : 0

    // 2. Insert block
    const { data: block, error } = await supabase
        .from('blocks')
        .insert({
            page_id: pageId,
            type,
            content,
            sort_order: sortOrder
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    return { success: true, block }
}

export async function updateBlock(blockId: string, content: any) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('blocks')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', blockId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function deleteBlock(blockId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('blocks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', blockId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function reorderBlocks(pageId: string, blockIds: string[]) {
    const supabase = await createClient()

    const updates = blockIds.map((id, index) =>
        supabase
            .from('blocks')
            .update({ sort_order: index })
            .eq('id', id)
            .eq('page_id', pageId)
    )

    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error)

    if (errors.length > 0) {
        console.error('Errors during reordering blocks:', errors)
        return { error: 'Failed to update some blocks' }
    }

    return { success: true }
}

export async function createTaskBlock(pageId: string, spaceId: string, content: any, sortOrder: number) {
    const supabase = await createClient()

    // 1. Create block
    const { data: block, error: blockError } = await supabase
        .from('blocks')
        .insert({
            page_id: pageId,
            type: 'task',
            content,
            sort_order: sortOrder
        })
        .select()
        .single()

    if (blockError) return { error: blockError.message }

    // 2. Create task
    const { error: taskError } = await supabase
        .from('tasks')
        .insert({
            block_id: block.id,
            space_id: spaceId,
            title: content.title || 'Untitled task',
            description: content.description,
            due_date: content.dueDate
        })

    if (taskError) return { error: taskError.message }

    return { success: true, block }
}

export async function updateTaskBlock(blockId: string, spaceId: string, content: any) {
    const supabase = await createClient()

    // 1. Update block
    const { error: blockError } = await supabase
        .from('blocks')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', blockId)

    if (blockError) return { error: blockError.message }

    // 2. Sync task (Upsert in case it was missing)
    const { error: taskError } = await supabase
        .from('tasks')
        .upsert({
            block_id: blockId,
            space_id: spaceId,
            title: content.title || 'Untitled task',
            description: content.description,
            due_date: content.dueDate,
            updated_at: new Date().toISOString()
        }, { onConflict: 'block_id' })

    if (taskError) return { error: taskError.message }

    return { success: true }
}

export async function deleteTaskBlock(blockId: string) {
    const supabase = await createClient()

    const { data: res, error } = await supabase.rpc('delete_block_rpc', {
        p_block_id: blockId
    })

    if (error) {
        console.error(`RPC internal error deleting block ${blockId}:`, error)
        return { error: error.message }
    }

    const status = res as { success: boolean, message: string }
    if (!status.success) {
        console.warn(`Deletion failed for block ${blockId}: ${status.message}`)
        return { error: status.message }
    }

    return { success: true }
}

export async function bulkUpdateBlocks(pageId: string, spaceId: string, blocks: any[]) {
    const supabase = await createClient()

    // We process sequentially for safety with sync logic
    for (const block of blocks) {
        const isNew = block.id.startsWith('new-')

        if (isNew) {
            if (block.type === 'task') {
                await createTaskBlock(pageId, spaceId, block.content, block.sort_order)
            } else {
                await supabase.from('blocks').insert({
                    page_id: pageId,
                    type: block.type,
                    content: block.content,
                    sort_order: block.sort_order
                })
            }
        } else {
            if (block.type === 'task') {
                // Update task block content via existing function
                await updateTaskBlock(block.id, spaceId, block.content)
                // FIX: Also update sort_order separately for task blocks
                await supabase.from('blocks').update({
                    sort_order: block.sort_order,
                    updated_at: new Date().toISOString()
                }).eq('id', block.id)
            } else {
                await supabase.from('blocks').update({
                    content: block.content,
                    sort_order: block.sort_order,
                    updated_at: new Date().toISOString()
                }).eq('id', block.id)
            }
        }
    }

    revalidatePath(`/dashboard/spaces/${spaceId}`)
    return { success: true }
}
