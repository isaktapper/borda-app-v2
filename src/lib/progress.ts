/**
 * Progress calculation utilities
 * Calculates project progress based on interactive blocks only
 */

import { createClient } from '@/lib/supabase/server'

interface Block {
    id: string
    type: string
    content: any
}

interface Task {
    status: string
}

interface Response {
    response_data: any
}

interface File {
    id: string
}

/**
 * Calculate progress for a single block
 * Returns a number between 0 and 1 (0% to 100%)
 */
async function calculateBlockProgress(block: Block, supabase: any): Promise<number | null> {
    switch (block.type) {
        case 'task': {
            // Get all tasks for this block
            const { data: tasks } = await supabase
                .from('tasks')
                .select('status')
                .eq('block_id', block.id)

            if (!tasks || tasks.length === 0) return null // Not an interactive block if no tasks

            const completedTasks = tasks.filter((t: Task) => t.status === 'completed').length
            return completedTasks / tasks.length
        }

        case 'question': {
            // Check if customer has responded
            const { data: responses } = await supabase
                .from('responses')
                .select('response_data')
                .eq('block_id', block.id)
                .limit(1)

            // If any response exists, consider it completed
            return responses && responses.length > 0 ? 1 : 0
        }

        case 'checklist': {
            // Get customer response with checked items
            const { data: responses } = await supabase
                .from('responses')
                .select('response_data')
                .eq('block_id', block.id)
                .limit(1)

            if (!responses || responses.length === 0) {
                // No response yet, 0% complete
                return 0
            }

            const checkedItems = responses[0].response_data?.checked_items || []
            const totalItems = block.content?.items?.length || 0

            if (totalItems === 0) return null // Not interactive if no items

            return checkedItems.length / totalItems
        }

        case 'file': {
            // Check if this is an upload-type file block
            // Download-type files are informational, not interactive
            const isUpload = block.content?.type === 'upload'

            if (!isUpload) return null // Download files don't count

            // Check if customer has uploaded a file
            const { data: files } = await supabase
                .from('files')
                .select('id')
                .eq('block_id', block.id)
                .limit(1)

            return files && files.length > 0 ? 1 : 0
        }

        // Informational blocks - don't count towards progress
        case 'text':
        case 'embed':
        case 'contact':
        case 'divider':
            return null

        default:
            return null
    }
}

/**
 * Calculate overall project progress
 * Only considers interactive blocks (tasks, questions, checklists, upload files)
 * Returns a number between 0 and 100
 */
export async function calculateProjectProgress(projectId: string): Promise<number> {
    const supabase = await createClient()

    // Get all blocks for all pages in this project
    const { data: blocks } = await supabase
        .from('blocks')
        .select('id, type, content, pages!inner(project_id)')
        .eq('pages.project_id', projectId)
        .is('deleted_at', null)

    if (!blocks || blocks.length === 0) return 0

    // Calculate progress for each block
    const progressScores: number[] = []

    for (const block of blocks) {
        const score = await calculateBlockProgress(block, supabase)
        if (score !== null) {
            progressScores.push(score)
        }
    }

    // If no interactive blocks, return 0
    if (progressScores.length === 0) return 0

    // Calculate average progress
    const totalProgress = progressScores.reduce((sum, score) => sum + score, 0)
    const averageProgress = totalProgress / progressScores.length

    // Return as percentage (0-100)
    return Math.round(averageProgress * 100)
}
