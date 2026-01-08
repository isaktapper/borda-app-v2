'use client'

import { useRef } from 'react'
import { CreateSpaceModal } from "@/components/dashboard/create-space-modal"
import { SpacesTable } from "@/components/dashboard/spaces-table"
import { StatCard } from '@/components/dashboard/stat-card'
import { FolderKanban, TrendingDown, Activity, Rocket } from 'lucide-react'
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
}

function getEngagementLabel(score: number): string {
    if (score >= 75) return 'High'
    if (score >= 40) return 'Medium'
    return 'Low'
}

export function SpacesPageClient({ spaces, stats }: SpacesPageClientProps) {
    const tableRef = useRef<{
        setEngagementFilter: (levels: string[]) => void
        setGoLiveDateRange: (range: { from: Date; to: Date } | null) => void
    }>(null)

    // Compute on client to avoid hydration mismatch
    const currentMonth = typeof window !== 'undefined'
        ? format(new Date(), 'MMMM', { locale: sv })
        : ''

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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Spaces</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your implementations.</p>
                </div>
                <CreateSpaceModal />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Active Spaces"
                    value={stats.activeSpaces}
                    description="Ongoing implementations"
                    icon={FolderKanban}
                    variant="default"
                />

                <StatCard
                    title="Low Engagement"
                    value={stats.lowEngagement}
                    description="Needs attention"
                    icon={TrendingDown}
                    variant={stats.lowEngagement > 0 ? 'danger' : 'default'}
                    onClick={handleLowEngagementClick}
                />

                <StatCard
                    title="Average Engagement"
                    value={`${stats.avgEngagement}%`}
                    description={getEngagementLabel(stats.avgEngagement)}
                    icon={Activity}
                    variant="default"
                />

                <StatCard
                    title="Go-live This Month"
                    value={stats.goLiveThisMonth}
                    description={currentMonth}
                    icon={Rocket}
                    variant="default"
                    onClick={handleGoLiveThisMonthClick}
                />
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
