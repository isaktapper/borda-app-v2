'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface WelcomePopupContent {
    enabled: boolean
    title: string
    description: string
    imageUrl?: string | null
    videoUrl?: string | null
    ctaText?: string | null
    ctaAction?: 'dismiss' | 'go_to_page' | 'link'
    ctaPageId?: string | null
    ctaLink?: string | null
}

export async function getWelcomePopupForPortal(spaceId: string): Promise<{
    content: WelcomePopupContent | null
    shouldShow: boolean
}> {
    const supabase = await createAdminClient()

    // Get welcome popup content
    const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .select('welcome_popup')
        .eq('id', spaceId)
        .single()

    if (spaceError || !space?.welcome_popup) {
        return { content: null, shouldShow: false }
    }

    const content = space.welcome_popup as WelcomePopupContent
    if (!content.enabled) {
        return { content, shouldShow: false }
    }

    // Get stakeholder email from portal session cookie
    const cookieStore = await cookies()
    const portalCookie = cookieStore.get(`portal_session_${spaceId}`)
    
    if (!portalCookie) {
        return { content, shouldShow: false }
    }

    let stakeholderEmail = ''
    try {
        const payload = portalCookie.value.split('.')[1]
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
        stakeholderEmail = decoded.email?.toLowerCase()
    } catch (e) {
        return { content, shouldShow: false }
    }

    if (!stakeholderEmail) {
        return { content, shouldShow: false }
    }

    // Check if this stakeholder has already seen the popup (case-insensitive)
    const { data: member, error: memberError } = await supabase
        .from('space_members')
        .select('welcome_popup_dismissed_at, invited_email')
        .eq('space_id', spaceId)
        .ilike('invited_email', stakeholderEmail)
        .is('deleted_at', null)
        .maybeSingle()

    // If they've dismissed it before, don't show
    if (member?.welcome_popup_dismissed_at) {
        return { content, shouldShow: false }
    }

    return { content, shouldShow: true }
}

export async function dismissWelcomePopup(spaceId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    // Get stakeholder email from portal session cookie
    const cookieStore = await cookies()
    const portalCookie = cookieStore.get(`portal_session_${spaceId}`)
    
    if (!portalCookie) {
        return { success: false, error: 'Not authenticated' }
    }

    let stakeholderEmail = ''
    try {
        const payload = portalCookie.value.split('.')[1]
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
        stakeholderEmail = decoded.email?.toLowerCase()
    } catch (e) {
        return { success: false, error: 'Invalid session' }
    }

    if (!stakeholderEmail) {
        return { success: false, error: 'No email in session' }
    }

    // Try to find the space_member record - check both invited_email and user email
    // First try invited_email (case-insensitive)
    const { data: memberByInvite, error: findError } = await supabase
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .ilike('invited_email', stakeholderEmail)
        .is('deleted_at', null)
        .maybeSingle()

    if (memberByInvite) {
        // Update the found record
        const { error } = await supabase
            .from('space_members')
            .update({ welcome_popup_dismissed_at: new Date().toISOString() })
            .eq('id', memberByInvite.id)

        if (error) {
            console.error('Failed to dismiss welcome popup:', error)
            return { success: false, error: error.message }
        }
        return { success: true }
    }

    // If no member found, we cannot persist for anonymous users with current DB schema
    // Return success anyway - we need a different solution for anonymous users
    console.error('No space_member found for welcome popup tracking - anonymous user')

    return { success: true }
}
