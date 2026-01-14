import { z } from 'zod'

/**
 * Simple markdown to HTML converter for AI-generated content
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p></p>'
  
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<p>')) {
    html = `<p>${html}</p>`
  }
  
  return html
}

// Relative due date schema
const relativeDueDateSchema = z.object({
  days: z.number().int().min(0).max(365),
  direction: z.enum(['after_start', 'before_golive']),
})

// Task schema
const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  relativeDueDate: relativeDueDateSchema.optional(),
})

// Milestone schema
const milestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0),
  tasks: z.array(taskSchema).min(1).max(20),
})

// Action plan permissions
const actionPlanPermissionsSchema = z.object({
  stakeholderCanEdit: z.boolean().optional().default(true),
  stakeholderCanComplete: z.boolean().optional().default(true),
})

// Action plan content schema
const actionPlanContentSchema = z.object({
  milestones: z.array(milestoneSchema).min(1).max(15),
  permissions: actionPlanPermissionsSchema.optional(),
})

// Text block content
const textContentSchema = z.object({
  content: z.string().min(1),
})

// File upload block content
const fileUploadContentSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  acceptedTypes: z.array(z.string()).optional(),
})

// File download block content
const fileDownloadContentSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
})

// Contact block content
const contactContentSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
})

// Timeline block content
const timelineContentSchema = z.object({
  phases: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    startDay: z.number().optional(),
    endDay: z.number().optional(),
  })).optional(),
})

// Form block content
const formContentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'textarea', 'select', 'checkbox', 'date']),
    label: z.string(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
})

// Block schema - supports multiple block types
// Use permissive content validation since AI output can vary
const blockSchema = z.object({
  type: z.string().min(1),
  sort_order: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()),
})

// Page schema - more lenient to handle AI variations
const pageSchema = z.object({
  title: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  sort_order: z.number().int().min(0),
  blocks: z.array(blockSchema).max(20).default([]),
})

// Full template schema
export const aiGeneratedTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  pages: z.array(pageSchema).min(1).max(10),
})

export type AIGeneratedTemplate = z.infer<typeof aiGeneratedTemplateSchema>

/**
 * Validate and repair AI-generated template output
 */
export function validateAndRepairTemplate(data: unknown): {
  valid: boolean
  template?: AIGeneratedTemplate
  errors?: string[]
} {
  // Always repair first - AI output varies a lot
  const repaired = repairTemplate(data)
  
  // Try validation on repaired data
  const result = aiGeneratedTemplateSchema.safeParse(repaired)
  
  if (result.success) {
    return { valid: true, template: result.data }
  }

  // Log the repaired data for debugging
  console.log('Repaired template (still failed validation):', JSON.stringify(repaired, null, 2))

  // Return errors
  return {
    valid: false,
    errors: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
  }
}

/**
 * Attempt to repair common AI output issues
 */
function repairTemplate(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  
  const obj = data as Record<string, unknown>
  
  // Ensure pages is an array
  if (!Array.isArray(obj.pages)) {
    obj.pages = []
  }

  // Limit to 10 pages
  const pagesArray = obj.pages as unknown[]
  if (pagesArray.length > 10) {
    obj.pages = pagesArray.slice(0, 10)
  }

  // Process each page
  obj.pages = (obj.pages as unknown[]).map((page, pageIndex) => {
    if (!page || typeof page !== 'object') {
      // If page is a string, convert to object
      if (typeof page === 'string') {
        return {
          title: page,
          slug: page.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          sort_order: pageIndex,
          blocks: []
        }
      }
      return {
        title: `Page ${pageIndex + 1}`,
        slug: `page-${pageIndex + 1}`,
        sort_order: pageIndex,
        blocks: []
      }
    }
    const p = page as Record<string, unknown>

    // Handle alternative property names for title
    if (!p.title && p.name) {
      p.title = p.name
    }
    if (!p.title && p.heading) {
      p.title = p.heading
    }
    
    // Generate slug from title if both exist
    if (!p.slug && p.title && typeof p.title === 'string') {
      p.slug = p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `page-${pageIndex + 1}`
    }
    
    // If we have slug but no title, generate title from slug
    if (!p.title && p.slug && typeof p.slug === 'string') {
      p.title = p.slug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    
    // Fallback defaults
    if (!p.title) {
      p.title = `Page ${pageIndex + 1}`
    }
    if (!p.slug) {
      p.slug = `page-${pageIndex + 1}`
    }

    // Ensure sort_order
    if (typeof p.sort_order !== 'number') {
      p.sort_order = pageIndex
    }

    // Ensure blocks is an array
    if (!Array.isArray(p.blocks)) {
      // Check for alternative property names
      if (Array.isArray(p.content)) {
        p.blocks = p.content
      } else if (Array.isArray(p.components)) {
        p.blocks = p.components
      } else if (Array.isArray(p.sections)) {
        p.blocks = p.sections
      } else {
        p.blocks = []
      }
    }

    // Process each block and filter out invalid ones
    p.blocks = (p.blocks as unknown[])
      .map((block, blockIndex) => {
        if (!block || typeof block !== 'object') {
          // Try to create a valid block from string
          if (typeof block === 'string') {
            return {
              type: 'text',
              sort_order: blockIndex,
              content: { content: block }
            }
          }
          return null // Will be filtered out
        }
        const b = block as Record<string, unknown>

        // Ensure type exists
        if (!b.type || typeof b.type !== 'string') {
          b.type = 'text'
        }

        // Ensure sort_order
        if (typeof b.sort_order !== 'number') {
          b.sort_order = blockIndex
        }

        // If content is a string, wrap it as HTML
        if (typeof b.content === 'string') {
          b.content = { html: markdownToHtml(b.content) }
        }

        // If content is missing or not an object, create empty object
        if (!b.content || typeof b.content !== 'object' || Array.isArray(b.content)) {
          b.content = {}
        }

        // Process text blocks - ensure HTML format
        if (b.type === 'text') {
          const content = b.content as Record<string, unknown>
          // Convert markdown content to HTML if needed
          if (content.content && typeof content.content === 'string' && !content.html) {
            content.html = markdownToHtml(content.content as string)
            delete content.content
          }
          // Ensure html exists
          if (!content.html) {
            content.html = '<p>Content goes here...</p>'
          }
        }

        // Process next_task blocks - ensure default config
        if (b.type === 'next_task') {
          const content = b.content as Record<string, unknown>
          // Default to showing tasks from all action plans
          if (!content.actionPlanIds) {
            content.actionPlanIds = 'all'
          }
          // Ensure title
          if (!content.title) {
            content.title = 'Your Next Task'
          }
        }

        // Process action_plan_progress blocks - default to multiple mode showing all plans
        if (b.type === 'action_plan_progress') {
          const content = b.content as Record<string, unknown>
          // Default view mode to multiple
          if (!content.viewMode) {
            content.viewMode = 'multiple'
          }
          // Default to empty array - will show all action plans when space is created
          if (!Array.isArray(content.actionPlanBlockIds)) {
            content.actionPlanBlockIds = []
          }
          // Enable upcoming tasks by default
          if (content.showUpcomingTasks === undefined) {
            content.showUpcomingTasks = true
          }
          if (content.maxUpcomingTasks === undefined) {
            content.maxUpcomingTasks = 3
          }
        }

        // Process form blocks - ensure fields array exists
        if (b.type === 'form') {
          const content = b.content as Record<string, unknown>
          if (!Array.isArray(content.fields)) {
            content.fields = []
          }
        }

        // Process action_plan blocks
        if (b.type === 'action_plan' && b.content && typeof b.content === 'object') {
          const content = b.content as Record<string, unknown>
          
          if (Array.isArray(content.milestones)) {
            content.milestones = content.milestones.map((milestone, mIndex) => {
              if (!milestone || typeof milestone !== 'object') return milestone
              const m = milestone as Record<string, unknown>

              // Generate ID if missing
              if (!m.id) {
                m.id = `m${mIndex + 1}`
              }

              // Ensure sortOrder
              if (typeof m.sortOrder !== 'number') {
                m.sortOrder = mIndex
              }

              // Process tasks
              if (Array.isArray(m.tasks)) {
                m.tasks = m.tasks.map((task, tIndex) => {
                  if (!task || typeof task !== 'object') return task
                  const t = task as Record<string, unknown>

                  // Generate ID if missing
                  if (!t.id) {
                    t.id = `${m.id}-t${tIndex + 1}`
                  }

                  return t
                })
              }

              return m
            })
          }

          // Add default permissions if missing
          if (!content.permissions) {
            content.permissions = {
              stakeholderCanEdit: true,
              stakeholderCanComplete: true,
            }
          }
        }

        return b
      })
      .filter((b): b is Record<string, unknown> => b !== null)

    return p
  })

  return obj
}

/**
 * Generate unique IDs for template elements
 */
export function generateTemplateIds(template: AIGeneratedTemplate): AIGeneratedTemplate {
  let milestoneCounter = 0
  let taskCounter = 0

  return {
    ...template,
    pages: template.pages.map((page, pageIndex) => ({
      ...page,
      sort_order: pageIndex,
      blocks: page.blocks.map((block, blockIndex) => {
        if (block.type === 'action_plan') {
          const content = block.content as { milestones?: Array<{ id?: string; tasks?: Array<{ id?: string }> }> }
          if (content.milestones && Array.isArray(content.milestones)) {
            return {
              ...block,
              sort_order: blockIndex,
              content: {
                ...content,
                milestones: content.milestones.map(milestone => {
                  milestoneCounter++
                  const mId = `m${milestoneCounter}`
                  return {
                    ...milestone,
                    id: mId,
                    tasks: (milestone.tasks || []).map(task => {
                      taskCounter++
                      return {
                        ...task,
                        id: `${mId}-t${taskCounter}`,
                      }
                    }),
                  }
                }),
              },
            }
          }
        }
        return { ...block, sort_order: blockIndex }
      }),
    })),
  }
}
