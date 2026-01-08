'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TablePreferences {
    visible_columns: string[]
    column_order: string[]
}

/**
 * Update user's table preferences
 */
export async function updateTablePreferences(
    tableKey: string,
    preferences: TablePreferences
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get current preferences
    const { data: userData } = await supabase
        .from('users')
        .select('table_preferences')
        .eq('id', user.id)
        .single()

    const currentPrefs = userData?.table_preferences || {}

    // Update with new preferences for this table
    const updatedPrefs = {
        ...currentPrefs,
        [tableKey]: preferences
    }

    const { error } = await supabase
        .from('users')
        .update({ table_preferences: updatedPrefs })
        .eq('id', user.id)

    if (error) {
        console.error('[updateTablePreferences] Error:', error)
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Get user's table preferences
 */
export async function getTablePreferences(tableKey: string): Promise<TablePreferences | null> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('users')
        .select('table_preferences')
        .eq('id', user.id)
        .single()

    return data?.table_preferences?.[tableKey] || null
}

/**
 * Log a portal visit (called from portal pages)
 * Counts as new visit if more than 15 minutes since last visit
 * Also logs to activity_log with first/return visit detection
 */
export async function logPortalVisit(spaceId: string, visitorEmail: string) {
    const supabase = await createAdminClient()

    // Check if there's a recent visit (within 15 minutes) to avoid duplicate logging
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    const { data: recentVisit } = await supabase
        .from('portal_visits')
        .select('id')
        .eq('space_id', spaceId)
        .eq('visitor_email', visitorEmail)
        .gte('visited_at', fifteenMinutesAgo)
        .limit(1)
        .single()

    // If there's a recent visit (within 15 min), don't log again
    if (recentVisit) {
        return { success: true, duplicate: true }
    }

    // Log new visit to portal_visits table (for analytics)
    const { error } = await supabase
        .from('portal_visits')
        .insert({
            space_id: spaceId,
            visitor_email: visitorEmail,
            visited_at: new Date().toISOString()
        })

    if (error) {
        console.error('[logPortalVisit] Error:', error)
        return { error: error.message }
    }

    // Also log to activity_log with first/return visit detection
    // Check if this is the first visit ever for this user
    const { data: existingActivity } = await supabase
        .from('activity_log')
        .select('id')
        .eq('space_id', spaceId)
        .eq('actor_email', visitorEmail)
        .in('action', ['portal.first_visit', 'portal.visit'])
        .limit(1)
        .maybeSingle()

    const isFirstVisit = !existingActivity
    const action = isFirstVisit ? 'portal.first_visit' : 'portal.visit'

    await supabase
        .from('activity_log')
        .insert({
            space_id: spaceId,
            actor_email: visitorEmail,
            action: action,
            resource_type: 'portal',
            resource_id: spaceId,
            metadata: { firstVisit: isFirstVisit }
        })

    return { success: true, duplicate: false, firstVisit: isFirstVisit }
}
