import { notFound } from "next/navigation"
import { getProject } from "@/app/(app)/spaces/actions"
import { getPages } from "@/app/(app)/spaces/[spaceId]/pages-actions"
import { getProjectEngagement } from "@/app/(app)/spaces/[spaceId]/engagement-actions"
import { getSpaceProgress } from "@/app/(app)/spaces/progress-actions"
import { ProjectV2Client } from "@/components/dashboard/space-v2-client"
import { canRemoveBranding } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"

interface ProjectPageProps {
    params: Promise<{ spaceId: string }>
    searchParams: Promise<{ tab?: string; page?: string }>
}

export default async function ProjectEditorPage({ params, searchParams }: ProjectPageProps) {
    const { spaceId } = await params
    const { tab = 'editor', page } = await searchParams

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [project, initialPages, engagement, progress] = await Promise.all([
        getProject(spaceId),
        getPages(spaceId),
        getProjectEngagement(spaceId),
        getSpaceProgress(spaceId)
    ])

    if (!project) {
        notFound()
    }

    // Check if organization's plan allows removing branding
    const canRemove = await canRemoveBranding(project.organization_id)

    // Get unread notification count for chat
    let chatUnreadCount = 0
    if (user) {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_user_id', user.id)
            .eq('space_id', spaceId)
            .eq('type', 'chat_message')
            .is('read_at', null)
        chatUnreadCount = count || 0
    }

    return (
        <ProjectV2Client
            project={project}
            spaceId={spaceId}
            initialPages={initialPages}
            engagement={engagement}
            progress={progress}
            initialTab={tab as 'editor' | 'activity' | 'responses' | 'chat' | 'settings'}
            initialPageId={page}
            canRemoveBranding={canRemove}
            currentUserEmail={user?.email}
            chatUnreadCount={chatUnreadCount}
        />
    )
}
