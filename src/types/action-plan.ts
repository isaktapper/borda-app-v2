/**
 * Action Plan Block Types
 *
 * Defines the structure for action plan blocks with milestones and tasks.
 * Inspired by valuecase's action plan feature.
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type AssigneeType = 'staff' | 'stakeholder'

export type QuickActionType = 'link' | 'go_to_page' | 'go_to_block'

export interface Assignee {
  type: AssigneeType
  staffId?: string        // auth.users.id if type='staff'
  stakeholderId?: string  // space_members.id if type='stakeholder'
  name: string            // Display name (required for all types)
  email?: string          // Optional email
  avatarUrl?: string      // Optional avatar URL (for staff)
}

export interface QuickAction {
  type: QuickActionType
  title: string           // Display text on the pill
  url?: string            // For 'link' type - external URL
  pageId?: string         // For 'go_to_page' type
  blockId?: string        // For 'go_to_block' type
}

export interface Task {
  id: string              // Short ID: "t1", "t2", etc.
  title: string
  description?: string
  dueDate?: string        // ISO date string
  assignee?: Assignee
  quickAction?: QuickAction  // Optional quick action button
}

export interface Milestone {
  id: string              // Short ID: "m1", "m2", etc.
  title: string
  description?: string
  dueDate?: string        // ISO date string
  sortOrder: number       // For drag-drop ordering
  tasks: Task[]
}

export interface ActionPlanPermissions {
  stakeholderCanEdit: boolean      // Can stakeholders edit task details?
  stakeholderCanComplete: boolean  // Can stakeholders mark tasks complete?
}

export interface ActionPlanContent {
  title?: string
  description?: string
  milestones: Milestone[]
  permissions?: ActionPlanPermissions
}

export interface ExtractedTask {
  compositeId: string      // "m1-t2" format
  milestoneId: string
  milestoneTitle: string
  taskId: string
  task: Task
}

export interface MilestoneProgress {
  total: number
  completed: number
  percentage: number
}
