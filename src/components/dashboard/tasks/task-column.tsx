'use client'

import { Task } from '@/app/(app)/tasks/actions'
import { TaskItem } from './task-item'
import { cn } from '@/lib/utils'

interface TaskColumnProps {
  title: string
  count: number
  tasks: Task[]
  emptyIcon?: string
  emptyMessage?: string
  emptySubtext?: string
  variant?: 'danger' | 'info' | 'warning'
  onToggle: (taskId: string) => void
}

export function TaskColumn({
  title,
  count,
  tasks,
  emptyIcon,
  emptyMessage,
  emptySubtext,
  variant = 'info',
  onToggle
}: TaskColumnProps) {
  const variantStyles = {
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200'
  }

  return (
    <div className="space-y-4">
      {/* Column Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className={cn(
          'text-xs px-2.5 py-1 rounded-md font-medium',
          variant === 'danger' && 'bg-red-100 text-red-700',
          variant === 'info' && 'bg-blue-100 text-blue-700',
          variant === 'warning' && 'bg-orange-100 text-orange-700'
        )}>
          {count}
        </span>
      </div>

      {/* Task List or Empty State */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className={cn(
            'rounded-lg border-2 border-dashed p-8 text-center',
            variantStyles[variant]
          )}>
            {emptyIcon && <div className="text-4xl mb-2">{emptyIcon}</div>}
            {emptyMessage && (
              <p className="font-medium text-sm mb-1">{emptyMessage}</p>
            )}
            {emptySubtext && (
              <p className="text-xs text-muted-foreground">{emptySubtext}</p>
            )}
          </div>
        ) : (
          <>
            {tasks.slice(0, 6).map(task => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} />
            ))}
            {tasks.length > 6 && (
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                📊 View all ({tasks.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
