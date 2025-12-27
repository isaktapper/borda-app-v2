'use client'

import { useEffect } from 'react'
import { logPortalVisit } from '@/app/dashboard/projects/table-actions'

interface VisitLoggerProps {
    projectId: string
    visitorEmail: string
}

/**
 * Client component that logs a portal visit
 * Counts as new visit if more than 15 minutes since last visit
 * Server handles deduplication based on timestamp
 */
export function VisitLogger({ projectId, visitorEmail }: VisitLoggerProps) {
    useEffect(() => {
        // Always attempt to log - server will handle 15-minute deduplication
        logPortalVisit(projectId, visitorEmail).catch(error => {
            console.error('[VisitLogger] Failed to log visit:', error)
        })
    }, [projectId, visitorEmail])

    // This component renders nothing
    return null
}
