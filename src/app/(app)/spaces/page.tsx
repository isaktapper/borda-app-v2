import { getSpaces } from "./actions"
import { getSpaceStats } from './progress-actions'
import { SpacesPageClient } from './spaces-page-client'
import { redirect } from 'next/navigation'
import { getCachedUser, getCachedOrgMember, getCachedProfile } from '@/lib/queries/user'

export default async function SpacesPage() {
    // Use cached user query (deduplicates with layout.tsx)
    const { user } = await getCachedUser()

    if (!user) {
        redirect('/login')
    }

    // Use cached org member query (deduplicates with layout.tsx)
    const { data: membership } = await getCachedOrgMember(user.id)

    if (!membership) {
        redirect('/onboarding')
    }

    // Fetch spaces and stats in parallel
    const [spaces, stats, { data: profile }] = await Promise.all([
        getSpaces(),
        getSpaceStats(membership.organization_id),
        getCachedProfile(user.id) // Use cached profile query
    ])

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User'

    return <SpacesPageClient spaces={spaces} stats={stats} userName={userName} />
}
