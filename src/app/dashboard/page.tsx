import { StatCard } from '@/components/dashboard/stat-card'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from './progress-actions'
import { FolderKanban, AlertTriangle, Calendar, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
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

    const stats = await getDashboardStats(membership.organization_id)

    return (
        <div className="space-y-4">
            <div className="border-b pb-3">
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Översikt över alla dina projekt</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Aktiva projekt"
                    value={stats.activeProjects}
                    description="Pågående implementeringar"
                    icon={FolderKanban}
                    variant="default"
                />
                <StatCard
                    title="Försenade uppgifter"
                    value={stats.overdueTasks}
                    description="Kräver uppmärksamhet"
                    icon={AlertTriangle}
                    variant={stats.overdueTasks > 0 ? 'danger' : 'success'}
                />
                <StatCard
                    title={stats.avgDaysToGoLive > 0 ? `${stats.avgDaysToGoLive} dagar` : "Ej satt"}
                    value={stats.avgDaysToGoLive > 0 ? "Snitt" : "-"}
                    description="Genomsnittlig tid till lansering"
                    icon={Calendar}
                    variant={stats.avgDaysToGoLive > 0 && stats.avgDaysToGoLive < 14 ? 'warning' : 'default'}
                />
                <StatCard
                    title="Projekt i riskzon"
                    value={stats.projectsAtRisk}
                    description=">50% uppgifter försenade"
                    icon={TrendingUp}
                    variant={stats.projectsAtRisk > 0 ? 'warning' : 'success'}
                />
            </div>

            {/* Top Projects */}
            {stats.topProjects.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                        <h3 className="text-sm font-semibold">Projekt som behöver uppmärksamhet</h3>
                        <Link href="/dashboard/projects">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 px-2">
                                Se alla projekt
                                <ArrowRight className="size-3.5" />
                            </Button>
                        </Link>
                    </div>
                    <div className="space-y-1">
                        {stats.topProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/dashboard/projects/${project.id}`}
                                className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{project.name}</p>
                                    <p className="text-xs text-muted-foreground">{project.clientName}</p>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                        <span className="font-medium text-primary">{project.progress}%</span>
                                        {project.overdueTasks > 0 && (
                                            <span className="text-red-600 font-medium">
                                                {project.overdueTasks} försenade
                                            </span>
                                        )}
                                        {project.daysToGoLive !== null && project.daysToGoLive > 0 && (
                                            <span>
                                                {project.daysToGoLive}d kvar
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {project.needsAttention && (
                                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-100 text-yellow-700 font-medium">
                                            Uppmärksamhet
                                        </span>
                                    )}
                                    <ArrowRight className="size-3.5 text-muted-foreground" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {stats.activeProjects === 0 && (
                <div className="border border-dashed rounded py-8 text-center">
                    <FolderKanban className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <h3 className="text-sm font-semibold mb-1">Inga aktiva projekt</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                        Kom igång genom att skapa ditt första projekt
                    </p>
                    <Link href="/dashboard/projects">
                        <Button size="sm">Skapa projekt</Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
