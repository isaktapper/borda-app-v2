import { getPortalProject, getPortalPages } from '../../actions'
import { getProjectProgress, getUpcomingTasks, getProjectActivity } from '@/app/dashboard/progress-actions'
import { notFound } from 'next/navigation'
import { ProgressBar } from '@/components/dashboard/progress-bar'
import { StatCard } from '@/components/dashboard/stat-card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { Card } from '@/components/ui/card'
import { CheckCircle2, FileText, ListChecks, Upload, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

// Disable caching so portal always shows latest content
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PortalOverview({
    params
}: {
    params: Promise<{ projectId: string }>
}) {
    const { projectId } = await params
    const project = await getPortalProject(projectId)
    const pages = await getPortalPages(projectId)

    if (!project) {
        notFound()
    }

    const progress = await getProjectProgress(projectId)
    const upcomingTasks = await getUpcomingTasks(projectId, 5)
    const activities = await getProjectActivity(projectId, 10)

    // Calculate days until go-live
    let daysUntilGoLive: number | null = null
    if (project.target_go_live) {
        const today = new Date()
        const goLive = new Date(project.target_go_live)
        daysUntilGoLive = Math.ceil((goLive.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            {/* Welcome Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Översikt</h1>
                <p className="text-muted-foreground">
                    Välkommen till ditt projektportal. Här kan du följa framstegen och se vad som behöver göras.
                </p>
            </div>

            {/* Progress Section */}
            <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Projektframsteg</h2>
                    <span className="text-3xl font-bold text-primary">
                        {progress?.progressPercentage || 0}%
                    </span>
                </div>
                <ProgressBar
                  value={progress?.progressPercentage || 0}
                  size="lg"
                  showPercentage={false}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold">{progress?.completedTasks || 0}/{progress?.totalTasks || 0}</p>
                        <p className="text-xs text-muted-foreground">Uppgifter klara</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{progress?.answeredQuestions || 0}/{progress?.totalQuestions || 0}</p>
                        <p className="text-xs text-muted-foreground">Frågor besvarade</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{progress?.completedChecklists || 0}/{progress?.totalChecklists || 0}</p>
                        <p className="text-xs text-muted-foreground">Checklistor klara</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{progress?.uploadedFiles || 0}/{progress?.totalFiles || 0}</p>
                        <p className="text-xs text-muted-foreground">Filer uppladdade</p>
                    </div>
                </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Uppgifter"
                    value={`${progress?.completedTasks || 0}/${progress?.totalTasks || 0}`}
                    description="Slutförda uppgifter"
                    icon={CheckCircle2}
                    variant={progress && progress.completedTasks === progress.totalTasks ? 'success' : 'default'}
                />
                <StatCard
                    title="Frågor"
                    value={`${progress?.answeredQuestions || 0}/${progress?.totalQuestions || 0}`}
                    description="Besvarade frågor"
                    icon={FileText}
                    variant={progress && progress.answeredQuestions === progress.totalQuestions ? 'success' : 'default'}
                />
                <StatCard
                    title="Checklistor"
                    value={`${progress?.completedChecklists || 0}/${progress?.totalChecklists || 0}`}
                    description="Kompletta checklistor"
                    icon={ListChecks}
                    variant={progress && progress.completedChecklists === progress.totalChecklists ? 'success' : 'default'}
                />
                <StatCard
                    title={daysUntilGoLive !== null ? "Dagar kvar" : "Go-live"}
                    value={daysUntilGoLive !== null ? daysUntilGoLive : "Ej satt"}
                    description={daysUntilGoLive !== null ? "Till lansering" : "Inget datum satt"}
                    icon={Calendar}
                    variant={daysUntilGoLive !== null && daysUntilGoLive < 7 ? 'warning' : 'default'}
                />
            </div>

            {/* Upcoming Tasks & Activity */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Upcoming Tasks */}
                <Card className="p-6">
                    <h3 className="text-sm font-semibold mb-4">Dina nästa steg</h3>
                    {upcomingTasks && upcomingTasks.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingTasks.slice(0, 5).map((task: any) => (
                                <div key={task.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                    <div className="rounded-full p-1.5 bg-primary/10 shrink-0 mt-0.5">
                                        <CheckCircle2 className="size-3 text-primary" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">{task.title}</p>
                                        {task.due_date && (
                                            <p className="text-xs text-muted-foreground">
                                                Deadline: {new Date(task.due_date).toLocaleDateString('sv-SE')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Inga uppgifter med deadline just nu
                        </p>
                    )}
                </Card>

                {/* Recent Activity */}
                <ActivityFeed
                    activities={activities}
                    emptyMessage="Ingen aktivitet än. Kom igång genom att slutföra uppgifter!"
                />
            </div>

            {/* Contact Info */}
            {project.organization && (
                <Card className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="rounded-full p-3 bg-primary/10">
                            <Users className="size-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold">Kontakta oss</h3>
                            <p className="text-sm text-muted-foreground">
                                Har du frågor eller behöver hjälp? Kontakta ditt team på {project.organization.name}.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}
