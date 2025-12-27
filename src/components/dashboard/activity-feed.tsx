import { Card } from '@/components/ui/card'
import { CheckCircle2, Upload, FileText, ListChecks, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface ActivityItem {
  id: string
  actor_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: any
  created_at: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  title?: string
  emptyMessage?: string
}

export function ActivityFeed({
  activities,
  title = 'Senaste aktivitet',
  emptyMessage = 'Ingen aktivitet än'
}: ActivityFeedProps) {
  const getActivityIcon = (action: string) => {
    if (action.includes('completed')) return CheckCircle2
    if (action.includes('uploaded')) return Upload
    if (action.includes('answered')) return FileText
    if (action.includes('checklist')) return ListChecks
    return AlertCircle
  }

  const getActivityColor = (action: string) => {
    if (action.includes('completed')) return 'text-emerald-600 bg-emerald-50'
    if (action.includes('uploaded')) return 'text-blue-600 bg-blue-50'
    if (action.includes('answered')) return 'text-purple-600 bg-purple-50'
    if (action.includes('checklist')) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getActivityText = (activity: ActivityItem) => {
    const actor = activity.actor_email.split('@')[0]

    switch (activity.action) {
      case 'task.completed':
        return `${actor} slutförde en uppgift`
      case 'task.uncompleted':
        return `${actor} återöppnade en uppgift`
      case 'file.uploaded':
        return `${actor} laddade upp en fil`
      case 'file.deleted':
        return `${actor} tog bort en fil`
      case 'question.answered':
        return `${actor} besvarade en fråga`
      case 'checklist.updated':
        return `${actor} uppdaterade en checklista`
      default:
        return `${actor} ${activity.action}`
    }
  }

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
                    addSuffix: true,
                    locale: sv
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
