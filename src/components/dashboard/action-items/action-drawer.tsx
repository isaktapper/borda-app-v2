'use client'

import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@heroui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { CheckSquare, MessageSquare, Upload, ListChecks, Download, Square } from 'lucide-react'
import { format } from 'date-fns'
import type { ActionItem, TaskItem, QuestionItem, FileUploadItem, ChecklistItem } from '@/app/(app)/projects/[projectId]/action-items-actions'

type ActionType = 'task' | 'question' | 'fileUpload' | 'checklist'

interface ActionDrawerProps {
  isOpen: boolean
  onClose: () => void
  type: ActionType | null
  item: ActionItem | null
  projectId: string
}

export function ActionDrawer({ isOpen, onClose, type, item, projectId }: ActionDrawerProps) {
  if (!type || !item) return null

  const getTypeInfo = () => {
    switch (type) {
      case 'task':
        return {
          icon: <CheckSquare className="h-5 w-5" />,
          label: 'Task',
          color: 'text-blue-600'
        }
      case 'question':
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          label: 'Question',
          color: 'text-purple-600'
        }
      case 'fileUpload':
        return {
          icon: <Upload className="h-5 w-5" />,
          label: 'File Upload',
          color: 'text-orange-600'
        }
      case 'checklist':
        return {
          icon: <ListChecks className="h-5 w-5" />,
          label: 'Checklist',
          color: 'text-green-600'
        }
    }
  }

  const typeInfo = getTypeInfo()

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      placement="right"
      backdrop="blur"
      classNames={{
        base: "ml-auto",
        backdrop: "bg-black/50 backdrop-blur-sm",
        closeButton: "top-6 right-6 z-50",
      }}
    >
      <DrawerContent className="bg-white">
        {() => (
          <>
            <DrawerHeader className="bg-white flex justify-between items-center pr-14 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={typeInfo.color}>{typeInfo.icon}</div>
                <span className="text-lg font-semibold">
                  {typeInfo.label}
                </span>
              </div>
            </DrawerHeader>
            <DrawerBody className="p-6 bg-white">
              {type === 'task' && <UniversalTaskContent task={item as TaskItem} />}
              {type === 'question' && <UniversalQuestionContent question={item as QuestionItem} />}
              {type === 'fileUpload' && <UniversalFileUploadContent fileUpload={item as FileUploadItem} />}
              {type === 'checklist' && <UniversalChecklistContent checklist={item as ChecklistItem} />}
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

// Universal Task Content
function UniversalTaskContent({ task }: { task: TaskItem }) {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-semibold leading-tight">{task.title}</h2>
        {task.description && (
          <p className="text-muted-foreground mt-3 leading-relaxed">{task.description}</p>
        )}
      </div>

      <Separator />

      {/* Status/Answer */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Status</Label>
        <div>
          <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'default' : 'secondary'} className="text-sm">
            {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
          </Badge>
          {task.dueDate && (
            <p className="text-sm text-muted-foreground mt-2">
              Due: {format(new Date(task.dueDate), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Who & When */}
      {task.status === 'completed' && task.completedAt && (
        <>
          <Separator />
          <div className="space-y-4">
            {task.completedBy && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Completed by</Label>
                <p className="text-base">{task.completedBy.name || task.completedBy.email}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Completed at</Label>
              <p className="text-base">{format(new Date(task.completedAt), 'MMM d, yyyy \'at\' h:mm a')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Universal Question Content
function UniversalQuestionContent({ question }: { question: QuestionItem }) {
  return (
    <div className="space-y-8">
      {/* Question */}
      <div>
        <h2 className="text-2xl font-semibold leading-tight">{question.question}</h2>
        {question.required && (
          <span className="text-xs text-red-600 mt-2 block">* Required</span>
        )}
      </div>

      <Separator />

      {/* Answer */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Answer</Label>
        {question.response ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <AnswerDisplay type={question.type} value={question.response.value} />
          </div>
        ) : (
          <p className="text-muted-foreground italic">Waiting for answer...</p>
        )}
      </div>

      {/* Who & When */}
      {question.response && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Answered by</Label>
              <p className="text-base">{question.response.answeredBy.name || question.response.answeredBy.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Answered at</Label>
              <p className="text-base">{format(new Date(question.response.answeredAt), 'MMM d, yyyy \'at\' h:mm a')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AnswerDisplay({ type, value }: { type: string; value: any }) {
  switch (type) {
    case 'text':
    case 'textarea':
      return <p className="whitespace-pre-wrap text-base">{value.text || value}</p>
    case 'select':
      return <p className="text-base">{value.selected || value}</p>
    case 'multiselect': {
      // Handle different data structures for multiselect
      let options: string[] = []
      if (Array.isArray(value)) {
        options = value
      } else if (Array.isArray(value?.selected)) {
        options = value.selected
      } else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          options = Array.isArray(parsed) ? parsed : [value]
        } catch {
          options = [value]
        }
      } else if (value?.selected) {
        options = [value.selected]
      } else if (value) {
        options = [String(value)]
      }

      if (options.length === 0) {
        return <p className="text-muted-foreground italic">No selection</p>
      }

      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt: string, i: number) => (
            <Badge key={i} variant="secondary">{opt}</Badge>
          ))}
        </div>
      )
    }
    case 'date':
      return <p className="text-base">{value.date ? format(new Date(value.date), 'MMMM d, yyyy') : 'No date'}</p>
    default:
      return <p className="text-base">{JSON.stringify(value)}</p>
  }
}

// Universal File Upload Content
function UniversalFileUploadContent({ fileUpload }: { fileUpload: FileUploadItem }) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-semibold leading-tight">{fileUpload.label}</h2>
        {fileUpload.description && (
          <p className="text-muted-foreground mt-3 leading-relaxed">{fileUpload.description}</p>
        )}
      </div>

      <Separator />

      {/* Files */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">
          Uploaded files ({fileUpload.files.length}/{fileUpload.maxFiles})
        </Label>

        {fileUpload.files.length > 0 ? (
          <div className="space-y-3">
            {fileUpload.files.map(file => (
              <div key={file.id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(file.size)}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border">
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Uploaded by</Label>
                        <p className="text-sm mt-1">{file.uploadedBy.name || file.uploadedBy.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Uploaded at</Label>
                        <p className="text-sm mt-1">{format(new Date(file.uploadedAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                    <a href={file.downloadUrl} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No files uploaded yet</p>
        )}
      </div>
    </div>
  )
}

// Universal Checklist Content
function UniversalChecklistContent({ checklist }: { checklist: ChecklistItem }) {
  const progress = checklist.totalCount > 0
    ? (checklist.checkedCount / checklist.totalCount) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Title */}
      {checklist.title && (
        <h2 className="text-2xl font-semibold leading-tight">{checklist.title}</h2>
      )}

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Progress</Label>
          <span className="text-sm font-semibold">{checklist.checkedCount}/{checklist.totalCount}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Separator />

      {/* Items */}
      <div className="space-y-4">
        {checklist.items.map(item => {
          const isChecked = checklist.checkedItems.includes(item.id)
          return (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              {isChecked ? (
                <CheckSquare className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <span className={isChecked ? 'line-through text-muted-foreground' : 'text-base'}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Who & When */}
      {checklist.lastUpdatedAt && (
        <>
          <Separator />
          <div className="space-y-4">
            {checklist.lastUpdatedBy && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Updated by</Label>
                <p className="text-base">{checklist.lastUpdatedBy.name || checklist.lastUpdatedBy.email}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase font-medium tracking-wide">Updated at</Label>
              <p className="text-base">{format(new Date(checklist.lastUpdatedAt), 'MMM d, yyyy \'at\' h:mm a')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
