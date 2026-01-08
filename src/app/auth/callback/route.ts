import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const nextParam = searchParams.get('next') ?? '/spaces'
    
    // Validate the next parameter - fallback to projects if invalid
    const next = isValidRedirectPath(nextParam) ? nextParam : '/spaces'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Check if user belongs to an organization or a project
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Check if user belongs to an organization
                const { data: membership } = await supabase
                    .from('organization_members')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                // If they have an org, go to projects. Otherwise onboarding.
                const finalNext = membership ? next : '/onboarding'

                const forwardedHost = request.headers.get('x-forwarded-host')
                const isLocalEnv = process.env.NODE_ENV === 'development'

                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}${finalNext}`)
                } else if (forwardedHost && isAllowedHost(forwardedHost)) {
                    // Only use forwardedHost if it's in our allowlist
                    return NextResponse.redirect(`https://${forwardedHost}${finalNext}`)
                } else {
                    // Fallback to origin (which is derived from the request URL)
                    return NextResponse.redirect(`${origin}${finalNext}`)
                }
            }
        } else {
            console.error('Auth Callback Error:', error)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
        }
    }

    // fallback if no code or other failure
    return NextResponse.redirect(`${origin}/login?error=auth_code_missing`)
}
