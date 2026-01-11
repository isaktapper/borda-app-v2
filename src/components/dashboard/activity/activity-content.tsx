'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getSpaceActivity } from '@/app/(app)/spaces/progress-actions'
import {
    getActivityText,
    getActivityIcon,
    getActivityColor,
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

interface ActivityContentProps {
    spaceId: string
    progress: ProgressData | null
}

export function ActivityContent({ spaceId, progress }: ActivityContentProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchActivities = async () => {
            setIsLoading(true)
            const data = await getSpaceActivity(spaceId, 50)
            setActivities(data)
            setIsLoading(false)
        }
        fetchActivities()
    }, [spaceId])

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Progress Summary (merged from Overview) */}
            <ProgressSummary progress={progress} />

            {/* Activity Feed */}
            <ActivityFeed activities={activities} isLoading={isLoading} />
        </div>
    )
}

function ProgressSummary({ progress }: { progress: ProgressData | null }) {
    if (!progress) {
        return null
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Space Progress</h3>
                <span className="text-3xl font-bold text-primary">
                    {progress.progressPercentage}%
                </span>
            </div>

            <Progress value={progress.progressPercentage} className="h-2 mb-6" />

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                    <p className="text-2xl font-bold">
                        {progress.completedTasks}/{progress.totalTasks}
                    </p>
                    <p className="text-xs text-muted-foreground">Tasks completed</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold">
                        {progress.answeredForms}/{progress.totalForms}
                    </p>
                    <p className="text-xs text-muted-foreground">Form responses</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold">
                        {progress.uploadedFiles}/{progress.totalFiles}
                    </p>
                    <p className="text-xs text-muted-foreground">Files uploaded</p>
                </div>
            </div>
        </Card>
    )
}

function ActivityFeed({ activities, isLoading }: { activities: ActivityItem[]; isLoading: boolean }) {
    if (isLoading) {
        return (
            <Card className="p-8">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">Loading activity...</p>
                </div>
            </Card>
        )
    }

    if (activities.length === 0) {
        return (
            <Card className="p-8">
                <div className="text-center py-12">
                    <AlertCircle className="size-12 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Stakeholder activity will be shown here when they interact with the portal.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold">Activity Log</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Latest stakeholder activity in the portal
                    </p>
                </div>
                <div className="text-sm text-muted-foreground">
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </div>
            </div>

            <div className="space-y-4">
                {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.action)
                    const colorClass = getActivityColor(activity.action)

                    return (
                        <div
                            key={activity.id}
                            className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                            <div className={`rounded-full p-2.5 ${colorClass} shrink-0 h-fit`}>
                                <Icon className="size-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {getActivityText(activity)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.created_at), {
                                        addSuffix: true
                                    })}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
