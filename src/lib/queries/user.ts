'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Cached query to get the authenticated user
 * Uses React cache() to deduplicate requests within the same render
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    return { user: null, error }
  }

  return { user, error: null }
})

/**
 * Cached query to get user's organization membership
 */
export const getCachedOrgMember = cache(async (userId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organization_id, organizations(name)')
    .eq('user_id', userId)
    .single()

  return { data, error }
})

/**
 * Cached query to get user profile
 */
export const getCachedProfile = cache(async (userId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  return { data, error }
})

/**
 * Cached query to check if Slack is connected for an organization
 */
export const getCachedSlackIntegration = cache(async (organizationId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('slack_integrations')
    .select('id, enabled')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  return { data, error }
})

/**
 * Cached query to check if Microsoft Teams is connected for an organization
 */
export const getCachedTeamsIntegration = cache(async (organizationId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teams_integrations')
    .select('id, enabled')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  return { data, error }
})
