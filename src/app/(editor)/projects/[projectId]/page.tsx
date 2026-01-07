import { notFound } from "next/navigation"
import { getProject } from "@/app/(app)/projects/actions"
import { getPages } from "@/app/(app)/projects/[projectId]/pages-actions"
import { getProjectEngagement } from "@/app/(app)/projects/[projectId]/engagement-actions"
import { getProjectProgress } from "@/app/(app)/projects/progress-actions"
import { ProjectV2Client } from "@/components/dashboard/project-v2-client"

interface ProjectPageProps {
    params: Promise<{ projectId: string }>
    searchParams: Promise<{ tab?: string; page?: string }>
}

export default async function ProjectEditorPage({ params, searchParams }: ProjectPageProps) {
    const { projectId } = await params
    const { tab = 'editor', page } = await searchParams

    const [project, initialPages, engagement, progress] = await Promise.all([
        getProject(projectId),
        getPages(projectId),
        getProjectEngagement(projectId),
        getProjectProgress(projectId)
    ])

    if (!project) {
        notFound()
    }

    return (
        <ProjectV2Client
            project={project}
            projectId={projectId}
            initialPages={initialPages}
            engagement={engagement}
            progress={progress}
            initialTab={tab as 'editor' | 'activity' | 'responses' | 'settings'}
            initialPageId={page}
        />
    )
}
