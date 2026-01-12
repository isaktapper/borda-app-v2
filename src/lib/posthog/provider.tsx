'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * PostHog configuration for Borda
 * - EU hosting for GDPR compliance
 * - Session recording with privacy settings
 * - Respects DNT headers
 */

// Initialize PostHog only on client side
if (typeof window !== 'undefined') {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

    // Check for Do Not Track
    const doNotTrack = 
        navigator.doNotTrack === '1' || 
        (window as any).doNotTrack === '1'

    if (posthogKey && !doNotTrack) {
        posthog.init(posthogKey, {
            api_host: posthogHost,
            
            // Capture pageviews manually for better control with Next.js
            capture_pageview: false,
            capture_pageleave: true,
            
            // Session recording configuration
            disable_session_recording: false,
            session_recording: {
                // Mask all text inputs for privacy
                maskAllInputs: true,
                // Mask text content that might contain sensitive data
                maskTextSelector: '[data-ph-mask]',
                // Block recording on sensitive elements
                blockSelector: '[data-ph-block], .ph-no-capture',
            },
            
            // Privacy & GDPR settings
            persistence: 'localStorage+cookie',
            cross_subdomain_cookie: false,
            secure_cookie: process.env.NODE_ENV === 'production',
            
            // Respect user privacy preferences
            respect_dnt: true,
            opt_out_capturing_by_default: false,
            
            // Performance
            loaded: (posthog) => {
                // Debug mode in development
                if (process.env.NODE_ENV === 'development') {
                    posthog.debug(false) // Set to true for verbose logging
                }
            },
            
            // Bootstrap feature flags (they load async by default)
            bootstrap: {
                featureFlags: {},
            },
            
            // Autocapture settings
            autocapture: {
                dom_event_allowlist: ['click', 'submit'],
                element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
                css_selector_allowlist: ['[data-ph-capture]'],
            },
        })
    }
}

/**
 * Component to track page views in Next.js App Router
 */
function PostHogPageView() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const posthogClient = usePostHog()

    useEffect(() => {
        if (pathname && posthogClient) {
            let url = window.origin + pathname
            if (searchParams && searchParams.toString()) {
                url = url + '?' + searchParams.toString()
            }
            posthogClient.capture('$pageview', {
                $current_url: url,
            })
        }
    }, [pathname, searchParams, posthogClient])

    return null
}

/**
 * Wrapper to handle Suspense for useSearchParams
 */
function SuspendedPageView() {
    return (
        <Suspense fallback={null}>
            <PostHogPageView />
        </Suspense>
    )
}

interface PostHogProviderProps {
    children: React.ReactNode
}

/**
 * PostHog Provider for Borda
 * Wraps the application with PostHog context and page view tracking
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
    // Don't render provider if PostHog is not initialized
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        return <>{children}</>
    }

    return (
        <PHProvider client={posthog}>
            <SuspendedPageView />
            {children}
        </PHProvider>
    )
}

// Re-export posthog instance for direct access
export { posthog }
export { usePostHog }
