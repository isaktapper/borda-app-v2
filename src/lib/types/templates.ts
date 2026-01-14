import type { QuickAction, ActionPlanPermissions } from '@/types/action-plan'

// =============================================================================
// Template Settings
// =============================================================================

export type RelativeDateDirection = 'after_start' | 'before_golive'

// Keep for backward compatibility during migration
export type ReferenceDateType = 'start' | 'target'

export interface TemplateSettings {
  skipWeekends: boolean
}

// =============================================================================
// Relative Due Date (per-task direction)
// =============================================================================

/**
 * Relative due date with explicit direction
 * - after_start: X days after space creation date
 * - before_golive: X days before go-live date
 */
export interface RelativeDueDate {
  days: number
  direction: RelativeDateDirection
}

// =============================================================================
// Template-specific Task/Milestone (for Action Plans in templates)
// =============================================================================

/**
 * Task content for templates - uses relative dates instead of absolute dates
 * and does not include assignee information (assigned when space is created)
 */
export interface TemplateTaskContent {
  id: string
  title: string
  description?: string
  relativeDueDate?: RelativeDueDate
  quickAction?: QuickAction
  // Note: No assignee field in templates - assigned when creating space from template
}

/**
 * Milestone content for templates - uses relative dates
 */
export interface TemplateMilestoneContent {
  id: string
  title: string
  description?: string
  relativeDueDate?: RelativeDueDate
  sortOrder: number
  tasks: TemplateTaskContent[]
}

/**
 * Action Plan content specifically for templates
 */
export interface TemplateActionPlanContent {
  title?: string
  description?: string
  milestones: TemplateMilestoneContent[]
  permissions?: ActionPlanPermissions
}

// =============================================================================
// Core Template Types
// =============================================================================

export interface TemplateBlock {
  id?: string  // Optional ID for tracking during editing
  type: string
  sort_order: number
  content: Record<string, any>
}

export interface TemplatePage {
  id?: string  // Optional ID for tracking during editing
  title: string
  slug: string
  description?: string
  sort_order: number
  blocks: TemplateBlock[]
}

export interface TemplateData {
  pages: TemplatePage[]
}

export interface Template {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  template_data: TemplateData
  is_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Template settings
  skip_weekends: boolean
  // Deprecated - kept for backward compatibility, direction is now per-task
  reference_date_type?: ReferenceDateType
}
