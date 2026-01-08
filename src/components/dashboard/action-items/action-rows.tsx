import { format, isAfter, isBefore, addDays } from 'date-fns'
import { CheckCircle2, Circle, ChevronRight, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TaskItem, FormFieldItem, FileUploadItem } from '@/app/(app)/spaces/[spaceId]/action-items-actions'

interface RowProps {
  onClick: () => void
}

export function TaskRow({ task, onClick }: { task: TaskItem } & RowProps) {
  const isCompleted = task.status === 'completed'
  const isOverdue = task.dueDate && !isCompleted && isBefore(new Date(task.dueDate), new Date())
  const isDueSoon = task.dueDate && !isCompleted &&
    isAfter(new Date(task.dueDate), new Date()) &&
    isBefore(new Date(task.dueDate), addDays(new Date(), 3))

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm truncate",
            isCompleted && "text-muted-foreground line-through"
          )}>
            {task.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        {isCompleted ? (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {format(new Date(task.completedAt!), 'MMM d')}
          </span>
        ) : task.dueDate ? (
          <span className={cn(
            "text-sm whitespace-nowrap",
            isOverdue && "text-red-600 font-medium",
            isDueSoon && "text-orange-600 font-medium",
            !isOverdue && !isDueSoon && "text-muted-foreground"
          )}>
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            No due date
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  )
}

export function FormFieldRow({ formField, onClick }: { formField: FormFieldItem } & RowProps) {
  const hasAnswer = !!formField.response

  const getAnswerPreview = () => {
    if (!formField.response) return 'Waiting...'

    const value = formField.response.value

    switch (formField.type) {
      case 'text':
      case 'textarea':
        const text = value.text || value
        return text.length > 30 ? text.substring(0, 30) + '...' : text

      case 'select':
        return value.selected || value

      case 'multiselect': {
        // Handle different data structures for multiselect
        let selected: string[] = []
        if (Array.isArray(value.selected)) {
          selected = value.selected
        } else if (typeof value.selected === 'string') {
          selected = [value.selected]
        } else if (Array.isArray(value)) {
          selected = value
        }

        if (selected.length === 0) return 'None selected'
        if (selected.length === 1) return selected[0]
        if (selected.length === 2) return selected.join(', ')
        return `${selected[0]}, ${selected[1]}, +${selected.length - 2} more`
      }

      case 'date':
        return value.date ? format(new Date(value.date), 'MMM d, yyyy') : 'No date'

      default:
        return 'Answered'
    }
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {hasAnswer ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">
            {formField.question}
            {formField.required && <span className="text-red-600 ml-1">*</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <span className={cn(
          "text-sm whitespace-nowrap",
          hasAnswer ? "text-muted-foreground" : "text-orange-600"
        )}>
          {getAnswerPreview()}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  )
}

export function FileUploadRow({ fileUpload, onClick }: { fileUpload: FileUploadItem } & RowProps) {
  const hasFiles = fileUpload.files.length > 0

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {hasFiles ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{fileUpload.label}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <span className={cn(
          "text-sm whitespace-nowrap",
          hasFiles ? "text-muted-foreground" : "text-orange-600"
        )}>
          {hasFiles ? `${fileUpload.files.length} file${fileUpload.files.length !== 1 ? 's' : ''}` : 'No files'}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  )
}
