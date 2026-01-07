'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Filter, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getProjectActivity } from '@/app/(app)/projects/progress-actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    getActivityIcon,
    getActivityLabel,
    getActorName,
    type ActivityItem
} from '@/lib/activity-utils'

interface ProgressData {
    progressPercentage: number
    completedTasks: number
    totalTasks: number
    answeredForms: number
    totalForms: number
    uploadedFiles: number
    totalFiles: number
}

interface ActivitySidebarProps {
    projectId: string
    progress: ProgressData | null
}

const ACTIVITY_FILTERS = [
    { id: 'visits', label: 'Visits', action: 'portal' },
    { id: 'pages', label: 'Page Views', action: 'page' },
    { id: 'file_uploads', label: 'File Uploads', action: 'file.uploaded' },
    { id: 'file_downloads', label: 'File Downloads', action: 'file.downloaded' },
    { id: 'form_answers', label: 'Form Answers', action: 'form' },
    { id: 'tasks', label: 'Tasks', action: 'task' },
]

export function ActivitySidebar({ projectId, progress }: ActivitySidebarProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    // All filters are active by default - unchecking removes that type
    const [activeFilters, setActiveFilters] = useState<string[]>(
        ACTIVITY_FILTERS.map(f => f.id)
    )

    useEffect(() => {
        const fetchActivities = async () => {
            setIsLoading(true)
            const data = await getProjectActivity(projectId, 100)
            setActivities(data)
            setIsLoading(false)
        }
        fetchActivities()
    }, [projectId])

    // Calculate stats
    const stats = useMemo(() => {
        const uniqueUsers = new Set(activities.map(a => a.actor_email)).size
        const totalVisits = activities.filter(a => 
            a.action === 'portal.visit' || a.action === 'portal.first_visit'
        ).length

        return {
            uniqueUsers,
            totalVisits,
            totalUploads: progress?.uploadedFiles || 0,
            totalFormAnswers: progress?.answeredForms || 0
        }
    }, [activities, progress])

    // Filter activities - show only activities that match ACTIVE filters
    // All filters checked = show all, unchecking a filter hides those activities
    const filteredActivities = useMemo(() => {
        // If all filters are active, show everything
        if (activeFilters.length === ACTIVITY_FILTERS.length) return activities
        
        // If no filters are active, show nothing
        if (activeFilters.length === 0) return []

        return activities.filter(activity => {
            return activeFilters.some(filterId => {
                const filter = ACTIVITY_FILTERS.find(f => f.id === filterId)
                return filter && activity.action.startsWith(filter.action)
            })
        })
    }, [activities, activeFilters])

    // Group by user
    const activitiesByUser = useMemo(() => {
        const grouped = new Map<string, ActivityItem[]>()

        filteredActivities.forEach(activity => {
            const existing = grouped.get(activity.actor_email) || []
            grouped.set(activity.actor_email, [...existing, activity])
        })

        // Convert to array and sort by most recent activity
        return Array.from(grouped.entries())
            .map(([email, items]) => ({
                email,
                activities: items.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            }))
            .sort((a, b) =>
                new Date(b.activities[0].created_at).getTime() -
                new Date(a.activities[0].created_at).getTime()
            )
    }, [filteredActivities])

    const toggleFilter = (filterId: string) => {
        setActiveFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(id => id !== filterId)
                : [...prev, filterId]
        )
    }

    if (isLoading) {
        return (
            <div className="w-72 border-r bg-background flex flex-col h-full overflow-hidden shrink-0">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    return (
        <div className="w-72 border-r bg-background flex flex-col h-full overflow-hidden shrink-0">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-sm text-muted-foreground">Activity</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                    {/* Stats - Single row */}
                    <div className="flex gap-3 text-center">
                        <div className="flex-1">
                            <div className="text-lg font-bold">{stats.totalVisits}</div>
                            <div className="text-[10px] text-muted-foreground">Visits</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-lg font-bold">{stats.uniqueUsers}</div>
                            <div className="text-[10px] text-muted-foreground">Users</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-lg font-bold">{stats.totalUploads}</div>
                            <div className="text-[10px] text-muted-foreground">Uploads</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-lg font-bold">{stats.totalFormAnswers}</div>
                            <div className="text-[10px] text-muted-foreground">Forms</div>
                        </div>
                    </div>

                    {/* Filters - Expandable */}
                    <FilterSection 
                        activeFilters={activeFilters}
                        toggleFilter={toggleFilter}
                    />

                    {/* Activity by User */}
                    <div className="space-y-3 pt-2">
                        <div className="text-xs font-medium text-muted-foreground">
                            Activity by User
                        </div>

                        {activitiesByUser.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                No activity yet
                            </div>
                        ) : (
                            activitiesByUser.map(({ email, activities: userActivities }) => (
                                <UserActivityCard
                                    key={email}
                                    email={email}
                                    activities={userActivities}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface FilterSectionProps {
    activeFilters: string[]
    toggleFilter: (filterId: string) => void
}

function FilterSection({ activeFilters, toggleFilter }: FilterSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const activeCount = activeFilters.length
    const totalCount = ACTIVITY_FILTERS.length

    return (
        <div className="border rounded-lg">
            <button
                className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Filter className="size-3" />
                    <span>Filters</span>
                    {activeCount < totalCount && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {activeCount}/{totalCount}
                        </span>
                    )}
                </div>
                <ChevronDown className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
                <div className="p-2.5 pt-0 space-y-2">
                    {ACTIVITY_FILTERS.map((filter) => (
                        <div key={filter.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={filter.id}
                                checked={activeFilters.includes(filter.id)}
                                onCheckedChange={() => toggleFilter(filter.id)}
                            />
                            <Label
                                htmlFor={filter.id}
                                className="text-xs font-normal cursor-pointer"
                            >
                                {filter.label}
                            </Label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

interface UserActivityCardProps {
    email: string
    activities: ActivityItem[]
}

function UserActivityCard({ email, activities }: UserActivityCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const displayName = getActorName(email)
    const initials = displayName.slice(0, 2).toUpperCase()
    const latestActivity = activities[0]
    
    const INITIAL_SHOW = 5
    const visibleActivities = showAll ? activities : activities.slice(0, INITIAL_SHOW)
    const hasMore = activities.length > INITIAL_SHOW

    return (
        <Card
            className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-start gap-3">
                <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-medium text-sm truncate">{displayName}</div>
                    <div className="text-xs text-muted-foreground">
                        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                    </div>
                    {!isExpanded && (
                        <div className="text-xs text-muted-foreground truncate">
                            {getActivityLabel(latestActivity.action)} •{' '}
                            {formatDistanceToNow(new Date(latestActivity.created_at), {
                                addSuffix: true
                            })}
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-2 pl-11">
                    {visibleActivities.map((activity) => {
                        const Icon = getActivityIcon(activity.action)
                        return (
                            <div
                                key={activity.id}
                                className="flex items-start gap-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Icon className="size-3 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="truncate">{getActivityLabel(activity.action)}</div>
                                    <div className="text-muted-foreground">
                                        {formatDistanceToNow(new Date(activity.created_at), {
                                            addSuffix: true
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {hasMore && (
                        <button
                            className="text-xs text-primary hover:underline pt-1"
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowAll(!showAll)
                            }}
                        >
                            {showAll ? 'Show less' : `+ ${activities.length - INITIAL_SHOW} more`}
                        </button>
                    )}
                </div>
            )}
        </Card>
    )
}
