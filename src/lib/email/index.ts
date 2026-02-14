import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import {
  EMAIL_TYPES,
  type EmailType,
  type EmailLogEntry,
  type WelcomeEmailParams,
  type OrgInviteEmailParams,
  type StakeholderInviteEmailParams,
  type TaskReminderEmailParams,
  type AccessRequestNotificationEmailParams,
  type AccessRequestApprovedEmailParams,
  type AccessRequestDeniedEmailParams,
  type ChatMessageEmailParams,
  type ProgressCompleteEmailParams,
} from './types'
import { EMAIL_SUBJECTS } from './subjects'
import {
  welcomeTemplate,
  orgInviteTemplate,
  stakeholderInviteTemplate,
  taskReminderTemplate,
  accessRequestNotificationTemplate,
  accessRequestApprovedTemplate,
  accessRequestDeniedTemplate,
  chatMessageTemplate,
  progressCompleteTemplate,
} from './templates'

// Re-export types for convenience
export { EMAIL_TYPES } from './types'
export type * from './types'

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Borda <help@borda.work>'
const ISAK_FROM = 'Isak from Borda <isak@borda.work>'

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

// ============================================================================
// Core Send Function (internal)
// ============================================================================

interface SendEmailInternalParams {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
  logEntry: Omit<EmailLogEntry, 'status' | 'error_message'>
}

async function sendEmailInternal({
  to,
  subject,
  html,
  from = DEFAULT_FROM,
  replyTo,
  logEntry,
}: SendEmailInternalParams): Promise<{ success: boolean; error?: string }> {
  const skipSendInDev = process.env.NODE_ENV === 'development' && !process.env.SEND_EMAILS_IN_DEV

  if (skipSendInDev) {
    console.log('📧 Email (dev mode - not sent):', { to, subject, from, type: logEntry.type })
    await logEmail({ ...logEntry, status: 'sent' })
    return { success: true }
  }

  try {
    const resend = getResendClient()
    await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    })

    await logEmail({ ...logEntry, status: 'sent' })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending email:', error)
    await logEmail({ ...logEntry, status: 'failed', error_message: errorMessage })
    return { success: false, error: errorMessage }
  }
}

async function logEmail(entry: EmailLogEntry) {
  try {
    const supabase = await createAdminClient()
    await supabase.from('email_log').insert({
      to_email: entry.to_email,
      from_email: entry.from_email,
      subject: entry.subject,
      type: entry.type,
      organization_id: entry.organization_id,
      space_id: entry.space_id,
      recipient_user_id: entry.recipient_user_id,
      recipient_member_id: entry.recipient_member_id,
      status: entry.status,
      error_message: entry.error_message,
      metadata: entry.metadata,
    })
  } catch (error) {
    console.error('Error logging email:', error)
  }
}

// ============================================================================
// Public Email Functions - One per email type
// ============================================================================

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  const subject = EMAIL_SUBJECTS.welcome()

  return sendEmailInternal({
    to: params.to,
    subject,
    html: welcomeTemplate({ firstName: params.firstName }),
    from: ISAK_FROM,
    replyTo: 'isak@borda.work',
    logEntry: {
      to_email: params.to,
      from_email: ISAK_FROM,
      subject,
      type: EMAIL_TYPES.WELCOME,
      organization_id: params.organizationId,
      recipient_user_id: params.userId,
      metadata: {},
    },
  })
}

/**
 * Send organization invite email
 */
export async function sendOrgInviteEmail(params: OrgInviteEmailParams) {
  const subject = EMAIL_SUBJECTS.orgInvite(params.organizationName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: orgInviteTemplate({
      organizationName: params.organizationName,
      invitedByName: params.invitedByName,
      inviteLink: params.inviteLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.ORG_INVITE,
      organization_id: params.organizationId,
      metadata: {
        invite_token: params.inviteToken,
      },
    },
  })
}

/**
 * Send stakeholder invite email (invite to a space)
 */
export async function sendStakeholderInviteEmail(params: StakeholderInviteEmailParams) {
  const subject = EMAIL_SUBJECTS.stakeholderInvite(params.spaceName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: stakeholderInviteTemplate({
      projectName: params.spaceName,
      clientName: params.clientName,
      accessLink: params.accessLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.STAKEHOLDER_INVITE,
      organization_id: params.organizationId,
      space_id: params.spaceId,
      recipient_member_id: params.memberId,
      metadata: {
        access_token: params.accessToken,
      },
    },
  })
}

/**
 * Send task reminder email
 */
export async function sendTaskReminderEmail(params: TaskReminderEmailParams) {
  const taskCount = params.tasks.length
  const subject = EMAIL_SUBJECTS.taskReminder(taskCount, params.spaceName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: taskReminderTemplate({
      tasks: params.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        due_date: t.dueDate,
      })),
      projectName: params.spaceName,
      portalLink: params.portalLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.TASK_REMINDER,
      organization_id: params.organizationId,
      space_id: params.spaceId,
      recipient_user_id: params.recipientUserId,
      recipient_member_id: params.recipientMemberId,
      metadata: {
        task_ids: params.tasks.map((t) => t.id),
        due_date: params.dueDate,
        task_count: taskCount,
      },
    },
  })
}

/**
 * Check if a task reminder was already sent today
 */
export async function wasTaskReminderSentToday(
  email: string,
  spaceId: string,
  dueDate: string
): Promise<boolean> {
  try {
    const supabase = await createAdminClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('email_log')
      .select('id')
      .eq('type', EMAIL_TYPES.TASK_REMINDER)
      .eq('to_email', email)
      .eq('space_id', spaceId)
      .eq('status', 'sent')
      .contains('metadata', { due_date: dueDate })
      .gte('sent_at', today.toISOString())
      .limit(1)
      .single()

    return !!data
  } catch {
    return false
  }
}

/**
 * Send access request notification to admins
 */
export async function sendAccessRequestNotificationEmail(
  params: AccessRequestNotificationEmailParams
) {
  const displayName = params.requesterName || params.requesterEmail
  const subject = EMAIL_SUBJECTS.accessRequestNotification(displayName, params.organizationName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: accessRequestNotificationTemplate({
      requesterEmail: params.requesterEmail,
      requesterName: params.requesterName,
      organizationName: params.organizationName,
      approveLink: params.approveLink,
      denyLink: params.denyLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.ACCESS_REQUEST_NOTIFICATION,
      organization_id: params.organizationId,
      metadata: {
        request_id: params.requestId,
        requester_email: params.requesterEmail,
      },
    },
  })
}

/**
 * Send access request approved email
 */
export async function sendAccessRequestApprovedEmail(params: AccessRequestApprovedEmailParams) {
  const subject = EMAIL_SUBJECTS.accessRequestApproved(params.organizationName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: accessRequestApprovedTemplate({
      requesterName: params.requesterName,
      organizationName: params.organizationName,
      loginLink: params.loginLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.ACCESS_REQUEST_APPROVED,
      organization_id: params.organizationId,
      recipient_user_id: params.userId,
      metadata: {},
    },
  })
}

/**
 * Send access request denied email
 */
export async function sendAccessRequestDeniedEmail(params: AccessRequestDeniedEmailParams) {
  const subject = EMAIL_SUBJECTS.accessRequestDenied(params.organizationName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: accessRequestDeniedTemplate({
      requesterName: params.requesterName,
      organizationName: params.organizationName,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.ACCESS_REQUEST_DENIED,
      organization_id: params.organizationId,
      metadata: {},
    },
  })
}

/**
 * Send progress complete notification to admins when space reaches 100%
 */
export async function sendProgressCompleteEmail(params: ProgressCompleteEmailParams) {
  const subject = EMAIL_SUBJECTS.progressComplete(params.spaceName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: progressCompleteTemplate({
      spaceName: params.spaceName,
      spaceLink: params.spaceLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.PROGRESS_COMPLETE,
      organization_id: params.organizationId,
      space_id: params.spaceId,
      metadata: {},
    },
  })
}

/**
 * Send chat message notification email
 */
export async function sendChatMessageEmail(params: ChatMessageEmailParams) {
  const subject = EMAIL_SUBJECTS.chatMessage(params.spaceName)

  return sendEmailInternal({
    to: params.to,
    subject,
    html: chatMessageTemplate({
      spaceName: params.spaceName,
      senderName: params.senderName,
      messagePreview: params.messagePreview,
      portalLink: params.portalLink,
    }),
    logEntry: {
      to_email: params.to,
      from_email: DEFAULT_FROM,
      subject,
      type: EMAIL_TYPES.CHAT_MESSAGE,
      organization_id: params.organizationId,
      space_id: params.spaceId,
      recipient_user_id: params.recipientUserId,
      recipient_member_id: params.recipientMemberId,
      metadata: {
        sender_email: params.senderEmail,
      },
    },
  })
}

/**
 * Check if a chat message email was sent recently (rate limiting)
 * Returns true if an email was sent in the last 5 minutes
 */
export async function wasChatEmailSentRecently(
  email: string,
  spaceId: string
): Promise<boolean> {
  try {
    const supabase = await createAdminClient()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const { data } = await supabase
      .from('email_log')
      .select('id')
      .eq('type', EMAIL_TYPES.CHAT_MESSAGE)
      .eq('to_email', email)
      .eq('space_id', spaceId)
      .eq('status', 'sent')
      .gte('sent_at', fiveMinutesAgo.toISOString())
      .limit(1)
      .single()

    return !!data
  } catch {
    return false
  }
}

// ============================================================================
// Legacy sendEmail function (for backwards compatibility during migration)
// ============================================================================

interface LegacySendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
  type?: string
  metadata?: Record<string, unknown>
}

/**
 * @deprecated Use the specific send functions instead (sendWelcomeEmail, sendOrgInviteEmail, etc.)
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
  type = 'general',
  metadata = {},
}: LegacySendEmailParams) {
  return sendEmailInternal({
    to,
    subject,
    html,
    from,
    replyTo,
    logEntry: {
      to_email: to,
      from_email: from,
      subject,
      type: type as EmailType,
      metadata,
    },
  })
}
