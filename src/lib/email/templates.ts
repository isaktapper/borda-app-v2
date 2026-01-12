// Email Design System
// Colors: Primary Blue #0c41ff, Text #1B1B1B, Muted #59595B, Border #E4E4E6
// Font: Geist with system fallbacks

const EMAIL_STYLES = {
  primaryBlue: '#0c41ff',
  text: '#1B1B1B',
  muted: '#59595B',
  border: '#E4E4E6',
  background: '#f8f9fa',
  white: '#ffffff',
  fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

// Base email layout - clean, minimal design with Borda branding
function baseLayout(content: string, options?: { showLogo?: boolean }) {
  const showLogo = options?.showLogo ?? true
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${EMAIL_STYLES.background};font-family:${EMAIL_STYLES.fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:${EMAIL_STYLES.white};border:1px solid ${EMAIL_STYLES.border};border-radius:12px;">
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          ${showLogo ? `
          <tr>
            <td style="padding:24px 40px;border-top:1px solid ${EMAIL_STYLES.border};text-align:center;">
              <img src="https://borda.work/borda_logo.png" height="24" alt="Borda" style="height:24px;" />
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// Reusable button component
function emailButton(text: string, href: string) {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="width:100%;">
          <a href="${href}" style="display:inline-block;padding:14px 28px;background:${EMAIL_STYLES.primaryBlue};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500;font-size:15px;">${text}</a>
        </td>
      </tr>
    </table>
  `
}

// ============================================================================
// Stakeholder Invite Template
// ============================================================================

interface StakeholderInviteParams {
  projectName: string
  clientName: string
  accessLink: string
}

export function stakeholderInviteTemplate({
  projectName,
  clientName,
  accessLink
}: StakeholderInviteParams) {
  const content = `
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${EMAIL_STYLES.text};">You've been granted access to ${projectName}</h1>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">Hi ${clientName},</p>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">You've been granted access to the space <strong>"${projectName}"</strong> on Borda. Here you can track progress, upload files, and answer questions.</p>
    ${emailButton('Open space', accessLink)}
    <p style="margin:0;color:${EMAIL_STYLES.muted};font-size:14px;line-height:1.5;">This link is personal and requires no password. Save it somewhere safe.</p>
  `
  return baseLayout(content)
}

// ============================================================================
// Organization/Team Invite Template
// ============================================================================

interface OrgInviteParams {
  organizationName: string
  invitedByName: string
  inviteLink: string
}

export function orgInviteTemplate({
  organizationName,
  invitedByName,
  inviteLink
}: OrgInviteParams) {
  const content = `
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${EMAIL_STYLES.text};">You've been invited to ${organizationName}</h1>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">Hi!</p>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">${invitedByName} has invited you to join <strong>${organizationName}</strong> on Borda.</p>
    ${emailButton('Accept invitation', inviteLink)}
    <p style="margin:0;color:${EMAIL_STYLES.muted};font-size:14px;line-height:1.5;">If you don't recognize this invitation, you can ignore this email.</p>
  `
  return baseLayout(content)
}

// ============================================================================
// Welcome Email Template (Personal from Isak)
// ============================================================================

interface WelcomeParams {
  firstName: string
}

export function welcomeTemplate({
  firstName
}: WelcomeParams) {
  const content = `
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${EMAIL_STYLES.text};">Welcome to Borda!</h1>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">Thanks for choosing Borda! I'm Isak, founder of Borda, and I just wanted to say welcome.</p>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">If you have any questions or feedback – don't hesitate to reply to this email. I read every response personally.</p>
    <p style="margin:0 0 24px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">Good luck with your first project!</p>
    <p style="margin:0;color:${EMAIL_STYLES.text};font-size:15px;font-weight:500;">Isak</p>
  `
  return baseLayout(content)
}

// ============================================================================
// Task Reminder Template (kept for cron jobs)
// ============================================================================

interface Task {
  title: string
  description?: string
  due_date?: string
}

interface TaskReminderParams {
  tasks: Task[]
  projectName: string
  portalLink: string
}

export function taskReminderTemplate({
  tasks,
  projectName,
  portalLink
}: TaskReminderParams) {
  const tasksList = tasks.map(task => `
    <div style="background:#f9fafb;padding:16px;margin:12px 0;border-radius:8px;border-left:4px solid ${EMAIL_STYLES.primaryBlue};">
      <div style="font-weight:600;color:${EMAIL_STYLES.text};margin-bottom:4px;font-size:15px;">${task.title}</div>
      ${task.description ? `<div style="color:${EMAIL_STYLES.muted};font-size:14px;">${task.description}</div>` : ''}
      ${task.due_date ? `<div style="color:#f59e0b;font-size:13px;margin-top:6px;">Due: ${new Date(task.due_date).toLocaleDateString('en-US')}</div>` : ''}
    </div>
  `).join('')

  const content = `
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:600;color:${EMAIL_STYLES.text};">Reminder: Tasks to complete</h1>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">Hi!</p>
    <p style="margin:0 0 16px;color:${EMAIL_STYLES.text};line-height:1.6;font-size:15px;">You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} due soon in project <strong>${projectName}</strong>:</p>
    ${tasksList}
    ${emailButton('Go to portal', portalLink)}
  `
  return baseLayout(content)
}
