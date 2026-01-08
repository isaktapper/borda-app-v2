import { getSpaces } from "./actions"
import { createClient } from '@/lib/supabase/server'
import { getSpaceStats } from './progress-actions'
import { SpacesPageClient } from './spaces-page-client'
import { redirect } from 'next/navigation'

export default async function SpacesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's organization
    const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        redirect('/onboarding')
    }

    const [spaces, stats] = await Promise.all([
        getSpaces(),
        getSpaceStats(membership.organization_id)
    ])

    return <SpacesPageClient spaces={spaces} stats={stats} />
}
