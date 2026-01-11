import {
    CheckCircle2,
    Upload,
    Download,
    FileText,
    Eye,
    UserPlus,
    User,
    RotateCcw,
    type LucideIcon
} from 'lucide-react'

export interface ActivityItem {
    id: string
    actor_email: string
    action: string
    resource_type: string | null
    resource_id: string | null
    metadata: Record<string, any>
    created_at: string
    space_id?: string
    space_name?: string
    client_name?: string
}

/**
 * Get the display name for an activity actor
 * Handles anonymous users gracefully with unique numbering
 */
export function getActorName(actorEmail: string): string {
    if (actorEmail === 'anonymous' || actorEmail === 'unknown') {
        return 'Anonymous Stakeholder'
    }
    
    // Handle unique anonymous IDs (e.g., "anonymous-a1b2c3d4")
    if (actorEmail.startsWith('anonymous-')) {
        const shortId = actorEmail.replace('anonymous-', '').toUpperCase().slice(0, 4)
        return `Stakeholder #${shortId}`
    }
    
    // Return the part before @ for email addresses
    return actorEmail.split('@')[0]
}

/**
 * Get human-readable text for an activity
 */
export function getActivityText(activity: ActivityItem): string {
    const actor = getActorName(activity.actor_email)
    const metadata = activity.metadata || {}

    switch (activity.action) {
        // Portal visits
        case 'portal.first_visit':
            return `${actor} visited portal for the first time`
        case 'portal.visit':
            return `${actor} visited portal`

        // Page views
        case 'page.viewed':
            return metadata.pageName
                ? `${actor} viewed "${metadata.pageName}"`
                : `${actor} viewed a page`

        // Tasks
        case 'task.completed':
            return metadata.taskTitle
                ? `${actor} completed "${metadata.taskTitle}"`
                : `${actor} completed a task`
        case 'task.uncompleted':
        case 'task.reopened':
            return metadata.taskTitle
                ? `${actor} reopened "${metadata.taskTitle}"`
                : `${actor} reopened a task`

        // Files
        case 'file.uploaded':
            return metadata.fileName
                ? `${actor} uploaded "${metadata.fileName}"`
                : `${actor} uploaded a file`
        case 'file.downloaded':
            return metadata.fileName
                ? `${actor} downloaded "${metadata.fileName}"`
                : `${actor} downloaded a file`
        case 'file.deleted':
            return metadata.fileName
                ? `${actor} deleted "${metadata.fileName}"`
                : `${actor} deleted a file`

        // Forms
        case 'form.answered':
        case 'form.submitted':
            return `${actor} submitted form responses`

        // Space status
        case 'space.status_changed':
            return metadata.newStatus
                ? `${actor} changed space status to "${metadata.newStatus}"`
                : `${actor} changed space status`

        // Legacy/fallback
        case 'question.answered':
            return `${actor} answered a question`
        case 'checklist.updated':
            return `${actor} updated a checklist`

        default:
            // Fallback: try to make the action readable
            const readableAction = activity.action.replace(/[._]/g, ' ')
            return `${actor} ${readableAction}`
    }
}

/**
 * Get the icon component for an activity type
 */
export function getActivityIcon(action: string): LucideIcon {
    if (action === 'portal.first_visit') return UserPlus
    if (action === 'portal.visit') return User
    if (action === 'page.viewed') return Eye
    if (action.includes('completed')) return CheckCircle2
    if (action.includes('reopened') || action.includes('uncompleted')) return RotateCcw
    if (action.includes('uploaded')) return Upload
    if (action.includes('downloaded')) return Download
    if (action.includes('answered') || action.includes('submitted') || action.includes('form')) return FileText
    return FileText
}

/**
 * Get the color classes for an activity type
 */
export function getActivityColor(action: string): string {
    if (action === 'portal.first_visit') return 'text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400'
    if (action === 'portal.visit') return 'text-slate-600 bg-slate-50 dark:bg-slate-950/50 dark:text-slate-400'
    if (action === 'page.viewed') return 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400'
    if (action.includes('completed')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400'
    if (action.includes('reopened') || action.includes('uncompleted')) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400'
    if (action.includes('uploaded')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400'
    if (action.includes('downloaded')) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400'
    if (action.includes('answered') || action.includes('submitted') || action.includes('form')) return 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400'
    if (action.includes('deleted')) return 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400'
    return 'text-gray-600 bg-gray-50 dark:bg-gray-950/50 dark:text-gray-400'
}

/**
 * Get a short label for an activity type (used in compact views)
 */
export function getActivityLabel(action: string): string {
    switch (action) {
        case 'portal.first_visit':
            return 'First visit'
        case 'portal.visit':
            return 'Visited'
        case 'page.viewed':
            return 'Viewed page'
        case 'task.completed':
            return 'Task completed'
        case 'task.reopened':
            return 'Task reopened'
        case 'task.uncompleted':
            return 'Task reopened'
        case 'file.uploaded':
            return 'File uploaded'
        case 'file.downloaded':
            return 'File downloaded'
        case 'file.deleted':
            return 'File deleted'
        case 'form.submitted':
            return 'Form submitted'
        case 'form.answered':
        case 'question.answered':
            return 'Form answered'
        default:
            // Make readable: "some.action" -> "Some action"
            return action.replace(/[._]/g, ' ').replace(/^\w/, c => c.toUpperCase())
    }
}

