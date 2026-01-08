'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import {
  CheckCircle2,
  Upload,
  FileText,
  ListChecks,
  AlertCircle,
  Activity,
  Clock,
  FileUp,
  Search,
  Filter,
  Users,
  User,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getActivities, type ActivityItem, type ActivityFilter } from './actions'
import Link from 'next/link'

interface ActivityPageClientProps {
  initialActivities: ActivityItem[]
  stats: {
    totalActivities: number
    todayActivities: number
    taskCompletions: number
    fileUploads: number
  }
}

const ACTION_TYPES = [
  { value: 'all', label: 'All Activity' },
  { value: 'task', label: 'Tasks' },
  { value: 'file', label: 'Files' },
  { value: 'form', label: 'Forms' },
  { value: 'checklist', label: 'Checklists' },
  { value: 'space', label: 'Spaces' },
] as const

function getActivityIcon(action: string) {
  if (action.includes('completed') || action.includes('task')) return CheckCircle2
  if (action.includes('uploaded') || action.includes('file')) return Upload
  if (action.includes('form') || action.includes('answered')) return FileText
  if (action.includes('checklist')) return ListChecks
  if (action.includes('space')) return Activity
  return AlertCircle
}

function getActivityColor(action: string) {
  if (action.includes('completed')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
  if (action.includes('uncompleted') || action.includes('deleted')) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'
  if (action.includes('uploaded') || action.includes('file')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/50'
  if (action.includes('form') || action.includes('answered')) return 'text-purple-600 bg-purple-50 dark:bg-purple-950/50'
  if (action.includes('checklist')) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50'
  if (action.includes('space')) return 'text-primary bg-primary/10'
  return 'text-gray-600 bg-gray-50 dark:bg-gray-950/50'
}

function getActivityText(action: string, actorName: string): string {
  switch (action) {
    case 'task.completed':
      return `${actorName} completed a task`
    case 'task.uncompleted':
      return `${actorName} reopened a task`
    case 'task.created':
      return `${actorName} created a task`
    case 'file.uploaded':
      return `${actorName} uploaded a file`
    case 'file.deleted':
      return `${actorName} deleted a file`
    case 'form.answered':
      return `${actorName} submitted a form response`
    case 'checklist.updated':
      return `${actorName} updated a checklist`
    case 'checklist.completed':
      return `${actorName} completed a checklist item`
    case 'space.created':
      return `${actorName} created a space`
    case 'space.updated':
      return `${actorName} updated space settings`
    case 'space.status_changed':
      return `${actorName} changed space status`
    default:
      return `${actorName} ${action.replace('.', ' ')}`
  }
}

function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d, yyyy \'at\' h:mm a')
}

function groupActivitiesByDate(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {}
  
  activities.forEach(activity => {
    const date = new Date(activity.created_at)
    let key: string
    
    if (isToday(date)) {
      key = 'Today'
    } else if (isYesterday(date)) {
      key = 'Yesterday'
    } else {
      key = format(date, 'MMMM d, yyyy')
    }
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(activity)
  })
  
  return groups
}

export function ActivityPageClient({ initialActivities, stats }: ActivityPageClientProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [scope, setScope] = useState<'assigned' | 'organization'>('assigned')
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleScopeChange = (showAll: boolean) => {
    const newScope = showAll ? 'organization' : 'assigned'
    setScope(newScope)
    
    startTransition(async () => {
      const newActivities = await getActivities(newScope, filter)
      setActivities(newActivities)
    })
  }

  const handleFilterChange = (newFilter: ActivityFilter) => {
    setFilter(newFilter)
    
    startTransition(async () => {
      const newActivities = await getActivities(scope, newFilter)
      setActivities(newActivities)
    })
  }

  // Filter activities by search query
  const filteredActivities = activities.filter(activity => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      activity.actor_email.toLowerCase().includes(query) ||
      activity.space_name.toLowerCase().includes(query) ||
      activity.client_name.toLowerCase().includes(query) ||
      activity.action.toLowerCase().includes(query)
    )
  })

  const groupedActivities = groupActivitiesByDate(filteredActivities)
  const dateKeys = Object.keys(groupedActivities)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track all space activities and updates.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Activities"
          value={stats.totalActivities}
          description="All time"
          icon={Activity}
          variant="default"
        />
        <StatCard
          title="Today's Activity"
          value={stats.todayActivities}
          description="Actions today"
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="Tasks Completed"
          value={stats.taskCompletions}
          description="All time"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Files Uploaded"
          value={stats.fileUploads}
          description="All time"
          icon={FileUp}
          variant="default"
        />
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Scope Toggle */}
          <div className="flex items-center gap-3 p-1 px-3 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <Label htmlFor="scope-switch" className="text-sm font-medium cursor-pointer">
                My Spaces
              </Label>
            </div>
            <Switch
              id="scope-switch"
              checked={scope === 'organization'}
              onCheckedChange={handleScopeChange}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="scope-switch" className="text-sm font-medium cursor-pointer">
                All Spaces
              </Label>
              <Users className="size-4 text-muted-foreground" />
            </div>
          </div>

          {/* Activity Type Filter */}
          <Select value={filter} onValueChange={(v) => handleFilterChange(v as ActivityFilter)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="size-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:w-[280px]"
          />
        </div>
      </div>

      {/* Activity Feed */}
      <Card className="overflow-hidden">
        {isPending ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="size-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No activities found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {searchQuery 
                ? 'Try adjusting your search terms or filters.'
                : scope === 'assigned'
                  ? 'No activities yet for your assigned spaces. Activities will appear here as team members interact with spaces.'
                  : 'No activities yet in your organization.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div className="px-6 py-3 bg-muted/30 border-b">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {dateKey}
                  </h3>
                </div>
                
                {/* Activities for this date */}
                <div className="divide-y">
                  {groupedActivities[dateKey].map((activity) => {
                    const Icon = getActivityIcon(activity.action)
                    const colorClass = getActivityColor(activity.action)
                    const actorName = activity.actor_email.split('@')[0]
                    const actorInitials = actorName.substring(0, 2).toUpperCase()

                    return (
                      <div 
                        key={activity.id} 
                        className="px-6 py-4 hover:bg-muted/20 transition-colors group"
                      >
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div className={cn('rounded-full p-2.5 shrink-0', colorClass)}>
                            <Icon className="size-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">
                                  {getActivityText(activity.action, actorName)}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link 
                                    href={`/spaces/${activity.space_id}`}
                                    className="text-xs text-primary hover:underline font-medium"
                                  >
                                    {activity.client_name} — {activity.space_name}
                                  </Link>
                                  {activity.metadata?.task_title && (
                                    <span className="text-xs text-muted-foreground">
                                      • {activity.metadata.task_title}
                                    </span>
                                  )}
                                  {activity.metadata?.file_name && (
                                    <span className="text-xs text-muted-foreground">
                                      • {activity.metadata.file_name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground hidden sm:block">
                                  {format(new Date(activity.created_at), 'h:mm a')}
                                </span>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {actorInitials}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

