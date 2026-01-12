'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { usePostHog } from 'posthog-js/react'

/**
 * Feature Flags for Borda
 * 
 * Define all feature flags here for type safety
 * and easy management across the application.
 */

// ============================================
// Feature Flag Names
// ============================================

export const FEATURE_FLAGS = {
    // Onboarding experiments
    NEW_ONBOARDING_FLOW: 'new-onboarding-flow',
    SKIP_BRANDING_STEP: 'skip-branding-step',
    
    // UI experiments
    NEW_DASHBOARD_LAYOUT: 'new-dashboard-layout',
    DARK_MODE: 'dark-mode',
    
    // Feature rollouts
    TEAMS_INTEGRATION: 'teams-integration',
    AI_SUGGESTIONS: 'ai-suggestions',
    ADVANCED_ANALYTICS: 'advanced-analytics',
    
    // Beta features
    BETA_EDITOR: 'beta-editor',
    BETA_AUTOMATIONS: 'beta-automations',
    
    // Pricing experiments
    ANNUAL_DISCOUNT_BANNER: 'annual-discount-banner',
    FREE_TRIAL_EXTENSION: 'free-trial-extension',
} as const

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS]

// ============================================
// Hooks
// ============================================

/**
 * Hook to check if a feature flag is enabled
 * Returns undefined while loading, then boolean
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean | undefined {
    const posthogClient = usePostHog()
    const [isEnabled, setIsEnabled] = useState<boolean | undefined>(undefined)

    useEffect(() => {
        if (!posthogClient) {
            setIsEnabled(false)
            return
        }

        // Check if flags are already loaded
        const checkFlag = () => {
            const value = posthogClient.isFeatureEnabled(flag)
            setIsEnabled(value ?? false)
        }

        // Initial check
        checkFlag()

        // Listen for flag updates
        posthogClient.onFeatureFlags(checkFlag)

        return () => {
            // Cleanup if needed
        }
    }, [posthogClient, flag])

    return isEnabled
}

/**
 * Hook to get a feature flag variant (for multivariate flags)
 */
export function useFeatureFlagVariant(flag: FeatureFlagKey): string | boolean | undefined {
    const posthogClient = usePostHog()
    const [variant, setVariant] = useState<string | boolean | undefined>(undefined)

    useEffect(() => {
        if (!posthogClient) {
            setVariant(undefined)
            return
        }

        const checkVariant = () => {
            const value = posthogClient.getFeatureFlag(flag)
            setVariant(value)
        }

        checkVariant()
        posthogClient.onFeatureFlags(checkVariant)
    }, [posthogClient, flag])

    return variant
}

/**
 * Hook to get feature flag payload (additional data attached to flag)
 */
export function useFeatureFlagPayload<T = any>(flag: FeatureFlagKey): T | undefined {
    const posthogClient = usePostHog()
    const [payload, setPayload] = useState<T | undefined>(undefined)

    useEffect(() => {
        if (!posthogClient) {
            setPayload(undefined)
            return
        }

        const checkPayload = () => {
            const value = posthogClient.getFeatureFlagPayload(flag) as T | undefined
            setPayload(value)
        }

        checkPayload()
        posthogClient.onFeatureFlags(checkPayload)
    }, [posthogClient, flag])

    return payload
}

// ============================================
// Non-React Functions
// ============================================

/**
 * Check if a feature flag is enabled (non-React contexts)
 * Returns false if PostHog is not loaded
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
    if (typeof window === 'undefined' || !posthog.__loaded) {
        return false
    }
    return posthog.isFeatureEnabled(flag) ?? false
}

/**
 * Get feature flag variant (non-React contexts)
 */
export function getFeatureFlagVariant(flag: FeatureFlagKey): string | boolean | undefined {
    if (typeof window === 'undefined' || !posthog.__loaded) {
        return undefined
    }
    return posthog.getFeatureFlag(flag)
}

/**
 * Manually reload feature flags
 */
export function reloadFeatureFlags(): void {
    if (typeof window === 'undefined' || !posthog.__loaded) {
        return
    }
    posthog.reloadFeatureFlags()
}

/**
 * Override a feature flag locally (for testing)
 */
export function overrideFeatureFlag(flag: FeatureFlagKey, value: boolean | string): void {
    if (typeof window === 'undefined' || !posthog.__loaded) {
        return
    }
    posthog.featureFlags.override({ [flag]: value })
}

/**
 * Clear all local feature flag overrides
 */
export function clearFeatureFlagOverrides(): void {
    if (typeof window === 'undefined' || !posthog.__loaded) {
        return
    }
    posthog.featureFlags.override(false)
}
