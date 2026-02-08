/**
 * Email System Types
 *
 * All email types and their required data are defined here.
 * When adding a new email type:
 * 1. Add it to EmailType
 * 2. Create its params interface
 * 3. Add to EmailParamsMap
 * 4. Create a send function in index.ts
 * 5. Create the template in templates.ts
 */

// ============================================================================
// Email Types - All possible email types in the system
// ============================================================================

export const EMAIL_TYPES = {
  // Onboarding
  WELCOME: 'welcome',

  // Organization invites
  ORG_INVITE: 'org_invite',

  // Space/stakeholder
  STAKEHOLDER_INVITE: 'stakeholder_invite',

  // Task reminders
  TASK_REMINDER: 'task_reminder',

  // Access requests
  ACCESS_REQUEST_NOTIFICATION: 'access_request_notification',
  ACCESS_REQUEST_APPROVED: 'access_request_approved',
  ACCESS_REQUEST_DENIED: 'access_request_denied',

  // Chat
  CHAT_MESSAGE: 'chat_message',
} as const

export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES]

// ============================================================================
// Base Email Log Entry - What gets stored in the database
// ============================================================================

export interface EmailLogEntry {
  to_email: string
  from_email?: string
  subject: string
  type: EmailType
  organization_id?: string
  space_id?: string
  recipient_user_id?: string
  recipient_member_id?: string
  status: 'sent' | 'failed'
  error_message?: string
  metadata: Record<string, unknown>
}

// ============================================================================
// Email Params - Type-specific parameters for each email
// ============================================================================

/** Welcome email - sent to new users after signup */
export interface WelcomeEmailParams {
  to: string
  firstName: string
  organizationId?: string
  userId?: string
}

/** Organization invite - sent when inviting someone to join an org */
export interface OrgInviteEmailParams {
  to: string
  organizationName: string
  organizationId: string
  invitedByName: string
  inviteLink: string
  inviteToken: string
}

/** Stakeholder invite - sent when inviting a stakeholder to a space */
export interface StakeholderInviteEmailParams {
  to: string
  spaceName: string
  spaceId: string
  organizationId: string
  clientName: string
  accessLink: string
  accessToken: string
  memberId: string
}

/** Task reminder - sent when tasks are due */
export interface TaskReminderEmailParams {
  to: string
  spaceId: string
  spaceName: string
  organizationId: string
  recipientMemberId?: string
  recipientUserId?: string
  tasks: Array<{
    id: string
    title: string
    description?: string
    dueDate?: string
  }>
  portalLink: string
  dueDate: string  // The date these tasks are due (for deduplication)
}

/** Access request notification - sent to admins when someone requests access */
export interface AccessRequestNotificationEmailParams {
  to: string
  organizationId: string
  organizationName: string
  requesterEmail: string
  requesterName: string | null
  requestId: string
  approveLink: string
  denyLink: string
}

/** Access request approved - sent to requester when approved */
export interface AccessRequestApprovedEmailParams {
  to: string
  organizationId: string
  organizationName: string
  requesterName: string | null
  loginLink: string
  userId?: string
}

/** Access request denied - sent to requester when denied */
export interface AccessRequestDeniedEmailParams {
  to: string
  organizationId: string
  organizationName: string
  requesterName: string | null
}

/** Chat message - sent when someone sends a message or @mentions */
export interface ChatMessageEmailParams {
  to: string
  spaceName: string
  spaceId: string
  organizationId: string
  senderName: string
  senderEmail: string
  messagePreview: string
  portalLink: string
  recipientUserId?: string
  recipientMemberId?: string
}

// ============================================================================
// Email Params Map - Maps email type to its params interface
// ============================================================================

export interface EmailParamsMap {
  [EMAIL_TYPES.WELCOME]: WelcomeEmailParams
  [EMAIL_TYPES.ORG_INVITE]: OrgInviteEmailParams
  [EMAIL_TYPES.STAKEHOLDER_INVITE]: StakeholderInviteEmailParams
  [EMAIL_TYPES.TASK_REMINDER]: TaskReminderEmailParams
  [EMAIL_TYPES.ACCESS_REQUEST_NOTIFICATION]: AccessRequestNotificationEmailParams
  [EMAIL_TYPES.ACCESS_REQUEST_APPROVED]: AccessRequestApprovedEmailParams
  [EMAIL_TYPES.ACCESS_REQUEST_DENIED]: AccessRequestDeniedEmailParams
  [EMAIL_TYPES.CHAT_MESSAGE]: ChatMessageEmailParams
}
