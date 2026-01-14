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

    // 3. Auto-update space status if task/form/file_upload block
    if (['task', 'form', 'file_upload'].includes(type)) {
        const { data: page } = await supabase
            .from('pages')
            .select('space_id')
            .eq('id', pageId)
            .single()

        if (page?.space_id) {
            const { autoUpdateSpaceStatus } = await import('../auto-status-actions')
            await autoUpdateSpaceStatus(page.space_id)
        }
    }

    return { success: true, block }
}

export async function updateBlock(blockId: string, content: any) {
    const supabase = await createClient()

    // Get block type to determine if we need to auto-update status
    const { data: block } = await supabase
        .from('blocks')
        .select('type, page_id, pages!inner(space_id)')
        .eq('id', blockId)
        .single()

    const { error } = await supabase
        .from('blocks')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', blockId)

    if (error) {
        return { error: error.message }
    }

    // Auto-update space status if task/form/file_upload block
    if (block && ['task', 'form', 'file_upload'].includes(block.type)) {
        const spaceId = (block.pages as any)?.space_id
        if (spaceId) {
            const { autoUpdateSpaceStatus } = await import('../auto-status-actions')
            await autoUpdateSpaceStatus(spaceId)
        }
    }

    return { success: true }
}

export async function deleteBlock(blockId: string) {
    const supabase = await createClient()

    // Get block type to determine if we need to auto-update status
    const { data: block } = await supabase
        .from('blocks')
        .select('type, page_id, pages!inner(space_id)')
        .eq('id', blockId)
        .single()

    const { error } = await supabase
        .from('blocks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', blockId)

    if (error) {
        return { error: error.message }
    }

    // Auto-update space status if task/form/file_upload block
    if (block && ['task', 'form', 'file_upload'].includes(block.type)) {
        const spaceId = (block.pages as any)?.space_id
        if (spaceId) {
            const { autoUpdateSpaceStatus } = await import('../auto-status-actions')
            await autoUpdateSpaceStatus(spaceId)
        }
    }

    return { success: true }
}

export async function duplicateBlock(blockId: string) {
    const supabase = await createClient()

    // Get the original block
    const { data: original, error: fetchError } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', blockId)
        .single()

    if (fetchError || !original) {
        return { error: fetchError?.message || 'Block not found' }
    }

    // Get next sort order (place after the original)
    const { data: laterBlocks } = await supabase
        .from('blocks')
        .select('id, sort_order')
        .eq('page_id', original.page_id)
        .gt('sort_order', original.sort_order)
        .is('deleted_at', null)

    // Shift later blocks down by 1
    if (laterBlocks && laterBlocks.length > 0) {
        await Promise.all(laterBlocks.map(b =>
            supabase
                .from('blocks')
                .update({ sort_order: b.sort_order + 1 })
                .eq('id', b.id)
        ))
    }

    // Create duplicate with sort_order right after original
    const { data: newBlock, error: insertError } = await supabase
        .from('blocks')
        .insert({
            page_id: original.page_id,
            type: original.type,
            content: original.content,
            sort_order: original.sort_order + 1
        })
        .select()
        .single()

    if (insertError) {
        return { error: insertError.message }
    }

    return { success: true, block: newBlock }
}

export async function moveBlockToPage(blockId: string, targetPageId: string) {
    const supabase = await createClient()

    // Get the original block
    const { data: original, error: fetchError } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', blockId)
        .single()

    if (fetchError || !original) {
        return { error: fetchError?.message || 'Block not found' }
    }

    // Get next sort order on target page
    const { data: lastBlock } = await supabase
        .from('blocks')
        .select('sort_order')
        .eq('page_id', targetPageId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    const newSortOrder = lastBlock ? lastBlock.sort_order + 1 : 0

    // Move the block
    const { error: updateError } = await supabase
        .from('blocks')
        .update({
            page_id: targetPageId,
            sort_order: newSortOrder,
            updated_at: new Date().toISOString()
        })
        .eq('id', blockId)

    if (updateError) {
        return { error: updateError.message }
    }

    return { success: true, sourcePageId: original.page_id }
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

    const { error } = await supabase.rpc('delete_block_rpc', {
        p_block_id: blockId
    })

    if (error) {
        console.error(`RPC error deleting block ${blockId}:`, error)
        return { error: error.message }
    }

    return { success: true }
}

// Action Plan Block Actions

export async function createActionPlanBlock(pageId: string, spaceId: string, content: any, sortOrder: number) {
    const supabase = await createClient()

    // Create block (everything stored in JSONB content)
    const { data: block, error: blockError } = await supabase
        .from('blocks')
        .insert({
            page_id: pageId,
            type: 'action_plan',
            content,
            sort_order: sortOrder
        })
        .select()
        .single()

    if (blockError) return { error: blockError.message }

    return { success: true, block }
}

export async function updateActionPlanBlock(blockId: string, spaceId: string, content: any) {
    const supabase = await createClient()

    // Update block content
    const { error: blockError } = await supabase
        .from('blocks')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', blockId)

    if (blockError) return { error: blockError.message }

    return { success: true }
}

export async function deleteActionPlanBlock(blockId: string) {
    const supabase = await createClient()

    // Soft delete block
    const { error } = await supabase
        .from('blocks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', blockId)

    if (error) {
        console.error(`Error deleting action_plan block ${blockId}:`, error)
        return { error: error.message }
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
            } else if (block.type === 'action_plan') {
                await createActionPlanBlock(pageId, spaceId, block.content, block.sort_order)
            } else {
                const { error: insertError } = await supabase.from('blocks').insert({
                    page_id: pageId,
                    type: block.type,
                    content: block.content,
                    sort_order: block.sort_order
                })
                if (insertError) {
                    console.error(`Error inserting block type ${block.type}:`, insertError)
                }
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
            } else if (block.type === 'action_plan') {
                // Update action_plan block content via existing function
                await updateActionPlanBlock(block.id, spaceId, block.content)
                // Also update sort_order separately
                await supabase.from('blocks').update({
                    sort_order: block.sort_order,
                    updated_at: new Date().toISOString()
                }).eq('id', block.id)
            } else {
                const { error: updateError } = await supabase.from('blocks').update({
                    content: block.content,
                    sort_order: block.sort_order,
                    updated_at: new Date().toISOString()
                }).eq('id', block.id)
                if (updateError) {
                    console.error(`Error updating block ${block.id}:`, updateError)
                }
            }
        }
    }

    revalidatePath(`/spaces/${spaceId}`)
    return { success: true }
}

/**
 * Get all action plan blocks from a space
 * Used by the Next Task Block editor to select which action plans to display tasks from
 */
export async function getActionPlanBlocksForSpace(spaceId: string) {
    const supabase = await createClient()

    // Get all pages in the space
    const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('id, title')
        .eq('space_id', spaceId)
        .is('deleted_at', null)

    if (pagesError) {
        console.error('Error fetching pages:', pagesError)
        return []
    }

    if (!pages || pages.length === 0) return []

    // Get all action plan blocks from those pages
    const pageIds = pages.map(p => p.id)
    const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('id, page_id, content, sort_order')
        .eq('type', 'action_plan')
        .in('page_id', pageIds)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

    if (blocksError) {
        console.error('Error fetching action plan blocks:', blocksError)
        return []
    }

    // Join with page titles for display
    return (blocks || []).map(block => {
        const page = pages.find(p => p.id === block.page_id)
        return {
            id: block.id,
            pageId: block.page_id,
            pageTitle: page?.title || 'Unknown Page',
            title: block.content?.title || 'Untitled Action Plan',
            milestonesCount: block.content?.milestones?.length || 0,
        }
    })
}
