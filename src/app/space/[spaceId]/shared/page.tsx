import { getPortalSpace, getPortalPages } from '../../actions'
import { getSpaceProgress, getUpcomingTasks, getSpaceActivity } from '@/app/(app)/spaces/progress-actions'
import { notFound } from 'next/navigation'
import { ProgressBar } from '@/components/dashboard/progress-bar'
import { Card } from '@/components/ui/card'
import { CheckCircle2, FileText, Upload, Calendar, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { PortalPageNavigation } from '@/components/portal/portal-page-navigation'
import { formatDistanceToNow } from 'date-fns'

// Disable caching so portal always shows latest content
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PortalOverview({
    params
}: {
    params: Promise<{ spaceId: string }>
}) {
    const { spaceId } = await params
    const project = await getPortalSpace(spaceId)
    const pages = await getPortalPages(spaceId)

    if (!project) {
        notFound()
    }

    const progress = await getSpaceProgress(spaceId, true) // Use admin client for portal access
    const upcomingTasks = await getUpcomingTasks(spaceId, 5, true) // Use admin client for portal access
    const activities = await getSpaceActivity(spaceId, 10, true) // Use admin client for portal access

    // Calculate days until go-live
    let daysUntilGoLive: number | null = null
    if (project.target_go_live) {
        const today = new Date()
        const goLive = new Date(project.target_go_live)
        daysUntilGoLive = Math.ceil((goLive.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate pending items
    const pendingTasks = (progress?.totalTasks || 0) - (progress?.completedTasks || 0)
    const pendingForms = (progress?.totalForms || 0) - (progress?.answeredForms || 0)
    const pendingFiles = (progress?.totalFiles || 0) - (progress?.uploadedFiles || 0)
    const totalPending = pendingTasks + pendingForms + pendingFiles

    // Find next deadline
    const nextDeadline = upcomingTasks?.[0]?.due_date ? new Date(upcomingTasks[0].due_date) : null
    const daysUntilDeadline = nextDeadline
        ? Math.ceil((nextDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null

    // Find first page to link to
    const firstPage = pages.length > 0 ? pages[0] : null

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Hero Section */}
            {totalPending > 0 ? (
                <Card className="bg-white/95 backdrop-blur-sm overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-start justify-between gap-6">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary/10 rounded-md">
                                    <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                        {progress?.progressPercentage === 0 ? "Let's get started" : 'Keep going'}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight mb-1">
                                        {totalPending} {totalPending === 1 ? 'item' : 'items'} remaining
                                    </h1>
                                    {nextDeadline && daysUntilDeadline !== null && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            Next deadline: {nextDeadline.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                                            <span className={daysUntilDeadline <= 3 ? 'text-orange-600 font-semibold' : ''}>
                                                ({daysUntilDeadline} {daysUntilDeadline === 1 ? 'day' : 'days'})
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold text-primary">{progress?.progressPercentage || 0}%</div>
                                <div className="text-xs text-muted-foreground font-medium">Complete</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <ProgressBar
                                value={progress?.progressPercentage || 0}
                                size="lg"
                                showPercentage={false}
                            />
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                <span className="text-sm">
                                    <span className="font-semibold">{progress?.completedTasks || 0}</span>
                                    <span className="text-muted-foreground">/{progress?.totalTasks || 0} tasks</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText className="size-4 text-purple-500" />
                                <span className="text-sm">
                                    <span className="font-semibold">{progress?.answeredForms || 0}</span>
                                    <span className="text-muted-foreground">/{progress?.totalForms || 0} forms</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Upload className="size-4 text-blue-500" />
                                <span className="text-sm">
                                    <span className="font-semibold">{progress?.uploadedFiles || 0}</span>
                                    <span className="text-muted-foreground">/{progress?.totalFiles || 0} files</span>
                                </span>
                            </div>
                            {daysUntilGoLive !== null && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="size-4 text-orange-500" />
                                    <span className="text-sm">
                                        <span className="font-semibold">{daysUntilGoLive}</span>
                                        <span className="text-muted-foreground"> days to launch</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CTA */}
                    {firstPage && (
                        <Link
                            href={`/space/${spaceId}/shared/${firstPage.slug}`}
                            className="flex items-center justify-between px-6 py-4 bg-primary/5 hover:bg-primary/10 transition-colors border-t group"
                        >
                            <span className="font-medium text-sm">Continue to {firstPage.title}</span>
                            <ArrowRight className="size-4 text-primary group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                </Card>
            ) : (
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
                    <div className="p-8 text-center">
                        <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="size-8 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-emerald-900 mb-2">All done! 🎉</h1>
                        <p className="text-emerald-700/70">
                            You have completed all tasks. Great job!
                        </p>
                    </div>
                </Card>
            )}

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Upcoming Tasks */}
                {upcomingTasks && upcomingTasks.length > 0 && (
                    <Card className="bg-white/95 backdrop-blur-sm p-5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="size-4 text-primary" />
                            Upcoming tasks
                        </h3>
                        <div className="space-y-2">
                            {upcomingTasks.slice(0, 5).map((task: any) => {
                                const taskDueDate = task.due_date ? new Date(task.due_date) : null
                                const daysUntil = taskDueDate 
                                    ? Math.ceil((taskDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    : null
                                const isUrgent = daysUntil !== null && daysUntil <= 3

                                return (
                                    <div 
                                        key={task.id} 
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-muted"
                                    >
                                        <div className="size-5 rounded border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-snug">{task.title}</p>
                                            {taskDueDate && (
                                                <p className={`text-xs mt-1 ${isUrgent ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                                    {isUrgent && '⚡ '}
                                                    Due {taskDueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                    {daysUntil !== null && ` (${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`})`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )}

                {/* Recent Activity */}
                {activities && activities.length > 0 && (
                    <Card className="bg-white/95 backdrop-blur-sm p-5">
                        <h3 className="text-sm font-semibold mb-4">Recent activity</h3>
                        <div className="space-y-3">
                            {activities.slice(0, 5).map((activity: any) => (
                                <div key={activity.id} className="flex items-start gap-3 text-sm">
                                    <div className="size-2 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-muted-foreground">
                                            {activity.metadata?.taskTitle || activity.metadata?.title || activity.action}
                                        </p>
                                        <p className="text-xs text-muted-foreground/70">
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Page Navigation */}
            <PortalPageNavigation
                pages={pages}
                spaceId={spaceId}
                currentSlug={undefined}
            />
        </div>
    )
}
