import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
    process.env.PORTAL_SESSION_SECRET || 'fallback-secret-at-least-32-chars-long'
)

export interface PortalSession {
    email: string
    projectId: string
    expiresAt: string
}

export async function createPortalSession(projectId: string, email: string) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const session: PortalSession = {
        email,
        projectId,
        expiresAt: expiresAt.toISOString(),
    }

    const token = await new SignJWT({ ...session })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(SECRET_KEY)

    const cookieStore = await cookies()
    cookieStore.set(`portal_session_${projectId}`, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    })

    return session
}

export async function verifyPortalSession(projectId: string): Promise<PortalSession | null> {
    const cookieStore = await cookies()
    const cookieName = `portal_session_${projectId}`
    const token = cookieStore.get(cookieName)?.value

    if (!token) return null

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY)
        const session = payload as unknown as PortalSession

        // Final sanity check: ensuring project ID match
        if (session.projectId !== projectId) {
            console.error('[verifyPortalSession] Project ID mismatch! Expected:', projectId, 'Got:', session.projectId)
            return null
        }

        return session
    } catch (err) {
        console.error('[verifyPortalSession] Session verification failed:', err)
        return null
    }
}

export async function deletePortalSession(projectId: string) {
    const cookieStore = await cookies()
    cookieStore.delete(`portal_session_${projectId}`)
}
