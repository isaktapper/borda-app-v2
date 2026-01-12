/**
 * PostHog Analytics for Borda
 * 
 * This module provides analytics tracking, user identification,
 * and feature flag management for the Borda application.
 * 
 * @example
 * // Track an event
 * import { trackSignupCompleted } from '@/lib/posthog'
 * trackSignupCompleted({ method: 'email' })
 * 
 * @example
 * // Use a feature flag
 * import { useFeatureFlag, FEATURE_FLAGS } from '@/lib/posthog'
 * const isEnabled = useFeatureFlag(FEATURE_FLAGS.NEW_DASHBOARD_LAYOUT)
 * 
 * @example
 * // Identify a user
 * import { identify, setCompanyGroup } from '@/lib/posthog'
 * identify(userId, { email, name, plan })
 * setCompanyGroup(companyId, { name, plan })
 */

// Provider
export { PostHogProvider, posthog, usePostHog } from './provider'

// Types
export type {
    BordaEvent,
    EventPropertyMap,
    UserTraits,
    CompanyProperties,
    SignupCompletedProperties,
    OnboardingStepProperties,
    OnboardingCompletedProperties,
    WorkspaceCreatedProperties,
    CustomerInvitedProperties,
    TaskProperties,
    SpaceProperties,
    FeatureUsedProperties,
    IntegrationProperties,
    SettingsProperties,
    UpgradeClickedProperties,
    PaymentCompletedProperties,
    ChurnProperties,
    PortalViewProperties,
} from './types'

// Core analytics functions
export {
    track,
    identify,
    setCompanyGroup,
    reset,
    setUserProperty,
    incrementUserProperty,
} from './analytics'

// Event-specific tracking functions
export {
    // Signup & Onboarding
    trackSignupStarted,
    trackSignupCompleted,
    trackOnboardingStep,
    trackOnboardingCompleted,
    trackWorkspaceCreated,
    
    // Customers & Spaces
    trackCustomerInvited,
    trackCustomerAdded,
    trackSpaceCreated,
    trackSpaceStatusChange,
    
    // Tasks
    trackTaskCreated,
    trackTaskCompleted,
    trackTaskReopened,
    
    // Engagement
    trackFeatureUsed,
    trackFileUploaded,
    trackFileDownloaded,
    
    // Integrations
    trackIntegrationConnected,
    trackIntegrationDisconnected,
    
    // Settings
    trackSettingsChanged,
    
    // Conversion
    trackTrialStarted,
    trackUpgradeClicked,
    trackPaymentCompleted,
    trackTrialExpired,
    trackChurn,
    
    // Portal
    trackPortalViewed,
    trackPortalPageViewed,
    
    // Session Recording
    startSessionRecording,
    stopSessionRecording,
    isSessionRecording,
} from './analytics'

// Feature Flags
export {
    FEATURE_FLAGS,
    useFeatureFlag,
    useFeatureFlagVariant,
    useFeatureFlagPayload,
    isFeatureEnabled,
    getFeatureFlagVariant,
    reloadFeatureFlags,
    overrideFeatureFlag,
    clearFeatureFlagOverrides,
} from './feature-flags'
export type { FeatureFlagKey } from './feature-flags'
