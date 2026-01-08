'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export interface ApprovedEmail {
    id: string
    email: string
    invitedAt: string
    joinedAt: string | null
}

export interface ShareSettings {
    accessMode: 'public' | 'restricted'
    hasPassword: boolean
    requireEmailForAnalytics: boolean
    approvedEmails: ApprovedEmail[]
    projectStatus: string
}

export interface UpdateShareSettingsInput {
    accessMode?: 'public' | 'restricted'
    password?: string | null  // null to remove password, undefined to keep unchanged
    requireEmailForAnalytics?: boolean
}

export async function getShareSettings(spaceId: string): Promise<{ success: true; data: ShareSettings } | { success: false; error: string }> {
    const supabase = await createClient()

    // Get project settings
    const { data: project, error: projectError } = await supabase
        .from('spaces')
        .select('access_mode, access_password_hash, require_email_for_analytics, status')
        .eq('id', spaceId)
        .single()

    if (projectError || !project) {
        console.error('[getShareSettings] Project error:', projectError)
        return { success: false, error: 'Could not load project settings' }
    }

    // Get approved customers
    const { data: members, error: membersError } = await supabase
        .from('space_members')
        .select('id, invited_email, invited_at, joined_at')
        .eq('space_id', spaceId)
        .eq('role', 'customer')
        .order('invited_at', { ascending: false, nullsFirst: false })

    if (membersError) {
        console.error('[getShareSettings] Members error:', membersError)
        return { success: false, error: 'Could not load approved emails' }
    }

    const approvedEmails: ApprovedEmail[] = (members || []).map(m => ({
        id: m.id,
        email: m.invited_email || '',
        invitedAt: m.invited_at || '',
        joinedAt: m.joined_at
    }))

    return {
        success: true,
        data: {
            accessMode: project.access_mode as 'public' | 'restricted',
            hasPassword: !!project.access_password_hash,
            requireEmailForAnalytics: project.require_email_for_analytics || false,
            approvedEmails,
            projectStatus: project.status
        }
    }
}

export async function updateShareSettings(
    spaceId: string,
    settings: UpdateShareSettingsInput
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {}

    if (settings.accessMode !== undefined) {
        updateData.access_mode = settings.accessMode
    }

    if (settings.requireEmailForAnalytics !== undefined) {
        updateData.require_email_for_analytics = settings.requireEmailForAnalytics
    }

    // Handle password
    if (settings.password === null) {
        // Remove password
        updateData.access_password_hash = null
    } else if (settings.password !== undefined && settings.password.length > 0) {
        // Set new password
        const hash = await bcrypt.hash(settings.password, 10)
        updateData.access_password_hash = hash
    }

    if (Object.keys(updateData).length === 0) {
        return { success: true }
    }

    const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', spaceId)

    if (error) {
        console.error('[updateShareSettings] Error:', error)
        return { success: false, error: 'Could not update share settings' }
    }

    return { success: true }
}

export async function addApprovedEmail(
    spaceId: string,
    email: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const supabase = await createAdminClient()

    // Check if email already exists
    const { data: existing } = await supabase
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('invited_email', email.toLowerCase())
        .eq('role', 'customer')
        .single()

    if (existing) {
        return { success: false, error: 'Email already added' }
    }

    // Add new customer
    const { data, error } = await supabase
        .from('space_members')
        .insert({
            space_id: spaceId,
            invited_email: email.toLowerCase(),
            role: 'customer',
            invited_at: new Date().toISOString()
        })
        .select('id')
        .single()

    if (error) {
        console.error('[addApprovedEmail] Error:', error)
        return { success: false, error: 'Could not add email' }
    }

    return { success: true, id: data.id }
}

export async function removeApprovedEmail(
    spaceId: string,
    memberId: string
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('id', memberId)
        .eq('space_id', spaceId)
        .eq('role', 'customer')

    if (error) {
        console.error('[removeApprovedEmail] Error:', error)
        return { success: false, error: 'Could not remove email' }
    }

    return { success: true }
}

export async function updateSpaceStatus(
    spaceId: string,
    status: string
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('spaces')
        .update({ status })
        .eq('id', spaceId)

    if (error) {
        console.error('[updateSpaceStatus] Error:', error)
        return { success: false, error: 'Could not update project status' }
    }

    return { success: true }
}

