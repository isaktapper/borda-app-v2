/**
 * PostHog Event Types for Borda
 * 
 * This file defines all tracked events and their properties
 * for type-safe analytics throughout the application.
 */

// ============================================
// Event Names
// ============================================

export type SignupEvent = 
    | 'signup_started'
    | 'signup_completed'

export type OnboardingEvent =
    | 'onboarding_step_viewed'
    | 'onboarding_completed'
    | 'workspace_created'

export type CustomerEvent =
    | 'first_customer_invited'
    | 'customer_added'
    | 'customer_invited'

export type TaskEvent =
    | 'first_task_created'
    | 'task_created'
    | 'task_completed'
    | 'task_reopened'

export type SpaceEvent =
    | 'space_created'
    | 'space_published'
    | 'space_archived'
    | 'workspace_viewed'

export type EngagementEvent =
    | 'session_started'
    | 'feature_used'
    | 'message_sent'
    | 'file_uploaded'
    | 'file_downloaded'
    | 'reminder_sent'

export type IntegrationEvent =
    | 'integration_connected'
    | 'integration_disconnected'

export type SettingsEvent =
    | 'settings_changed'

export type ConversionEvent =
    | 'trial_started'
    | 'upgrade_clicked'
    | 'payment_completed'
    | 'trial_expired'
    | 'churn'

export type PortalEvent =
    | 'portal_viewed'
    | 'portal_page_viewed'
    | 'portal_session_end'

export type BordaEvent = 
    | SignupEvent
    | OnboardingEvent
    | CustomerEvent
    | TaskEvent
    | SpaceEvent
    | EngagementEvent
    | IntegrationEvent
    | SettingsEvent
    | ConversionEvent
    | PortalEvent

// ============================================
// Event Properties
// ============================================

export interface SignupStartedProperties {
    source?: string // Where they came from (utm_source, referrer, etc.)
    referrer?: string
}

export interface SignupCompletedProperties {
    method: 'email' | 'google'
    source?: string
}

export interface OnboardingStepProperties {
    step: number
    step_name: 'organization' | 'branding' | 'company' | 'discovery'
    time_on_step_seconds?: number
}

export interface OnboardingCompletedProperties {
    time_to_complete_seconds: number
    steps_completed: number
    industry?: string
    company_size?: string
    referral_source?: string
}

export interface WorkspaceCreatedProperties {
    workspace_name: string
    has_logo: boolean
    has_brand_color: boolean
    industry?: string
    company_size?: string
}

export interface CustomerInvitedProperties {
    invite_method: 'email' | 'link'
    customer_count: number // Total after this invite
    is_first_invite: boolean
}

export interface TaskProperties {
    task_type?: string
    completed_by?: 'internal' | 'customer'
    space_id?: string
}

export interface SpaceProperties {
    space_id?: string
    space_name?: string
    customer_count?: number
    page_count?: number
    status?: 'draft' | 'active' | 'completed' | 'archived'
}

export interface FeatureUsedProperties {
    feature_name: string
    context?: string
}

export interface MessageProperties {
    message_type: 'text' | 'file' | 'link'
    space_id?: string
}

export interface FileProperties {
    file_type?: string
    file_size_bytes?: number
    space_id?: string
}

export interface IntegrationProperties {
    integration_type: 'slack' | 'teams' | 'zapier' | 'other'
    action: 'connected' | 'disconnected'
}

export interface SettingsProperties {
    setting_name: string
    setting_category?: 'profile' | 'organization' | 'billing' | 'integrations'
    old_value?: string
    new_value?: string
}

export interface TrialProperties {
    trial_length_days: number
    plan?: string
}

export interface UpgradeClickedProperties {
    current_plan: 'trial' | 'growth' | 'scale'
    target_plan: 'growth' | 'scale'
    source: string // Where in the app they clicked
}

export interface PaymentCompletedProperties {
    plan: 'growth' | 'scale'
    billing_cycle: 'monthly' | 'yearly'
    mrr: number // Monthly recurring revenue in cents
    currency: string
}

export interface ChurnProperties {
    reason?: string
    lifetime_days: number
    plan: string
    features_used_count?: number
}

export interface PortalViewProperties {
    space_id: string
    is_first_view: boolean
    visitor_type?: 'customer' | 'internal'
}

// ============================================
// User Traits (for identify calls)
// ============================================

export interface UserTraits {
    email: string
    name?: string
    company?: string
    company_id?: string
    plan?: 'trial' | 'growth' | 'scale'
    role?: 'owner' | 'admin' | 'member'
    created_at?: string
    days_since_signup?: number
    is_trial?: boolean
    trial_days_remaining?: number
}

// ============================================
// Group Properties (for B2B analytics)
// ============================================

export interface CompanyProperties {
    name: string
    plan: 'trial' | 'growth' | 'scale'
    employee_count?: string // '1-10', '11-50', etc.
    industry?: string
    created_at: string
    customer_count?: number
    space_count?: number
    mrr?: number
    is_trial?: boolean
    trial_ends_at?: string
}

// ============================================
// Event Property Map (for type inference)
// ============================================

export interface EventPropertyMap {
    // Signup
    signup_started: SignupStartedProperties
    signup_completed: SignupCompletedProperties
    
    // Onboarding
    onboarding_step_viewed: OnboardingStepProperties
    onboarding_completed: OnboardingCompletedProperties
    workspace_created: WorkspaceCreatedProperties
    
    // Customers
    first_customer_invited: CustomerInvitedProperties
    customer_added: CustomerInvitedProperties
    customer_invited: CustomerInvitedProperties
    
    // Tasks
    first_task_created: TaskProperties
    task_created: TaskProperties
    task_completed: TaskProperties
    task_reopened: TaskProperties
    
    // Spaces
    space_created: SpaceProperties
    space_published: SpaceProperties
    space_archived: SpaceProperties
    workspace_viewed: SpaceProperties
    
    // Engagement
    session_started: { days_since_signup?: number }
    feature_used: FeatureUsedProperties
    message_sent: MessageProperties
    file_uploaded: FileProperties
    file_downloaded: FileProperties
    reminder_sent: { reminder_type: string; space_id?: string }
    
    // Integrations
    integration_connected: IntegrationProperties
    integration_disconnected: IntegrationProperties
    
    // Settings
    settings_changed: SettingsProperties
    
    // Conversion
    trial_started: TrialProperties
    upgrade_clicked: UpgradeClickedProperties
    payment_completed: PaymentCompletedProperties
    trial_expired: { days_active: number; features_used_count: number }
    churn: ChurnProperties
    
    // Portal
    portal_viewed: PortalViewProperties
    portal_page_viewed: PortalViewProperties & { page_name: string }
    portal_session_end: { duration_seconds: number; pages_viewed: number }
}
