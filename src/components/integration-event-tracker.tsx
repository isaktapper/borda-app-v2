'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackIntegrationConnected, trackIntegrationDisconnected } from '@/lib/posthog'

/**
 * Tracks integration connection events based on URL params
 * 
 * This component should be placed in the integrations page
 * to track successful OAuth callbacks.
 */
export function IntegrationEventTracker() {
    const searchParams = useSearchParams()
    const hasTracked = useRef(false)

    useEffect(() => {
        if (hasTracked.current) return

        const success = searchParams.get('success')
        const error = searchParams.get('error')

        // Track successful Slack connection
        if (success === 'connected') {
            hasTracked.current = true
            trackIntegrationConnected({ integration_type: 'slack' })
        }

        // Track if user disconnected (if we ever add that param)
        if (success === 'disconnected') {
            hasTracked.current = true
            trackIntegrationDisconnected({ integration_type: 'slack' })
        }
    }, [searchParams])

    return null
}
