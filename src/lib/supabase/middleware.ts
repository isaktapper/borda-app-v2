
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const updateSession = async (request: NextRequest) => {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Route protection logic
    const url = request.nextUrl.clone()
    const path = url.pathname

    // Public routes (always accessible)
    const publicRoutes = ['/login', '/signup', '/verify', '/auth/callback', '/']
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route))

    // Protected routes (all app routes that require auth)
    const protectedRoutes = ['/spaces', '/templates', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    const isSpaceSharedRoute = path.startsWith('/space/')

    // 1. Protected Routes (Supabase Auth)
    if (isProtectedRoute && !user) {
        url.pathname = '/login'
        url.searchParams.set('redirect', path)
        return NextResponse.redirect(url)
    }

    // 2. Space Shared Portal Protection (Custom Cookie Session)
    // Route structure: /space/[spaceId]/shared/...
    if (isSpaceSharedRoute) {
        // Extract space ID from /space/[spaceId]/shared/...
        const segments = path.split('/')
        const spaceId = segments[2]
        const isSharedRoute = segments[3] === 'shared'
        const isAccessPage = segments[4] === 'access'

        if (spaceId && isSharedRoute && !isAccessPage) {
            // Check for custom portal session cookie
            const sessionCookie = request.cookies.get(`portal_session_${spaceId}`)

            // If no cookie, redirect to access page
            if (!sessionCookie) {
                // If the user is logged in as internal staff, we might want to let them through,
                // but for now let's follow the strict customer flow.
                url.pathname = `/space/${spaceId}/shared/access`
                return NextResponse.redirect(url)
            }
        }
    }

    // 3. Auth Routes (Redirect to projects if already logged in as staff)
    const authRoutes = ['/login', '/signup', '/verify']
    const isAuthRoute = authRoutes.some(route => path.startsWith(route))

    if (user && isAuthRoute) {
        url.pathname = '/spaces'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
