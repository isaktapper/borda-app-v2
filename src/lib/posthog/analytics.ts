import posthog from 'posthog-js'
import type {
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
} from './types'

/**
 * Analytics helper functions for Borda
 * 
 * These functions provide type-safe event tracking
 * with automatic property validation.
 */

// ============================================
// Core Functions
// ============================================

/**
 * Check if PostHog is available and initialized
 */
function isPostHogAvailable(): boolean {
    return typeof window !== 'undefined' && 
           !!process.env.NEXT_PUBLIC_POSTHOG_KEY &&
           posthog.__loaded
}

/**
 * Track a custom event with type-safe properties
 */
export function track<E extends BordaEvent>(
    event: E,
    properties?: E extends keyof EventPropertyMap ? EventPropertyMap[E] : Record<string, any>
): void {
    if (!isPostHogAvailable()) return
    
    try {
        posthog.capture(event, properties)
    } catch (error) {
        console.error('[PostHog] Failed to track event:', event, error)
    }
}

/**
 * Identify a user with their traits
 */
export function identify(userId: string, traits?: UserTraits): void {
    if (!isPostHogAvailable()) return
    
    try {
        posthog.identify(userId, traits)
    } catch (error) {
        console.error('[PostHog] Failed to identify user:', error)
    }
}

/**
 * Set company/organization as a group for B2B analytics
 */
export function setCompanyGroup(companyId: string, properties?: CompanyProperties): void {
    if (!isPostHogAvailable()) return
    
    try {
        posthog.group('company', companyId, properties)
    } catch (error) {
        console.error('[PostHog] Failed to set company group:', error)
    }
}

/**
 * Reset user identity on logout
 */
export function reset(): void {
    if (!isPostHogAvailable()) return
    
    try {
        posthog.reset()
    } catch (error) {
        console.error('[PostHog] Failed to reset:', error)
    }
}

/**
 * Set a user property that persists across sessions
 */
export function setUserProperty(key: string, value: any): void {
    if (!isPostHogAvailable()) return
    
    try {
        posthog.people.set({ [key]: value })
    } catch (error) {
        console.error('[PostHog] Failed to set user property:', error)
    }
}

/**
 * Increment a numeric user property
 * Note: PostHog JS SDK doesn't have a direct increment method.
 * Use capture with $set for numeric tracking instead.
 */
export function incrementUserProperty(key: string, amount: number = 1): void {
    if (!isPostHogAvailable()) return
    
    try {
        // PostHog JS doesn't support increment directly
        // Instead, track as an event and use PostHog's computed properties
        posthog.capture('property_increment', {
            property_name: key,
            increment_by: amount
        })
    } catch (error) {
        console.error('[PostHog] Failed to increment user property:', error)
    }
}

// ============================================
// Signup & Onboarding
// ============================================

/**
 * Track when user lands on signup page
 */
export function trackSignupStarted(source?: string): void {
    track('signup_started', { 
        source,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined 
    })
}

/**
 * Track successful signup
 */
export function trackSignupCompleted(properties: SignupCompletedProperties): void {
    track('signup_completed', properties)
}

/**
 * Track onboarding step view
 */
export function trackOnboardingStep(properties: OnboardingStepProperties): void {
    track('onboarding_step_viewed', properties)
}

/**
 * Track onboarding completion
 */
export function trackOnboardingCompleted(properties: OnboardingCompletedProperties): void {
    track('onboarding_completed', properties)
}

/**
 * Track workspace creation
 */
export function trackWorkspaceCreated(properties: WorkspaceCreatedProperties): void {
    track('workspace_created', properties)
}

// ============================================
// Customers & Spaces
// ============================================

/**
 * Track customer invitation
 */
export function trackCustomerInvited(properties: CustomerInvitedProperties): void {
    const event = properties.is_first_invite ? 'first_customer_invited' : 'customer_invited'
    track(event, properties)
}

/**
 * Track customer added to space
 */
export function trackCustomerAdded(customerCount: number): void {
    track('customer_added', { 
        invite_method: 'email',
        customer_count: customerCount,
        is_first_invite: customerCount === 1
    })
}

/**
 * Track space creation
 */
export function trackSpaceCreated(properties: SpaceProperties): void {
    track('space_created', properties)
}

/**
 * Track space status change
 */
export function trackSpaceStatusChange(
    action: 'published' | 'archived',
    properties: SpaceProperties
): void {
    track(action === 'published' ? 'space_published' : 'space_archived', properties)
}

// ============================================
// Tasks
// ============================================

/**
 * Track task creation
 */
export function trackTaskCreated(properties: TaskProperties & { is_first?: boolean }): void {
    const event = properties.is_first ? 'first_task_created' : 'task_created'
    track(event, properties)
}

/**
 * Track task completion
 */
export function trackTaskCompleted(properties: TaskProperties): void {
    track('task_completed', properties)
}

/**
 * Track task reopened
 */
export function trackTaskReopened(properties: TaskProperties): void {
    track('task_reopened', properties)
}

// ============================================
// Engagement
// ============================================

/**
 * Track feature usage
 */
export function trackFeatureUsed(properties: FeatureUsedProperties): void {
    track('feature_used', properties)
}

/**
 * Track file upload
 */
export function trackFileUploaded(fileType?: string, fileSizeBytes?: number, spaceId?: string): void {
    track('file_uploaded', {
        file_type: fileType,
        file_size_bytes: fileSizeBytes,
        space_id: spaceId
    })
}

/**
 * Track file download
 */
export function trackFileDownloaded(fileType?: string, spaceId?: string): void {
    track('file_downloaded', {
        file_type: fileType,
        space_id: spaceId
    })
}

// ============================================
// Integrations
// ============================================

/**
 * Track integration connected
 */
export function trackIntegrationConnected(properties: Omit<IntegrationProperties, 'action'>): void {
    track('integration_connected', { ...properties, action: 'connected' })
}

/**
 * Track integration disconnected
 */
export function trackIntegrationDisconnected(properties: Omit<IntegrationProperties, 'action'>): void {
    track('integration_disconnected', { ...properties, action: 'disconnected' })
}

// ============================================
// Settings
// ============================================

/**
 * Track settings change
 */
export function trackSettingsChanged(properties: SettingsProperties): void {
    track('settings_changed', properties)
}

// ============================================
// Conversion
// ============================================

/**
 * Track trial start
 */
export function trackTrialStarted(trialLengthDays: number = 14): void {
    track('trial_started', { trial_length_days: trialLengthDays })
}

/**
 * Track upgrade button click
 */
export function trackUpgradeClicked(properties: UpgradeClickedProperties): void {
    track('upgrade_clicked', properties)
}

/**
 * Track successful payment
 */
export function trackPaymentCompleted(properties: PaymentCompletedProperties): void {
    track('payment_completed', properties)
}

/**
 * Track trial expiration without conversion
 */
export function trackTrialExpired(daysActive: number, featuresUsedCount: number): void {
    track('trial_expired', { 
        days_active: daysActive, 
        features_used_count: featuresUsedCount 
    })
}

/**
 * Track churn
 */
export function trackChurn(properties: ChurnProperties): void {
    track('churn', properties)
}

// ============================================
// Portal
// ============================================

/**
 * Track portal view by customer
 */
export function trackPortalViewed(spaceId: string, isFirstView: boolean): void {
    track('portal_viewed', {
        space_id: spaceId,
        is_first_view: isFirstView
    })
}

/**
 * Track portal page view
 */
export function trackPortalPageViewed(spaceId: string, pageName: string, isFirstView: boolean): void {
    track('portal_page_viewed', {
        space_id: spaceId,
        page_name: pageName,
        is_first_view: isFirstView
    })
}

// ============================================
// Session Recording Controls
// ============================================

/**
 * Start session recording (useful for trial users)
 */
export function startSessionRecording(): void {
    if (!isPostHogAvailable()) return
    posthog.startSessionRecording()
}

/**
 * Stop session recording
 */
export function stopSessionRecording(): void {
    if (!isPostHogAvailable()) return
    posthog.stopSessionRecording()
}

/**
 * Check if session is being recorded
 */
export function isSessionRecording(): boolean {
    if (!isPostHogAvailable()) return false
    return posthog.sessionRecordingStarted()
}
