import { CheckCircle2, Circle, ChevronRight, CheckSquare, MessageSquare, Upload, ListChecks } from 'lucide-react'
import { format, isBefore, isAfter, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ActionItem, TaskItem, QuestionItem, FileUploadItem, ChecklistItem } from '@/app/dashboard/projects/[projectId]/action-items-actions'

type ActionType = 'task' | 'question' | 'fileUpload' | 'checklist'

interface ActionItemRowProps {
  item: ActionItem
  onClick: (type: ActionType, item: ActionItem) => void
}

function getItemType(item: ActionItem): ActionType {
  if ('status' in item) return 'task'
  if ('question' in item) return 'question'
  if ('label' in item && 'files' in item) return 'fileUpload'
  if ('checkedCount' in item) return 'checklist'
  return 'task' // fallback
}

function getItemTypeIcon(type: ActionType) {
  switch (type) {
    case 'task': return <CheckSquare className="h-3.5 w-3.5" />
    case 'question': return <MessageSquare className="h-3.5 w-3.5" />
    case 'fileUpload': return <Upload className="h-3.5 w-3.5" />
    case 'checklist': return <ListChecks className="h-3.5 w-3.5" />
  }
}

function getItemTitle(item: ActionItem): string {
  if ('title' in item && item.title) return item.title
  if ('question' in item) return item.question
  if ('label' in item) return item.label
  return 'Untitled'
}

function getItemStatusText(item: ActionItem): string {
  const type = getItemType(item)

  switch (type) {
    case 'task': {
      const task = item as TaskItem
      if (task.status === 'completed') return 'Completed'
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate)
        if (isBefore(dueDate, new Date())) return 'Overdue'
        if (isBefore(dueDate, addDays(new Date(), 3))) return `Due ${format(dueDate, 'MMM d')}`
        return `Due ${format(dueDate, 'MMM d')}`
      }
      return 'Pending'
    }

    case 'question': {
      const question = item as QuestionItem
      if (!question.response) return 'Waiting...'

      const value = question.response.value

      switch (question.type) {
        case 'text':
        case 'textarea': {
          const text = value.text || value || ''
          return text.length > 25 ? text.substring(0, 25) + '...' : text
        }
        case 'select':
          const selectResult = value.selected || value || 'Selected'
          return selectResult
        case 'multiselect': {
          // Handle different data structures for multiselect
          let selected: string[] = []

          if (Array.isArray(value)) {
            selected = value
          } else if (Array.isArray(value?.selected)) {
            selected = value.selected
          } else if (typeof value === 'string') {
            // Try parsing as JSON first
            try {
              const parsed = JSON.parse(value)
              if (Array.isArray(parsed)) {
                selected = parsed
              } else {
                selected = [value]
              }
            } catch {
              // Not JSON, treat as single value
              selected = [value]
            }
          } else if (value?.selected !== undefined && value?.selected !== null) {
            // value.selected exists but isn't an array
            if (typeof value.selected === 'string') {
              selected = [value.selected]
            } else {
              selected = [String(value.selected)]
            }
          } else if (value && typeof value === 'object') {
            // Fallback: stringify the object
            selected = [JSON.stringify(value)]
          }

          if (selected.length === 0) return 'None selected'
          if (selected.length === 1) return selected[0]
          return `${selected[0]}, +${selected.length - 1}`
        }
        case 'date':
          return value.date ? format(new Date(value.date), 'MMM d, yyyy') : 'Date selected'
        default:
          return 'Answered'
      }
    }

    case 'fileUpload': {
      const fileUpload = item as FileUploadItem
      if (fileUpload.files.length > 0) {
        return `${fileUpload.files.length} file${fileUpload.files.length > 1 ? 's' : ''}`
      }
      return 'No files'
    }

    case 'checklist': {
      const checklist = item as ChecklistItem
      return `${checklist.checkedCount}/${checklist.totalCount}`
    }
  }
}

export function ActionItemRow({ item, onClick }: ActionItemRowProps) {
  const type = getItemType(item)
  const icon = getItemTypeIcon(type)
  const title = getItemTitle(item)
  const statusText = getItemStatusText(item)
  const isDone = item.isDone

  // Determine status color
  let statusColor = 'text-muted-foreground'
  if (isDone) {
    statusColor = 'text-green-600'
  } else if (type === 'task') {
    const task = item as TaskItem
    if (task.dueDate && isBefore(new Date(task.dueDate), new Date())) {
      statusColor = 'text-red-600'
    } else if (task.dueDate && isBefore(new Date(task.dueDate), addDays(new Date(), 3))) {
      statusColor = 'text-orange-600'
    }
  } else {
    statusColor = 'text-orange-600'
  }

  return (
    <div
      onClick={() => onClick(type, item)}
      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-muted-foreground flex-shrink-0">{icon}</div>
          <span className={cn(
            "text-sm truncate",
            isDone && "text-muted-foreground"
          )}>
            {title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className={cn("text-sm whitespace-nowrap", statusColor)}>
          {statusText}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </div>
    </div>
  )
}
