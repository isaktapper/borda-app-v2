/**
 * Email Subjects
 *
 * All email subject lines in one place.
 * Edit these to change what users see in their inbox.
 */

export const EMAIL_SUBJECTS = {
  // Welcome email
  welcome: () => 'Welcome to Borda!',

  // Organization invite
  orgInvite: (orgName: string) => `You've been invited to ${orgName}`,

  // Stakeholder invite to space
  stakeholderInvite: (spaceName: string) => `You've been granted access to ${spaceName}`,

  // Task reminder
  taskReminder: (taskCount: number, spaceName: string) =>
    `Reminder: ${taskCount} task${taskCount > 1 ? 's' : ''} due today in ${spaceName}`,

  // Access request - notification to admins
  accessRequestNotification: (requesterName: string, orgName: string) =>
    `${requesterName} wants to join ${orgName}`,

  // Access request - approved
  accessRequestApproved: (orgName: string) => `You're now a member of ${orgName}`,

  // Access request - denied
  accessRequestDenied: (orgName: string) => `Your request to join ${orgName}`,

  // Chat message
  chatMessage: (spaceName: string) => `New message in ${spaceName}`,

  // Progress complete
  progressComplete: (spaceName: string) => `Progress complete: ${spaceName}`,
}
