import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * API endpoint for logging session duration via sendBeacon
 * Used when the page is closed/navigated away from
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { spaceId, visitorEmail, durationSeconds } = body

        if (!spaceId || !visitorEmail || typeof durationSeconds !== 'number') {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        // Don't log very short sessions
        if (durationSeconds < 3) {
            return NextResponse.json({ success: true, skipped: true })
        }

        const supabase = await createAdminClient()

        // Format duration for display
        const formatDuration = (seconds: number): string => {
            if (seconds < 60) {
                return `${seconds}s`
            }
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            if (minutes < 60) {
                return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
            }
            const hours = Math.floor(minutes / 60)
            const remainingMinutes = minutes % 60
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
        }

        // Log to activity_log
        await supabase
            .from('activity_log')
            .insert({
                space_id: spaceId,
                actor_email: visitorEmail,
                action: 'portal.session_end',
                resource_type: 'portal',
                resource_id: spaceId,
                metadata: { 
                    durationSeconds,
                    durationFormatted: formatDuration(durationSeconds)
                }
            })

        // Update the most recent portal_visit with the duration
        const { data: recentVisit } = await supabase
            .from('portal_visits')
            .select('id')
            .eq('space_id', spaceId)
            .eq('visitor_email', visitorEmail)
            .order('visited_at', { ascending: false })
            .limit(1)
            .single()

        if (recentVisit) {
            await supabase
                .from('portal_visits')
                .update({ session_duration_seconds: durationSeconds })
                .eq('id', recentVisit.id)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[session-duration API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
