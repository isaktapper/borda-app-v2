import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'

// Allowlist of trusted hosts
const ALLOWED_HOSTS = [
    'borda.work',
    'www.borda.work',
    'app.borda.work',
]

// Validate that the redirect path is safe (relative path only)
function isValidRedirectPath(path: string): boolean {
    // Must start with / and not contain protocol or double slashes
    if (!path.startsWith('/')) return false
    if (path.startsWith('//')) return false
    if (path.includes('://')) return false
    // Prevent encoded attacks
    const decoded = decodeURIComponent(path)
    if (decoded.startsWith('//')) return false
    if (decoded.includes('://')) return false
    return true
}

// Validate that the host is in our allowlist
function isAllowedHost(host: string): boolean {
    return ALLOWED_HOSTS.includes(host.toLowerCase())
}

function getRedirectUrl(request: Request, path: string): string {
    const { origin } = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    if (isLocalEnv) {
        return `${origin}${path}`
    } else if (forwardedHost && isAllowedHost(forwardedHost)) {
        return `https://${forwardedHost}${path}`
    } else {
        return `${origin}${path}`
    }
}

// Send welcome email for new users (non-blocking)
async function sendWelcomeEmailIfNew(userId: string, email: string, fullName: string | undefined) {
    try {
        const adminSupabase = await createAdminClient()

        // Check if welcome email was already sent
        const { data: user } = await adminSupabase
            .from('users')
            .select('welcome_email_sent_at')
            .eq('id', userId)
            .single()

        if (user?.welcome_email_sent_at) {
            return // Already sent
        }

        const firstName = fullName?.split(' ')[0] || 'there'

        await sendWelcomeEmail({
            to: email,
            firstName,
            userId,
        })

        // Mark as sent
        await adminSupabase
            .from('users')
            .update({ welcome_email_sent_at: new Date().toISOString() })
            .eq('id', userId)

    } catch (error) {
        console.error('Error sending welcome email:', error)
        // Don't block the auth flow if email fails
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    
    // Get all possible auth parameters
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const nextParam = searchParams.get('next') ?? '/spaces'
    
    // Validate the next parameter
    const next = isValidRedirectPath(nextParam) ? nextParam : '/spaces'
    
    const supabase = await createClient()

    // Handle token_hash + type flow (password reset, email verification, etc.)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (error) {
            console.error('Auth Callback Error (verifyOtp):', error)
            return NextResponse.redirect(getRedirectUrl(request, `/login?error=${encodeURIComponent(error.message)}`))
        }

        // For password recovery, redirect to update-password page
        if (type === 'recovery') {
            return NextResponse.redirect(getRedirectUrl(request, '/update-password'))
        }

        // For email verification or other types, continue with normal flow
        const { data: { user } } = await supabase.auth.getUser()

        // Send welcome email for new users (email verification = new signup)
        if (user && (type === 'email' || type === 'signup')) {
            // Fire and forget - don't await to avoid blocking redirect
            sendWelcomeEmailIfNew(
                user.id,
                user.email || '',
                user.user_metadata?.full_name
            )
        }
        
        if (user) {
            // Check if user has a pending invitation from signup metadata
            const pendingInvitationId = user.user_metadata?.pending_invitation_id
            const pendingOrganizationId = user.user_metadata?.pending_organization_id

            if (pendingInvitationId && pendingOrganizationId) {
                // Link user to the organization they were invited to
                const adminSupabase = await createAdminClient()
                
                await adminSupabase
                    .from('organization_members')
                    .update({
                        user_id: user.id,
                        joined_at: new Date().toISOString(),
                    })
                    .eq('id', pendingInvitationId)
                    .eq('organization_id', pendingOrganizationId)
                    .is('user_id', null)

                // Clear the pending invitation metadata
                await supabase.auth.updateUser({
                    data: {
                        pending_invitation_id: null,
                        pending_organization_id: null,
                    }
                })

                // Skip onboarding, go directly to spaces
                return NextResponse.redirect(getRedirectUrl(request, '/spaces'))
            }

            // Also check if user was invited by email (they might have signed up normally)
            const adminSupabase = await createAdminClient()
            const { data: existingInvitation } = await adminSupabase
                .from('organization_members')
                .select('id, organization_id')
                .eq('invited_email', user.email)
                .is('user_id', null)
                .is('deleted_at', null)
                .maybeSingle()

            if (existingInvitation) {
                // Link user to their invitation
                await adminSupabase
                    .from('organization_members')
                    .update({
                        user_id: user.id,
                        joined_at: new Date().toISOString(),
                    })
                    .eq('id', existingInvitation.id)

                return NextResponse.redirect(getRedirectUrl(request, '/spaces'))
            }

            // Check if user already has an org membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            const finalNext = membership ? next : '/onboarding'
            return NextResponse.redirect(getRedirectUrl(request, finalNext))
        }

        return NextResponse.redirect(getRedirectUrl(request, next))
    }

    // Handle code exchange flow (OAuth, magic link with PKCE, email verification)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Send welcome email for new users (fire and forget)
                sendWelcomeEmailIfNew(
                    user.id,
                    user.email || '',
                    user.user_metadata?.full_name
                )

                // Check if user was invited by email
                const adminSupabase = await createAdminClient()
                const { data: existingInvitation } = await adminSupabase
                    .from('organization_members')
                    .select('id, organization_id')
                    .eq('invited_email', user.email)
                    .is('user_id', null)
                    .is('deleted_at', null)
                    .maybeSingle()

                if (existingInvitation) {
                    // Link user to their invitation
                    await adminSupabase
                        .from('organization_members')
                        .update({
                            user_id: user.id,
                            joined_at: new Date().toISOString(),
                        })
                        .eq('id', existingInvitation.id)

                    return NextResponse.redirect(getRedirectUrl(request, '/spaces'))
                }

                // Check if user already has an org membership
                const { data: membership } = await supabase
                    .from('organization_members')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                const finalNext = membership ? next : '/onboarding'
                return NextResponse.redirect(getRedirectUrl(request, finalNext))
            }
        } else {
            console.error('Auth Callback Error:', error)
            return NextResponse.redirect(getRedirectUrl(request, `/login?error=${encodeURIComponent(error.message)}`))
        }
    }

    // Fallback if no code or token_hash
    return NextResponse.redirect(getRedirectUrl(request, '/login?error=auth_code_missing'))
}
