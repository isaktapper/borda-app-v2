'use client'

import { useEffect, useRef } from 'react'
import { logSessionDuration } from '@/app/(app)/spaces/table-actions'

interface SessionTrackerProps {
    spaceId: string
    visitorEmail: string
}

/**
 * Tracks how long a stakeholder spends in the portal
 * 
 * Features:
 * - Starts tracking when component mounts
 * - Pauses when tab loses focus (visibilitychange)
 * - Resumes when tab regains focus
 * - Logs total duration when user navigates away or closes tab
 * - Uses beacon API for reliable logging on page close
 */
export function SessionTracker({ spaceId, visitorEmail }: SessionTrackerProps) {
    const startTimeRef = useRef<number>(Date.now())
    const totalTimeRef = useRef<number>(0)
    const isVisibleRef = useRef<boolean>(true)
    const lastVisibleTimeRef = useRef<number>(Date.now())
    const hasLoggedRef = useRef<boolean>(false)

    useEffect(() => {
        // Initialize
        startTimeRef.current = Date.now()
        lastVisibleTimeRef.current = Date.now()
        totalTimeRef.current = 0

        // Handle visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab became hidden - accumulate time
                if (isVisibleRef.current) {
                    totalTimeRef.current += Date.now() - lastVisibleTimeRef.current
                    isVisibleRef.current = false
                }
            } else {
                // Tab became visible again
                lastVisibleTimeRef.current = Date.now()
                isVisibleRef.current = true
            }
        }

        // Calculate total session duration
        const getTotalDuration = (): number => {
            let duration = totalTimeRef.current
            if (isVisibleRef.current) {
                duration += Date.now() - lastVisibleTimeRef.current
            }
            return Math.round(duration / 1000) // Convert to seconds
        }

        // Log session duration
        const logDuration = async () => {
            if (hasLoggedRef.current) return
            
            const durationSeconds = getTotalDuration()
            if (durationSeconds < 3) return // Don't log very short sessions
            
            hasLoggedRef.current = true
            
            try {
                await logSessionDuration(spaceId, visitorEmail, durationSeconds)
            } catch (error) {
                console.error('[SessionTracker] Failed to log duration:', error)
            }
        }

        // Handle page unload - use sendBeacon for reliability
        const handleBeforeUnload = () => {
            if (hasLoggedRef.current) return
            
            const durationSeconds = getTotalDuration()
            if (durationSeconds < 3) return
            
            hasLoggedRef.current = true
            
            // Use sendBeacon for reliable logging on page close
            const data = JSON.stringify({
                spaceId,
                visitorEmail,
                durationSeconds
            })
            
            navigator.sendBeacon('/api/session-duration', data)
        }

        // Handle page hide (more reliable than beforeunload on mobile)
        const handlePageHide = (event: PageTransitionEvent) => {
            if (event.persisted) {
                // Page is being cached (bfcache), log duration
                logDuration()
            } else {
                handleBeforeUnload()
            }
        }

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handlePageHide)

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handlePageHide)
            
            // Log on component unmount (navigation within app)
            logDuration()
        }
    }, [spaceId, visitorEmail])

    // This component renders nothing
    return null
}
