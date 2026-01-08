export type SpaceStatus = 'draft' | 'active' | 'completed' | 'archived'

// Allowed status transitions
export const allowedTransitions: Record<SpaceStatus, SpaceStatus[]> = {
  draft: ['active', 'archived'],
  active: ['completed', 'archived'],
  completed: ['active', 'archived'], // Can re-open if needed
  archived: ['draft', 'active'], // Can restore
}

export function canTransitionTo(currentStatus: SpaceStatus, newStatus: SpaceStatus): boolean {
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false
}

export function getAvailableStatuses(currentStatus: SpaceStatus): SpaceStatus[] {
  // Return current status + allowed transitions
  return [currentStatus, ...(allowedTransitions[currentStatus] || [])]
}
