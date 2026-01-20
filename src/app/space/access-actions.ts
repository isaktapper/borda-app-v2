'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/portal-auth'
import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

export interface PortalAccessSettings {
    accessMode: 'public' | 'restricted'
    hasPassword: boolean
    requireEmailForAnalytics: boolean
    projectStatus: string
    clientName: string
    logoUrl: string | null
    brandColor: string | null
    orgLogoUrl: string | null
    orgBrandColor: string | null
}

export async function validatePortalToken(spaceId: string, token: string) {
    const supabase = await createAdminClient()

    // 1. Check project status first
    const { data: project } = await supabase
        .from('spaces')
        .select('id, status, client_name')
        .eq('id', spaceId)
        .single()

    if (!project) {
        return { error: 'Projektet kunde inte hittas.' }
    }

    // Block access to draft and archived projects
    if (project.status === 'draft') {
        return { error: 'Portal is not ready yet. Contact your team for more information.' }
    }

    if (project.status === 'archived') {
        return { error: 'This project is archived and no longer available.' }
    }

    // 2. Find and validate token
    const { data: tokenRecord, error: fetchError } = await supabase
        .from('portal_access_tokens')
        .select('*')
        .eq('space_id', spaceId)
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (fetchError || !tokenRecord) {
        return { error: 'Link is invalid or has expired.' }
    }

    // 2. Mark token as used
    await supabase
        .from('portal_access_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenRecord.id)

    // 3. Update project_members joined_at if not set
    await supabase
        .from('space_members')
        .update({ joined_at: new Date().toISOString() })
        .eq('space_id', spaceId)
        .eq('invited_email', tokenRecord.email)
        .is('joined_at', null)

    // 4. Create session cookie
    await createPortalSession(spaceId, tokenRecord.email)

    // 4. Redirect to portal
    redirect(`/space/${spaceId}/shared`)
}

export async function requestPortalAccess(spaceId: string, email: string) {
    const supabase = await createAdminClient()

    // 1. Verify that email is a stakeholder of the project
    const { data: member, error: memberError } = await supabase
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('invited_email', email)
        .eq('role', 'stakeholder')
        .limit(1)
        .single()

    if (memberError || !member) {
        // We return success anyway to prevent email enumeration, 
        // but we only send the link if they are actually a member.
        return { success: true, message: "If your email is in our system, we've sent you a link!" }
    }

    // 2. Generate new token
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: tokenError } = await supabase
        .from('portal_access_tokens')
        .insert({
            space_id: spaceId,
            email,
            token,
            expires_at: expiresAt.toISOString()
        })

    if (tokenError) {
        console.error('Error creating portal token:', tokenError)
        return { error: 'Something went wrong generating the link.' }
    }

    // 3. TODO: Send Email (using Resend or similar email service)
    const accessLink = `${process.env.NEXT_PUBLIC_APP_URL}/space/${spaceId}/access?token=${token}`

    return { success: true, message: "We've sent a new access link to your email!" }
}

/**
 * Get portal access settings for the access page
 */
export async function getPortalAccessSettings(spaceId: string): Promise<
    { success: true; data: PortalAccessSettings } | { success: false; error: string }
> {
    const supabase = await createAdminClient()

    const { data: project, error } = await supabase
        .from('spaces')
        .select(`
            access_mode,
            access_password_hash,
            require_email_for_analytics,
            status,
            client_name,
            logo_path,
            brand_color,
            organization_id,
            organizations!inner(logo_path, brand_color)
        `)
        .eq('id', spaceId)
        .single()

    if (error || !project) {
        return { success: false, error: 'Project not found' }
    }

    const org = project.organizations as any

    // Generate signed URLs for logos
    let logoUrl = null
    if (project.logo_path) {
        const { data } = await supabase.storage
            .from('branding')
            .createSignedUrl(project.logo_path, 60 * 60 * 24) // 24 hour expiry
        logoUrl = data?.signedUrl || null
    }

    let orgLogoUrl = null
    if (org?.logo_path) {
        const { data } = await supabase.storage
            .from('branding')
            .createSignedUrl(org.logo_path, 60 * 60 * 24)
        orgLogoUrl = data?.signedUrl || null
    }

    return {
        success: true,
        data: {
            accessMode: project.access_mode as 'public' | 'restricted',
            hasPassword: !!project.access_password_hash,
            requireEmailForAnalytics: project.require_email_for_analytics || false,
            projectStatus: project.status,
            clientName: project.client_name,
            logoUrl,
            brandColor: project.brand_color || null,
            orgLogoUrl,
            orgBrandColor: org?.brand_color || null
        }
    }
}

/**
 * Grant access to public portal (optionally with password and/or email)
 */
export async function grantPublicAccess(
    spaceId: string,
    password?: string,
    email?: string
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createAdminClient()

    // Get project settings
    const { data: project, error } = await supabase
        .from('spaces')
        .select('access_mode, access_password_hash, status')
        .eq('id', spaceId)
        .single()

    if (error || !project) {
        return { success: false, error: 'Project not found' }
    }

    // Check project status
    if (project.status === 'draft') {
        return { success: false, error: 'This portal is not ready yet.' }
    }

    if (project.status === 'archived') {
        return { success: false, error: 'This portal is no longer available.' }
    }

    // Verify it's actually public
    if (project.access_mode !== 'public') {
        return { success: false, error: 'This portal requires approved access.' }
    }

    // Check password if required
    if (project.access_password_hash) {
        if (!password) {
            return { success: false, error: 'Password is required' }
        }
        const valid = await bcrypt.compare(password, project.access_password_hash)
        if (!valid) {
            return { success: false, error: 'Incorrect password' }
        }
    }

    // Create session with email (could be real email or anonymous-xxxx ID)
    // The email parameter is now always provided by the client
    const sessionEmail = email?.trim().toLowerCase() || 'anonymous'
    await createPortalSession(spaceId, sessionEmail)

    return { success: true }
}

/**
 * Validate restricted access (email must be in approved list)
 */
export async function validateRestrictedAccess(
    spaceId: string,
    email: string,
    password?: string
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createAdminClient()

    // Get project settings
    const { data: project, error } = await supabase
        .from('spaces')
        .select('access_mode, access_password_hash, status')
        .eq('id', spaceId)
        .single()

    if (error || !project) {
        return { success: false, error: 'Project not found' }
    }

    // Check project status
    if (project.status === 'draft') {
        return { success: false, error: 'This portal is not ready yet.' }
    }

    if (project.status === 'archived') {
        return { success: false, error: 'This portal is no longer available.' }
    }

    // Check if email is approved (stakeholder)
    const { data: member } = await supabase
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('invited_email', email.toLowerCase())
        .eq('role', 'stakeholder')
        .single()

    if (!member) {
        return { success: false, error: 'Access denied. Your email is not authorized for this portal.' }
    }

    // Check password if required
    if (project.access_password_hash) {
        if (!password) {
            return { success: false, error: 'Password is required' }
        }
        const valid = await bcrypt.compare(password, project.access_password_hash)
        if (!valid) {
            return { success: false, error: 'Incorrect password' }
        }
    }

    // Update joined_at if first visit
    await supabase
        .from('space_members')
        .update({ joined_at: new Date().toISOString() })
        .eq('space_id', spaceId)
        .eq('invited_email', email.toLowerCase())
        .is('joined_at', null)

    // Create session
    await createPortalSession(spaceId, email.toLowerCase())

    return { success: true }
}
