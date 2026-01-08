'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  Upload, 
  Download, 
  Loader2,
  FileSpreadsheet,
  File,
  Image as ImageIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { getProjectActionItems, type ActionItemsData, type TaskItem, type FormFieldItem, type FileUploadItem } from '@/app/(app)/spaces/[spaceId]/action-items-actions'

interface ResponsesTabContentProps {
  spaceId: string
}

type FilterType = 'all' | 'tasks' | 'forms' | 'files'

export function ResponsesTabContent({ spaceId }: ResponsesTabContentProps) {
  const [data, setData] = useState<ActionItemsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const result = await getProjectActionItems(spaceId)
      setData(result)
      setIsLoading(false)
    }
    fetchData()
  }, [spaceId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Failed to load responses</p>
      </div>
    )
  }

  const { byPage, totals } = data
  const progressPercentage = totals.overall.total > 0 
    ? Math.round((totals.overall.done / totals.overall.total) * 100)
    : 0

  // Filter pages based on selected filter
  const filteredPages = byPage.map(page => {
    let filteredItems = page.items
    if (filter === 'tasks') {
      filteredItems = page.items.filter(item => 'status' in item && 'title' in item && !('question' in item))
    } else if (filter === 'forms') {
      filteredItems = page.items.filter(item => 'question' in item)
    } else if (filter === 'files') {
      filteredItems = page.items.filter(item => 'files' in item)
    }
    return { ...page, items: filteredItems }
  }).filter(page => page.items.length > 0)

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Responses</h2>
            <p className="text-muted-foreground mt-1">
              View all customer responses and uploaded files
            </p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Overall Progress</h3>
            <span className="text-2xl font-bold text-primary">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xl font-bold">{totals.tasks.done}/{totals.tasks.total}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{totals.formFields.done}/{totals.formFields.total}</p>
              <p className="text-xs text-muted-foreground">Form Fields</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{totals.fileUploads.done}/{totals.fileUploads.total}</p>
              <p className="text-xs text-muted-foreground">File Uploads</p>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({totals.overall.done}/{totals.overall.total})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks ({totals.tasks.done}/{totals.tasks.total})
            </TabsTrigger>
            <TabsTrigger value="forms">
              Forms ({totals.formFields.done}/{totals.formFields.total})
            </TabsTrigger>
            <TabsTrigger value="files">
              Files ({totals.fileUploads.done}/{totals.fileUploads.total})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Responses by Page */}
        {filteredPages.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p>No responses yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredPages.map(page => (
              <div key={page.pageId} className="space-y-3">
                {/* Page Header */}
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{page.pageTitle}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {page.progress.done}/{page.progress.total}
                  </Badge>
                </div>

                {/* Items */}
                <Card className="divide-y">
                  {page.items.map(item => (
                    <div key={item.id}>
                      {'question' in item ? (
                        <FormFieldResponse formField={item as FormFieldItem} />
                      ) : 'files' in item ? (
                        <FileUploadResponse fileUpload={item as FileUploadItem} />
                      ) : (
                        <TaskResponse task={item as TaskItem} />
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskResponse({ task }: { task: TaskItem }) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        {task.isDone ? (
          <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
        ) : (
          <Circle className="size-5 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <Badge variant={task.isDone ? 'default' : 'secondary'} className="text-xs">
              {task.isDone ? 'Completed' : 'Pending'}
            </Badge>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
          {task.isDone && task.completedBy && (
            <p className="text-xs text-muted-foreground mt-2">
              Completed by {task.completedBy.name || task.completedBy.email}
              {task.completedAt && ` • ${format(new Date(task.completedAt), 'MMM d, yyyy')}`}
            </p>
          )}
          {!task.isDone && task.dueDate && (
            <p className="text-xs text-muted-foreground mt-2">
              Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FormFieldResponse({ formField }: { formField: FormFieldItem }) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <FileText className="size-5 text-purple-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {formField.question}
              {formField.required && <span className="text-red-500 ml-1">*</span>}
            </p>
          </div>
          
          {formField.response ? (
            <div className="mt-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <FormFieldValue type={formField.type} value={formField.response.value} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Answered by {formField.response.answeredBy.name || formField.response.answeredBy.email}
                {formField.response.answeredAt && ` • ${format(new Date(formField.response.answeredAt), 'MMM d, yyyy')}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 italic">Waiting for response...</p>
          )}
        </div>
      </div>
    </div>
  )
}

function FormFieldValue({ type, value }: { type: string; value: any }) {
  switch (type) {
    case 'text':
    case 'textarea':
      return <p className="text-sm whitespace-pre-wrap">{value.text || value}</p>
    
    case 'select':
      return <p className="text-sm">{value.selected || value}</p>
    
    case 'multiselect': {
      let options: string[] = []
      if (Array.isArray(value.selected)) {
        options = value.selected
      } else if (typeof value.selected === 'string') {
        options = [value.selected]
      } else if (Array.isArray(value)) {
        options = value
      }
      
      if (options.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No selection</p>
      }
      
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt, i) => (
            <Badge key={i} variant="secondary">{opt}</Badge>
          ))}
        </div>
      )
    }
    
    case 'date':
      return (
        <p className="text-sm">
          {value.date ? format(new Date(value.date), 'MMMM d, yyyy') : 'No date'}
        </p>
      )
    
    default:
      return <p className="text-sm">{JSON.stringify(value)}</p>
  }
}

function FileUploadResponse({ fileUpload }: { fileUpload: FileUploadItem }) {
  const getFileIcon = (name: string | undefined) => {
    if (!name) return File
    const ext = name.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext || '')) return FileText
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return FileSpreadsheet
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return ImageIcon
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <Upload className="size-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{fileUpload.label}</p>
            <Badge variant="secondary" className="text-xs">
              {fileUpload.files.length}/{fileUpload.maxFiles} files
            </Badge>
          </div>
          {fileUpload.description && (
            <p className="text-sm text-muted-foreground mt-1">{fileUpload.description}</p>
          )}
          
          {fileUpload.files.length > 0 ? (
            <div className="mt-3 space-y-2">
              {fileUpload.files.map(file => {
                const Icon = getFileIcon(file.name)
                return (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Icon className="size-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name || 'Unnamed file'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • Uploaded by {file.uploadedBy.name || file.uploadedBy.email}
                        {file.uploadedAt && ` • ${format(new Date(file.uploadedAt), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={file.downloadUrl} className="flex items-center gap-1">
                        <Download className="size-4" />
                        <span className="sr-only">Download</span>
                      </a>
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 italic">No files uploaded yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

