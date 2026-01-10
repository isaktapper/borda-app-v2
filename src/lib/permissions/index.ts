'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getOrganizationSubscription } from '@/lib/stripe/subscription'
import { PLAN_LIMITS, type PlanType } from './config'

// Re-export config types for convenience
export type { PlanType } from './config'

/**
 * Get the limits for an organization based on their subscription plan
 */
export async function getOrganizationLimits(organizationId: string) {
  const subscription = await getOrganizationSubscription(organizationId)
  
  // Default to growth limits if no subscription
  if (!subscription) {
    return PLAN_LIMITS.growth
  }
  
  // Map subscription plan to limits
  const plan = subscription.plan as PlanType
  
  // If trialing or active trial, use trial (Scale) limits
  if (subscription.status === 'trialing') {
    return PLAN_LIMITS.trial
  }
  
  // Return limits for the current plan
  return PLAN_LIMITS[plan] || PLAN_LIMITS.growth
}

/**
 * Get current usage counts for an organization
 */
export async function getOrganizationUsage(organizationId: string) {
  const supabase = await createAdminClient()
  
  // Count active spaces
  const { count: activeSpacesCount } = await supabase
    .from('spaces')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .is('deleted_at', null)
  
  // Count templates
  const { count: templatesCount } = await supabase
    .from('templates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
  
  return {
    activeSpaces: activeSpacesCount || 0,
    templates: templatesCount || 0,
  }
}

/**
 * Check if organization can create a new space
 */
export async function canCreateSpace(organizationId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
  message?: string
}> {
  const [limits, usage] = await Promise.all([
    getOrganizationLimits(organizationId),
    getOrganizationUsage(organizationId),
  ])
  
  const allowed = usage.activeSpaces < limits.maxActiveSpaces
  
  return {
    allowed,
    current: usage.activeSpaces,
    limit: limits.maxActiveSpaces,
    message: allowed 
      ? undefined 
      : `You've reached your limit of ${limits.maxActiveSpaces} active spaces. Upgrade to Scale for unlimited spaces.`,
  }
}

/**
 * Check if organization can create a new template
 */
export async function canCreateTemplate(organizationId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
  message?: string
}> {
  const [limits, usage] = await Promise.all([
    getOrganizationLimits(organizationId),
    getOrganizationUsage(organizationId),
  ])
  
  const allowed = usage.templates < limits.maxTemplates
  
  return {
    allowed,
    current: usage.templates,
    limit: limits.maxTemplates,
    message: allowed 
      ? undefined 
      : `You've reached your limit of ${limits.maxTemplates} templates. Upgrade to Scale for unlimited templates.`,
  }
}

/**
 * Check if organization has analytics access
 */
export async function hasAnalyticsAccess(organizationId: string): Promise<boolean> {
  const limits = await getOrganizationLimits(organizationId)
  return limits.hasAnalytics
}

/**
 * Check if organization can remove Borda branding
 */
export async function canRemoveBranding(organizationId: string): Promise<boolean> {
  const limits = await getOrganizationLimits(organizationId)
  return limits.canRemoveBranding
}

/**
 * Get branding visibility for a space
 * Returns true if Borda branding should be shown
 */
export async function shouldShowBordaBranding(
  organizationId: string,
  spaceId?: string
): Promise<boolean> {
  const supabase = await createAdminClient()
  const canRemove = await canRemoveBranding(organizationId)
  
  // If plan doesn't allow removing branding, always show
  if (!canRemove) {
    return true
  }
  
  // Check organization-level setting
  const { data: org } = await supabase
    .from('organizations')
    .select('show_borda_branding')
    .eq('id', organizationId)
    .single()
  
  // If org has branding disabled, don't show
  if (org && org.show_borda_branding === false) {
    return false
  }
  
  // If checking for a specific space, check space-level setting
  if (spaceId) {
    const { data: space } = await supabase
      .from('spaces')
      .select('show_borda_branding')
      .eq('id', spaceId)
      .single()
    
    // Space setting overrides org setting if explicitly set to false
    if (space && space.show_borda_branding === false) {
      return false
    }
  }
  
  // Default: show branding
  return true
}
