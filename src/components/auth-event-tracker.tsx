'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackSignupCompleted } from '@/lib/posthog'

interface AuthEventTrackerProps {
    /** Whether this user just signed up (is new) */
    isNewUser?: boolean
    /** The method used to sign up/login */
    authMethod?: 'email' | 'google'
}

/**
 * Tracks auth-related events on the client side
 * 
 * This component should be placed in pages where users land
 * after authentication (e.g., onboarding, dashboard)
 */
export function AuthEventTracker({ isNewUser, authMethod }: AuthEventTrackerProps) {
    const searchParams = useSearchParams()
    const hasTracked = useRef(false)

    useEffect(() => {
        if (hasTracked.current) return
        
        // Check URL params for signup completion indicator
        const justSignedUp = searchParams.get('signup') === 'complete' || isNewUser
        const method = (searchParams.get('method') as 'email' | 'google') || authMethod || 'email'
        const source = searchParams.get('utm_source') || searchParams.get('ref') || undefined

        if (justSignedUp) {
            hasTracked.current = true
            trackSignupCompleted({ method, source })
        }
    }, [searchParams, isNewUser, authMethod])

    return null
}
