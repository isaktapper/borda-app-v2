'use client'

import { useEffect } from 'react'
import { logPageView } from '@/app/space/actions'

interface PageViewLoggerProps {
    spaceId: string
    pageId: string
    pageName: string
}

/**
 * Client component that logs a page view when mounted
 * Should be placed in each portal page
 */
export function PageViewLogger({ spaceId, pageId, pageName }: PageViewLoggerProps) {
    useEffect(() => {
        // Log the page view (server will handle logging)
        logPageView(spaceId, pageId, pageName).catch(error => {
            console.error('[PageViewLogger] Failed to log page view:', error)
        })
    }, [spaceId, pageId, pageName])

    // This component renders nothing
    return null
}

