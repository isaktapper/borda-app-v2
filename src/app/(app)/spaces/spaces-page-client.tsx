'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CreateSpaceModal } from "@/components/dashboard/create-space-modal"
import { SpacesTable } from "@/components/dashboard/spaces-table"
import { FolderKanban } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface SpacesPageClientProps {
    spaces: any[]
    stats: {
        activeSpaces: number
        lowEngagement: number
        avgEngagement: number
        goLiveThisMonth: number
    }
    userName?: string
}

function getEngagementLabel(score: number): string {
    if (score >= 75) return 'High'
    if (score >= 40) return 'Medium'
    return 'Low'
}

export function SpacesPageClient({ spaces, stats, userName = 'User' }: SpacesPageClientProps) {
    const router = useRouter()
    const tableRef = useRef<{
        setEngagementFilter: (levels: string[]) => void
        setGoLiveDateRange: (range: { from: Date; to: Date } | null) => void
        setStatusFilter: (statuses: string[]) => void
    }>(null)

    // Compute on client to avoid hydration mismatch
    const currentMonth = typeof window !== 'undefined'
        ? format(new Date(), 'MMMM', { locale: sv })
        : ''

    const greeting = (() => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 18) return 'Good Afternoon'
        return 'Good Evening'
    })()

    const firstName = userName.split(' ')[0]

    // Calculate total overdue tasks across all spaces
    const totalOverdueTasks = spaces.reduce((acc, space) => acc + (space.overdue_tasks_count || 0), 0)

    const handleLowEngagementClick = () => {
        // Toggle low engagement filter
        tableRef.current?.setEngagementFilter(['low', 'none'])
    }

    const handleGoLiveThisMonthClick = () => {
        // Set date range filter for this month
        const now = new Date()
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        tableRef.current?.setGoLiveDateRange({ from, to })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
                <h1 className="text-2xl tracking-tight text-foreground/90">
                    {greeting}, <span className="font-semibold text-foreground">{firstName}</span> 👋
                </h1>
                <CreateSpaceModal />
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x bg-card/50 rounded-xl overflow-hidden">
                <div
                    onClick={() => tableRef.current?.setStatusFilter(['active'])}
                    className="p-4 group cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Active Spaces</span>
                        <h3 className="text-2xl font-bold tracking-tight">{stats.activeSpaces}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                            Active
                        </span>
                    </div>
                </div>

                <div
                    onClick={handleLowEngagementClick}
                    className="p-4 group cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Low Engagement</span>
                        <h3 className="text-2xl font-bold tracking-tight">{stats.lowEngagement}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {stats.lowEngagement > 0 ? (
                            <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                Needs Attention
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                All Good
                            </span>
                        )}
                    </div>
                </div>

                <div
                    onClick={() => router.push('/tasks')}
                    className="p-4 group cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Overdue Tasks</span>
                        <h3 className="text-2xl font-bold tracking-tight">{totalOverdueTasks}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {totalOverdueTasks > 0 ? (
                            <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                Overdue
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                On Track
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Spaces Table */}
            {spaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed rounded py-8 text-center">
                    <FolderKanban className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <h3 className="text-sm font-semibold mb-1">No spaces yet</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                        You haven't created any spaces yet. Click the button above to get started.
                    </p>
                    <CreateSpaceModal />
                </div>
            ) : (
                <SpacesTable ref={tableRef} spaces={spaces} />
            )}
        </div>
    )
}
