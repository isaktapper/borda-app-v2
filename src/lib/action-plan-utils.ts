/**
 * Action Plan Utility Functions
 *
 * Helper functions for working with action plan blocks.
 */

import type {
  ActionPlanContent,
  Milestone,
  Task,
  ExtractedTask,
  MilestoneProgress,
  TaskStatus,
} from '@/types/action-plan'

/**
 * Counter for generating unique short IDs
 * In production, these will be unique per block/session
 */
let idCounter = 0

/**
 * Generate a short ID for milestones or tasks
 * Format: "m1", "m2", "t1", "t2", etc.
 */
export function generateShortId(prefix: 'm' | 't'): string {
  idCounter++
  return `${prefix}${idCounter}`
}

/**
 * Reset the ID counter (useful for testing or new block creation)
 */
export function resetIdCounter(): void {
  idCounter = 0
}

/**
 * Build a composite ID from milestone ID and task ID
 * Format: "m1-t2"
 */
export function getTaskCompositeId(
  milestoneId: string,
  taskId: string
): string {
  return `${milestoneId}-${taskId}`
}

/**
 * Parse a composite ID into milestone and task IDs
 * Format: "m1-t2" -> { milestoneId: "m1", taskId: "t2" }
 */
export function parseTaskCompositeId(compositeId: string): {
  milestoneId: string
  taskId: string
} {
  const parts = compositeId.split('-')
  if (parts.length !== 2) {
    throw new Error(`Invalid composite ID format: ${compositeId}`)
  }
  return {
    milestoneId: parts[0],
    taskId: parts[1],
  }
}

/**
 * Extract all tasks from milestones for aggregation (e.g., in task dashboard)
 * Returns a flat array of tasks with their milestone context
 */
export function extractAllTasks(
  content: ActionPlanContent,
  blockId: string
): ExtractedTask[] {
  const result: ExtractedTask[] = []

  for (const milestone of content.milestones || []) {
    for (const task of milestone.tasks || []) {
      result.push({
        compositeId: getTaskCompositeId(milestone.id, task.id),
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        taskId: task.id,
        task,
      })
    }
  }

  return result
}

/**
 * Calculate progress for a milestone based on task completion statuses
 * Returns total, completed count, and percentage
 */
export function calculateMilestoneProgress(
  milestone: Milestone,
  taskStatuses: Record<string, TaskStatus>
): MilestoneProgress {
  const tasks = milestone.tasks || []
  const total = tasks.length

  if (total === 0) {
    return { total: 0, completed: 0, percentage: 0 }
  }

  const completed = tasks.filter((task) => {
    const compositeId = getTaskCompositeId(milestone.id, task.id)
    const status = taskStatuses[compositeId] || 'pending'
    return status === 'completed'
  }).length

  const percentage = Math.round((completed / total) * 100)

  return { total, completed, percentage }
}

/**
 * Calculate overall progress across all milestones
 * Returns total, completed count, and percentage
 */
export function calculateOverallProgress(
  content: ActionPlanContent,
  taskStatuses: Record<string, TaskStatus>
): MilestoneProgress {
  const milestones = content.milestones || []

  let totalTasks = 0
  let completedTasks = 0

  for (const milestone of milestones) {
    const progress = calculateMilestoneProgress(milestone, taskStatuses)
    totalTasks += progress.total
    completedTasks += progress.completed
  }

  if (totalTasks === 0) {
    return { total: 0, completed: 0, percentage: 0 }
  }

  const percentage = Math.round((completedTasks / totalTasks) * 100)

  return { total: totalTasks, completed: completedTasks, percentage }
}

/**
 * Check if a date is past due (before today)
 */
export function isPastDue(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Format a date string for display
 * Returns format like "Jan 15, 2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Create an empty milestone with default values
 */
export function createEmptyMilestone(sortOrder: number): Milestone {
  return {
    id: generateShortId('m'),
    title: '',
    description: '',
    sortOrder,
    tasks: [],
  }
}

/**
 * Create an empty task with default values
 */
export function createEmptyTask(): Task {
  return {
    id: generateShortId('t'),
    title: '',
  }
}

/**
 * Get initials from a name for avatar display
 * E.g., "John Doe" -> "JD"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (
    parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
  )
}
