import { getProjects } from "./actions"
import { createClient } from '@/lib/supabase/server'
import { getProjectStats } from './progress-actions'
import { ProjectsPageClient } from './projects-page-client'

export default async function ProjectsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Not authenticated</div>
    }

    // Get user's organization
    const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        return <div>No organization found</div>
    }

    const [projects, stats] = await Promise.all([
        getProjects(),
        getProjectStats(membership.organization_id)
    ])

    return <ProjectsPageClient projects={projects} stats={stats} />
}
