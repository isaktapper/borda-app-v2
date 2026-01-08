
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()
    const path = url.pathname

    // Legacy redirects: /projects/* -> /spaces/*
    if (path.startsWith('/projects')) {
        url.pathname = path.replace('/projects', '/spaces')
        return NextResponse.redirect(url, 301)
    }

    // Legacy redirects: /portal/[id]/* -> /space/[id]/shared/*
    if (path.startsWith('/portal/')) {
        const newPath = path.replace('/portal/', '/space/').replace(/^(\/space\/[^\/]+)(.*)$/, '$1/shared$2')
        url.pathname = newPath
        return NextResponse.redirect(url, 301)
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
