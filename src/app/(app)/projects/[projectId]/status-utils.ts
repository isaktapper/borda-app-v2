export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

// Allowed status transitions
export const allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active', 'archived'],
  active: ['completed', 'archived'],
  completed: ['active', 'archived'], // Can re-open if needed
  archived: ['draft', 'active'], // Can restore
}

export function canTransitionTo(currentStatus: ProjectStatus, newStatus: ProjectStatus): boolean {
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false
}

export function getAvailableStatuses(currentStatus: ProjectStatus): ProjectStatus[] {
  // Return current status + allowed transitions
  return [currentStatus, ...(allowedTransitions[currentStatus] || [])]
}
