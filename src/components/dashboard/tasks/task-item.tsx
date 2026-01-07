'use client'

import { Task, toggleTaskStatus } from '@/app/(app)/tasks/actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface TaskItemProps {
  task: Task
}

export function TaskItem({ task }: TaskItemProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setIsChecking(true)
    await toggleTaskStatus(task.id)
    router.refresh()
    setIsChecking(false)
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Checkbox */}
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={handleToggle}
        disabled={isChecking}
        className="mt-1"
      />

      {/* Client Logo */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        {task.project?.client_logo_url && (
          <AvatarImage src={task.project.client_logo_url} className="object-contain" />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {task.project?.client_name?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">
              {task.project?.client_name || 'Unknown Customer'}
            </p>
            <h4 className="font-medium text-sm mb-0.5">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>{format(new Date(task.due_date), 'd MMM yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
