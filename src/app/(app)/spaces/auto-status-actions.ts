'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Automatically update space status based on progress
 * - If progress reaches 100% and status is 'active', set to 'completed'
 * - If progress drops below 100% and status is 'completed', revert to 'active'
 */
export async function autoUpdateSpaceStatus(spaceId: string) {
  const supabase = await createClient()

  // Get current space status
  const { data: space } = await supabase
    .from('spaces')
    .select('id, status')
    .eq('id', spaceId)
    .single()

  if (!space || (space.status !== 'active' && space.status !== 'completed')) {
    // Only auto-update between active and completed states
    return
  }

  // Calculate progress
  const progress = await calculateSpaceProgress(spaceId)

  // Determine if status should change
  let newStatus: string | null = null

  if (progress === 100 && space.status === 'active') {
    newStatus = 'completed'
  } else if (progress < 100 && space.status === 'completed') {
    newStatus = 'active'
  }

  // Update status if needed
  if (newStatus) {
    await supabase
      .from('spaces')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', spaceId)

    // Revalidate paths
    revalidatePath(`/spaces/${spaceId}`)
    revalidatePath('/spaces')
  }
}

/**
 * Calculate progress percentage for a space
 * Based on tasks, forms, and file uploads
 */
async function calculateSpaceProgress(spaceId: string): Promise<number> {
  const supabase = await createClient()

  // Get all pages for this space
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('space_id', spaceId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return 0
  }

  const pageIds = pages.map(p => p.id)

  // Get all blocks for these pages
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)
    .is('deleted_at', null)

  if (!blocks || blocks.length === 0) {
    return 0
  }

  const blockIds = blocks.map(b => b.id)

  // Get all responses
  const { data: responses } = await supabase
    .from('responses')
    .select('block_id, value')
    .in('block_id', blockIds)

  // Get all files
  const { data: files } = await supabase
    .from('files')
    .select('block_id')
    .in('block_id', blockIds)
    .is('deleted_at', null)

  // Create lookup maps
  const responsesByBlockId = new Map(responses?.map(r => [r.block_id, r]) || [])
  const filesSet = new Set(files?.map(f => f.block_id) || [])

  // Count tasks, forms, and files
  let totalTasks = 0
  let completedTasks = 0
  let totalForms = 0
  let answeredForms = 0
  let totalFiles = 0
  let uploadedFiles = 0

  blocks.forEach(block => {
    const response = responsesByBlockId.get(block.id)
    const content = block.content as any

    // Count tasks
    if (block.type === 'task') {
      const blockTasks = content?.tasks || []
      const taskStatuses = response?.value?.tasks || {}

      blockTasks.forEach((task: any) => {
        totalTasks++
        const status = taskStatuses[task.id] || 'pending'
        if (status === 'completed') {
          completedTasks++
        }
      })
    }

    // Count forms
    if (block.type === 'form') {
      const blockQuestions = content?.questions || []
      const questionAnswers = response?.value?.questions || {}

      blockQuestions.forEach((question: any) => {
        totalForms++
        const answer = questionAnswers[question.id]

        // Check if there's a meaningful answer
        let hasAnswer = false
        if (answer) {
          if (answer.text && answer.text.trim() !== '') {
            hasAnswer = true
          } else if (answer.selected) {
            if (Array.isArray(answer.selected)) {
              hasAnswer = answer.selected.length > 0
            } else {
              hasAnswer = answer.selected !== ''
            }
          } else if (answer.date) {
            hasAnswer = true
          }
        }

        if (hasAnswer) {
          answeredForms++
        }
      })
    }

    // Count file uploads
    if (block.type === 'file_upload') {
      totalFiles++
      if (filesSet.has(block.id)) {
        uploadedFiles++
      }
    }
  })

  // Calculate progress percentage
  const totalItems = totalTasks + totalForms + totalFiles
  const completedItems = completedTasks + answeredForms + uploadedFiles
  const progressPercentage = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0

  return progressPercentage
}
