import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

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

                // If they have an org, go to dashboard. Otherwise onboarding.
                const finalNext = membership ? next : '/onboarding'

                const forwardedHost = request.headers.get('x-forwarded-host')
                const isLocalEnv = process.env.NODE_ENV === 'development'

                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}${finalNext}`)
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${finalNext}`)
                } else {
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
