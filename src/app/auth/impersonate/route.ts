import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'

interface ImpersonationPayload {
    admin_user_id: string
    target_user_id: string
    type: 'impersonation'
    iat: number
    exp: number
}

export async function GET(request: Request) {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const returnUrl = url.searchParams.get('return_url') === 'true'

    if (!token) {
        return new Response('Missing token', { status: 400 })
    }

    // Check for required environment variables
    const impersonationSecret = process.env.IMPERSONATION_SECRET
    if (!impersonationSecret) {
        console.error('[Impersonate] IMPERSONATION_SECRET not configured')
        return new Response('Impersonation not configured', { status: 500 })
    }

    try {
        // 1. Verify JWT token
        const secret = new TextEncoder().encode(impersonationSecret)
        const { payload } = await jwtVerify(token, secret)
        const impersonationPayload = payload as unknown as ImpersonationPayload

        if (impersonationPayload.type !== 'impersonation') {
            console.error('[Impersonate] Invalid token type:', impersonationPayload.type)
            return new Response('Invalid token type', { status: 401 })
        }

        const { admin_user_id, target_user_id } = impersonationPayload

        // 2. Use Supabase SERVICE ROLE to get target user's email
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 3. Get target user
        const { data: targetUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name')
            .eq('id', target_user_id)
            .single()

        if (userError || !targetUser) {
            console.error('[Impersonate] Target user not found:', target_user_id)
            return new Response('User not found', { status: 404 })
        }

        // 4. Log the impersonation attempt (non-blocking)
        supabaseAdmin
            .from('impersonation_log')
            .insert({
                admin_user_id,
                target_user_id,
                target_user_email: targetUser.email,
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown',
            })
            .then(({ error }) => {
                if (error) {
                    console.error('[Impersonate] Failed to log impersonation:', error)
                }
            })

        // 5. Generate magic link for target user
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: targetUser.email,
        })

        if (linkError || !linkData) {
            console.error('[Impersonate] Failed to generate login link:', linkError)
            return new Response('Failed to generate login link', { status: 500 })
        }

        console.log(`[Impersonate] Admin ${admin_user_id} impersonating user ${target_user_id} (${targetUser.email})`)

        // 6. Build the auth callback URL
        // Use NEXT_PUBLIC_APP_URL for production, request origin for dev
        const baseUrl = process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_APP_URL
            : new URL(request.url).origin
        const redirectUrl = new URL('/auth/callback', baseUrl)
        redirectUrl.searchParams.set('token_hash', linkData.properties.hashed_token)
        redirectUrl.searchParams.set('type', 'magiclink')
        redirectUrl.searchParams.set('next', '/spaces')

        // If return_url=true, return the URL as JSON (for opening in new window)
        if (returnUrl) {
            return NextResponse.json({
                url: redirectUrl.toString(),
                target_user: {
                    id: targetUser.id,
                    email: targetUser.email,
                    full_name: targetUser.full_name
                }
            })
        }

        // Otherwise, redirect directly
        return NextResponse.redirect(redirectUrl)

    } catch (error) {
        // Handle JWT verification errors
        if (error instanceof Error) {
            if (error.message.includes('expired')) {
                console.error('[Impersonate] Token expired')
                return new Response('Impersonation token expired', { status: 401 })
            }
            if (error.message.includes('signature')) {
                console.error('[Impersonate] Invalid token signature')
                return new Response('Invalid impersonation token', { status: 401 })
            }
        }

        console.error('[Impersonate] Unexpected error:', error)
        return new Response('Invalid or expired token', { status: 401 })
    }
}
