import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import {
  getActivityText,
  getActivityIcon,
  getActivityColor,
  type ActivityItem
} from '@/lib/activity-utils'

interface ActivityFeedProps {
  activities: ActivityItem[]
  title?: string
  emptyMessage?: string
}

export function ActivityFeed({
  activities,
  title = 'Recent activity',
  emptyMessage = 'No activity yet'
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          {emptyMessage}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.action)
          const colorClass = getActivityColor(activity.action)

          return (
            <div key={activity.id} className="flex gap-3">
              <div className={`rounded-full p-2 ${colorClass} shrink-0`}>
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
