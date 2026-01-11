import { getSpaceActivity } from '@/app/(app)/spaces/progress-actions'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  getActivityText,
  getActivityIcon,
  getActivityColor
} from '@/lib/activity-utils'

interface ActivityTabContentProps {
  spaceId: string
}

export async function ActivityTabContent({ spaceId }: ActivityTabContentProps) {
  // Fetch more activities for the activity tab (50 instead of 10)
  const activities = await getSpaceActivity(spaceId, 50)

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
          <h3 className="text-lg font-semibold">Activity log</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Latest customer activity in the portal
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
          const metadata = activity.metadata || {}

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
