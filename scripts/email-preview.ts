/**
 * Email Preview Server
 *
 * Run with: npm run email:preview
 * Opens http://localhost:3333 with all email templates
 */

import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'

const PORT = 3333
const EMAILS_DIR = join(process.cwd(), 'src/lib/email/emails')

// ============================================================================
// Template Rendering (copied from templates.ts to avoid bundling issues)
// ============================================================================

function loadTemplate(name: string): string {
  const path = join(EMAILS_DIR, `${name}.html`)
  return readFileSync(path, 'utf-8')
}

function render(template: string, variables: Record<string, string | undefined>): string {
  // Strip HTML comments first (they may contain template syntax)
  let result = template.replace(/<!--[\s\S]*?-->/g, '')

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value ?? '')
  }

  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName, content) => {
      const value = variables[varName]
      return value ? content : ''
    }
  )

  return result
}

function wrapInBaseLayout(content: string): string {
  const base = loadTemplate('_base')
  return render(base, { content, showLogo: 'true' })
}

// ============================================================================
// Mock Data for Each Template
// ============================================================================

const mockData: Record<string, Record<string, string>> = {
  welcome: {
    firstName: 'Anna',
  },
  'org-invite': {
    organizationName: 'Acme Inc',
    invitedByName: 'Erik Svensson',
    inviteLink: 'https://app.borda.work/signup?email=anna@example.com',
  },
  'stakeholder-invite': {
    spaceName: 'Website Redesign',
    clientName: 'Anna',
    accessLink: 'https://app.borda.work/space/abc123/shared',
  },
  'task-reminder': {
    taskCount: '3',
    taskPlural: 's',
    spaceName: 'Website Redesign',
    portalLink: 'https://app.borda.work/space/abc123/shared',
    tasksList: '', // Will be rendered separately
  },
  'access-request-notification': {
    organizationName: 'Acme Inc',
    displayName: 'Johan Andersson',
    requesterEmail: 'johan@example.com',
    approveLink: 'https://app.borda.work/settings?tab=organization',
    denyLink: 'https://app.borda.work/settings?tab=organization',
  },
  'access-request-approved': {
    greeting: 'Hi Johan',
    organizationName: 'Acme Inc',
    loginLink: 'https://app.borda.work/login',
  },
  'access-request-denied': {
    greeting: 'Hi Johan',
    organizationName: 'Acme Inc',
  },
}

// Mock tasks for task-reminder
const mockTasks = [
  { title: 'Review wireframes', description: 'Check the new homepage design', dueDate: 'Jan 21' },
  { title: 'Upload brand assets', description: undefined, dueDate: 'Jan 21' },
  { title: 'Approve final mockups', description: 'Sign off on the design', dueDate: undefined },
]

// ============================================================================
// Render Functions
// ============================================================================

function renderTaskItems(): string {
  const taskItemTemplate = loadTemplate('_task-item')
  return mockTasks
    .map((task) =>
      render(taskItemTemplate, {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
      })
    )
    .join('')
}

function renderTemplate(name: string): string {
  try {
    const template = loadTemplate(name)
    const data = { ...mockData[name] }

    // Special handling for task-reminder
    if (name === 'task-reminder') {
      data.tasksList = renderTaskItems()
    }

    const content = render(template, data)
    return wrapInBaseLayout(content)
  } catch (error) {
    return `<html><body><h1>Error loading template: ${name}</h1><pre>${error}</pre></body></html>`
  }
}

// ============================================================================
// Index Page
// ============================================================================

const templates = [
  { name: 'welcome', label: 'Welcome', description: 'Sent to new users after signup' },
  { name: 'org-invite', label: 'Organization Invite', description: 'Sent when inviting to org' },
  { name: 'stakeholder-invite', label: 'Stakeholder Invite', description: 'Sent when inviting to space' },
  { name: 'task-reminder', label: 'Task Reminder', description: 'Sent when tasks are due' },
  { name: 'access-request-notification', label: 'Access Request (to admin)', description: 'Sent to admins' },
  { name: 'access-request-approved', label: 'Access Approved', description: 'Sent when approved' },
  { name: 'access-request-denied', label: 'Access Denied', description: 'Sent when denied' },
]

function renderIndex(): string {
  const rows = templates
    .map(
      (t) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <strong>${t.label}</strong><br>
          <span style="color:#6b7280;font-size:13px;">${t.description}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;">
          <a href="/${t.name}" target="_blank" style="display:inline-block;padding:8px 16px;background:#0c41ff;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">
            Preview
          </a>
        </td>
      </tr>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Templates Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
    }
  </style>
</head>
<body>
  <div style="max-width:600px;margin:0 auto;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Email Templates</h1>
    <p style="margin:0 0 24px;color:#6b7280;">Preview all email templates with mock data. Changes reload automatically.</p>

    <table style="width:100%;background:#fff;border-radius:12px;border:1px solid #e5e7eb;border-collapse:collapse;overflow:hidden;">
      ${rows}
    </table>

    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;text-align:center;">
      Templates located in: <code>src/lib/email/emails/</code>
    </p>
  </div>
</body>
</html>
  `
}

// ============================================================================
// Server
// ============================================================================

const server = createServer((req, res) => {
  const url = req.url || '/'

  // Remove leading slash
  const templateName = url.slice(1)

  let html: string
  let contentType = 'text/html'

  if (url === '/' || url === '') {
    html = renderIndex()
  } else if (templates.some((t) => t.name === templateName)) {
    html = renderTemplate(templateName)
  } else {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` })
  res.end(html)
})

server.listen(PORT, () => {
  console.log(`\n  📧 Email Preview Server`)
  console.log(`  ───────────────────────`)
  console.log(`  http://localhost:${PORT}`)
  console.log(`\n  Templates: src/lib/email/emails/`)
  console.log(`  Press Ctrl+C to stop\n`)
})
