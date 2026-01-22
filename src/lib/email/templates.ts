/**
 * Email Templates
 *
 * All email templates as inline strings.
 * Edit the HTML directly in this file.
 */

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  primaryBlue: '#0c41ff',
  text: '#1B1B1B',
  muted: '#6b7280',
  border: '#e5e7eb',
  background: '#f8f9fa',
  white: '#ffffff',
}

// ============================================================================
// Base Layout
// ============================================================================

function baseLayout(content: string, showLogo: boolean = true): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${STYLES.background};font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:${STYLES.white};border:1px solid ${STYLES.border};border-radius:12px;">
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          ${showLogo ? `
          <tr>
            <td style="padding:24px 40px;border-top:1px solid ${STYLES.border};text-align:center;">
              <img src="https://borda.work/borda_logo.png" height="24" alt="Borda" style="height:24px;" />
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================================================
// Components
// ============================================================================

function button(text: string, href: string): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="width:100%;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;background:${STYLES.primaryBlue};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500;font-size:15px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`
}

function taskItem(task: { title: string; description?: string; due_date?: string }): string {
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return `
<table cellpadding="0" cellspacing="0" style="width:100%;border-bottom:1px solid ${STYLES.border};">
  <tr>
    <td style="width:24px;vertical-align:top;padding:12px 0;padding-top:14px;">
      <div style="width:18px;height:18px;border:2px solid #d1d5db;border-radius:4px;"></div>
    </td>
    <td style="padding:12px 0 12px 12px;">
      <div style="font-weight:500;color:${STYLES.text};font-size:15px;line-height:1.4;">
        ${task.title}
      </div>
      ${task.description ? `<div style="color:${STYLES.muted};font-size:14px;margin-top:2px;">${task.description}</div>` : ''}
      ${dueDate ? `<div style="color:${STYLES.muted};font-size:13px;margin-top:4px;">📅 ${dueDate}</div>` : ''}
    </td>
  </tr>
</table>`
}

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Welcome email - sent to new users after signup
 */
export function welcomeTemplate({ firstName }: { firstName: string }): string {
  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  Welcome to Borda!
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Hi ${firstName},
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Thanks for choosing Borda! I'm Isak, founder of Borda, and I just wanted to say welcome.
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  If you have any questions or feedback – don't hesitate to reply to this email. I read every response personally.
</p>

<p style="margin:0 0 24px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Good luck with your first project!
</p>

<p style="margin:0;color:${STYLES.text};font-size:15px;font-weight:500;">
  Isak
</p>`

  return baseLayout(content)
}

/**
 * Organization invite - sent when inviting someone to join an org
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
  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  You've been invited to ${organizationName}
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Hi!
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  ${invitedByName} has invited you to join <strong>${organizationName}</strong> on Borda.
</p>

${button('Accept invitation', inviteLink)}

<p style="margin:0;color:${STYLES.muted};font-size:14px;line-height:1.5;">
  If you don't recognize this invitation, you can ignore this email.
</p>`

  return baseLayout(content)
}

/**
 * Stakeholder invite - sent when inviting a stakeholder to a space
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
  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  You've been granted access to ${projectName}
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Hi ${clientName},
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  You've been granted access to the space <strong>"${projectName}"</strong> on Borda. Here you can track progress, upload files, and answer questions.
</p>

${button('Open space', accessLink)}

<p style="margin:0;color:${STYLES.muted};font-size:14px;line-height:1.5;">
  This link is personal and requires no password. Save it somewhere safe.
</p>`

  return baseLayout(content)
}

/**
 * Task reminder - sent when tasks are due
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
  const taskCount = tasks.length
  const tasksList = tasks.map(taskItem).join('')

  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  Reminder: Tasks due today
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Hi!
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  You have ${taskCount} task${taskCount > 1 ? 's' : ''} due today in <strong>${projectName}</strong>:
</p>

<div style="border-top:1px solid ${STYLES.border};margin:16px 0;">
${tasksList}
</div>

${button('Go to space', portalLink)}`

  return baseLayout(content)
}

/**
 * Access request notification - sent to admins when someone requests access
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

  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  New access request for ${organizationName}
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Hi!
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  <strong>${displayName}</strong> (${requesterEmail}) has requested to join your organization <strong>${organizationName}</strong> on Borda.
</p>

<p style="margin:0 0 24px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Please review this request:
</p>

<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="padding-right:12px;">
      <a href="${approveLink}" style="display:inline-block;padding:14px 28px;background:${STYLES.primaryBlue};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500;font-size:15px;">
        Approve
      </a>
    </td>
    <td align="center">
      <a href="${denyLink}" style="display:inline-block;padding:14px 28px;background:#f3f4f6;color:${STYLES.text};text-decoration:none;border-radius:8px;font-weight:500;font-size:15px;border:1px solid ${STYLES.border};">
        Deny
      </a>
    </td>
  </tr>
</table>

<p style="margin:0;color:${STYLES.muted};font-size:14px;line-height:1.5;">
  You can also manage access requests from your organization settings.
</p>`

  return baseLayout(content)
}

/**
 * Access request approved - sent to requester when approved
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

  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  You're now a member of ${organizationName}
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  ${greeting},
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Great news! Your request to join <strong>${organizationName}</strong> has been approved. You now have access to the workspace.
</p>

${button('Sign in', loginLink)}

<p style="margin:0;color:${STYLES.muted};font-size:14px;line-height:1.5;">
  Welcome to the team!
</p>`

  return baseLayout(content)
}

/**
 * Access request denied - sent to requester when denied
 */
export function accessRequestDeniedTemplate({
  requesterName,
  organizationName,
}: {
  requesterName: string | null
  organizationName: string
}): string {
  const greeting = requesterName ? `Hi ${requesterName}` : 'Hi'

  const content = `
<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${STYLES.text};">
  Your request to join ${organizationName}
</h1>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  ${greeting},
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  Unfortunately, your request to join <strong>${organizationName}</strong> on Borda was not approved at this time.
</p>

<p style="margin:0 0 16px;color:${STYLES.text};line-height:1.6;font-size:15px;">
  If you believe this was a mistake, please contact the organization administrator directly.
</p>

<p style="margin:0;color:${STYLES.muted};font-size:14px;line-height:1.5;">
  If you have any questions, feel free to reach out to us.
</p>`

  return baseLayout(content)
}
