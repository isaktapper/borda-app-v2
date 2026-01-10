import { notFound } from "next/navigation"
import { getProject } from "@/app/(app)/spaces/actions"
import { getPages } from "@/app/(app)/spaces/[spaceId]/pages-actions"
import { getProjectEngagement } from "@/app/(app)/spaces/[spaceId]/engagement-actions"
import { getSpaceProgress } from "@/app/(app)/spaces/progress-actions"
import { ProjectV2Client } from "@/components/dashboard/space-v2-client"
import { canRemoveBranding } from "@/lib/permissions"

interface ProjectPageProps {
    params: Promise<{ spaceId: string }>
    searchParams: Promise<{ tab?: string; page?: string }>
}

export default async function ProjectEditorPage({ params, searchParams }: ProjectPageProps) {
    const { spaceId } = await params
    const { tab = 'editor', page } = await searchParams

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

    return (
        <ProjectV2Client
            project={project}
            spaceId={spaceId}
            initialPages={initialPages}
            engagement={engagement}
            progress={progress}
            initialTab={tab as 'editor' | 'activity' | 'responses' | 'settings'}
            initialPageId={page}
            canRemoveBranding={canRemove}
        />
    )
}
