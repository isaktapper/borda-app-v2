import { getProjectActivity } from '@/app/dashboard/progress-actions'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Upload, FileText, ListChecks, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface ActivityTabContentProps {
  projectId: string
}

interface ActivityItem {
  id: string
  actor_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: any
  created_at: string
}

export async function ActivityTabContent({ projectId }: ActivityTabContentProps) {
  // Fetch more activities for the activity tab (50 instead of 10)
  const activities = await getProjectActivity(projectId, 50)

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
      <Card className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="size-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen aktivitet än</h3>
          <p className="text-sm text-muted-foreground">
            Aktivitet från kunden kommer visas här när de interagerar med portalen.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Aktivitetslogg</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Senaste aktiviteten från kunden i portalen
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {activities.length} {activities.length === 1 ? 'aktivitet' : 'aktiviteter'}
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
                    addSuffix: true,
                    locale: sv
                  })}
                </p>
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    {activity.metadata.title && (
                      <span className="font-medium">{activity.metadata.title}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
