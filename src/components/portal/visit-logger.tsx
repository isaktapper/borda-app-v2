'use client'

import { useEffect } from 'react'
import { logPortalVisit } from '@/app/(app)/spaces/table-actions'

interface VisitLoggerProps {
    spaceId: string
    visitorEmail: string
}

/**
 * Client component that logs a portal visit
 * Counts as new visit if more than 15 minutes since last visit
 * Server handles deduplication based on timestamp
 */
export function VisitLogger({ spaceId, visitorEmail }: VisitLoggerProps) {
    useEffect(() => {
        // Always attempt to log - server will handle 15-minute deduplication
        logPortalVisit(spaceId, visitorEmail).catch(error => {
            console.error('[VisitLogger] Failed to log visit:', error)
        })
    }, [spaceId, visitorEmail])

    // This component renders nothing
    return null
}
