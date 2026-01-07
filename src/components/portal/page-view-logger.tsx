'use client'

import { useEffect } from 'react'
import { logPageView } from '@/app/portal/actions'

interface PageViewLoggerProps {
    projectId: string
    pageId: string
    pageName: string
}

/**
 * Client component that logs a page view when mounted
 * Should be placed in each portal page
 */
export function PageViewLogger({ projectId, pageId, pageName }: PageViewLoggerProps) {
    useEffect(() => {
        // Log the page view (server will handle logging)
        logPageView(projectId, pageId, pageName).catch(error => {
            console.error('[PageViewLogger] Failed to log page view:', error)
        })
    }, [projectId, pageId, pageName])

    // This component renders nothing
    return null
}

