/**
 * Email Templates
 *
 * Loads HTML templates from /emails folder and renders them with variables.
 * Templates use {{variable}} syntax for replacements.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Template Loading
// ============================================================================

const EMAILS_DIR = join(process.cwd(), 'src/lib/email/emails')

function loadTemplate(name: string): string {
  const path = join(EMAILS_DIR, `${name}.html`)
  return readFileSync(path, 'utf-8')
}

// Cache templates in production
const templateCache = new Map<string, string>()

function getTemplate(name: string): string {
  if (process.env.NODE_ENV === 'production') {
    if (!templateCache.has(name)) {
      templateCache.set(name, loadTemplate(name))
    }
    return templateCache.get(name)!
  }
  // Always reload in development for easy editing
  return loadTemplate(name)
}

// ============================================================================
// Template Rendering
// ============================================================================

function render(template: string, variables: Record<string, string | undefined>): string {
  // Strip HTML comments first (they may contain template syntax)
  let result = template.replace(/<!--[\s\S]*?-->/g, '')

  // Replace {{variable}} with values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value ?? '')
  }

  // Handle {{#if variable}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName, content) => {
      const value = variables[varName]
      return value ? content : ''
    }
  )

  return result
}

function wrapInBaseLayout(content: string, showLogo: boolean = true): string {
  const base = getTemplate('_base')
  return render(base, {
    content,
    showLogo: showLogo ? 'true' : '',
  })
}

// ============================================================================
// Public Template Functions
// ============================================================================

/**
 * Welcome email template
 */
export function welcomeTemplate({ firstName }: { firstName: string }): string {
  const content = render(getTemplate('welcome'), { firstName })
  return wrapInBaseLayout(content)
}

/**
 * Organization invite template
 */
export function orgInviteTemplate({
  organizationName,
  invitedByName,
  inviteLink,
}: {
  organizationName: string
  invitedByName: string
  inviteLink: string
}): string {
  const content = render(getTemplate('org-invite'), {
    organizationName,
    invitedByName,
    inviteLink,
  })
  return wrapInBaseLayout(content)
}

/**
 * Stakeholder invite template
 */
export function stakeholderInviteTemplate({
  projectName,
  clientName,
  accessLink,
}: {
  projectName: string
  clientName: string
  accessLink: string
}): string {
  const content = render(getTemplate('stakeholder-invite'), {
    spaceName: projectName,
    clientName,
    accessLink,
  })
  return wrapInBaseLayout(content)
}

/**
 * Task reminder template
 */
export function taskReminderTemplate({
  tasks,
  projectName,
  portalLink,
}: {
  tasks: Array<{ title: string; description?: string; due_date?: string }>
  projectName: string
  portalLink: string
}): string {
  // Render task items
  const taskItemTemplate = getTemplate('_task-item')
  const tasksList = tasks
    .map((task) =>
      render(taskItemTemplate, {
        title: task.title,
        description: task.description,
        dueDate: task.due_date
          ? new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : undefined,
      })
    )
    .join('')

  const content = render(getTemplate('task-reminder'), {
    taskCount: String(tasks.length),
    taskPlural: tasks.length > 1 ? 's' : '',
    spaceName: projectName,
    portalLink,
    tasksList,
  })

  return wrapInBaseLayout(content)
}

/**
 * Access request notification template (sent to admins)
 */
export function accessRequestNotificationTemplate({
  requesterEmail,
  requesterName,
  organizationName,
  approveLink,
  denyLink,
}: {
  requesterEmail: string
  requesterName: string | null
  organizationName: string
  approveLink: string
  denyLink: string
}): string {
  const displayName = requesterName || requesterEmail

  const content = render(getTemplate('access-request-notification'), {
    organizationName,
    displayName,
    requesterEmail,
    approveLink,
    denyLink,
  })

  return wrapInBaseLayout(content)
}

/**
 * Access request approved template
 */
export function accessRequestApprovedTemplate({
  requesterName,
  organizationName,
  loginLink,
}: {
  requesterName: string | null
  organizationName: string
  loginLink: string
}): string {
  const greeting = requesterName ? `Hi ${requesterName}` : 'Hi'

  const content = render(getTemplate('access-request-approved'), {
    greeting,
    organizationName,
    loginLink,
  })

  return wrapInBaseLayout(content)
}

/**
 * Access request denied template
 */
export function accessRequestDeniedTemplate({
  requesterName,
  organizationName,
}: {
  requesterName: string | null
  organizationName: string
}): string {
  const greeting = requesterName ? `Hi ${requesterName}` : 'Hi'

  const content = render(getTemplate('access-request-denied'), {
    greeting,
    organizationName,
  })

  return wrapInBaseLayout(content)
}
