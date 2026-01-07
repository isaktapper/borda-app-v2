'use server'

import { createClient } from '@/lib/supabase/server'

export interface TaskItem {
  id: string
  blockId: string
  pageId: string
  pageTitle: string
  title: string
  description?: string
  dueDate?: string
  status: 'pending' | 'in_progress' | 'completed'
  completedAt?: string
  completedBy?: { email: string; name?: string }
  isDone: boolean
}

export interface FormFieldItem {
  id: string
  blockId: string
  pageId: string
  pageTitle: string
  question: string
  type: string
  required: boolean
  response?: {
    value: any
    answeredBy: { email: string; name?: string }
    answeredAt: string
  }
  isDone: boolean
}

export interface FileUploadItem {
  id: string
  blockId: string
  pageId: string
  pageTitle: string
  label: string
  description?: string
  maxFiles: number
  files: {
    id: string
    name: string
    size: number
    uploadedBy: { email: string; name?: string }
    uploadedAt: string
    downloadUrl: string
  }[]
  isDone: boolean
}

export type ActionItem = TaskItem | FormFieldItem | FileUploadItem

export interface PageWithItems {
  pageId: string
  pageTitle: string
  items: ActionItem[]
  progress: { done: number; total: number }
}

export interface ActionItemsData {
  byType: {
    tasks: TaskItem[]
    formFields: FormFieldItem[]
    fileUploads: FileUploadItem[]
  }
  byPage: PageWithItems[]
  totals: {
    tasks: { done: number; total: number }
    formFields: { done: number; total: number }
    fileUploads: { done: number; total: number }
    overall: { done: number; total: number }
  }
}

export async function getProjectActionItems(projectId: string): Promise<ActionItemsData> {
  const supabase = await createClient()

  // Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get all pages for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id, title')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return {
      byType: { tasks: [], formFields: [], fileUploads: [] },
      byPage: [],
      totals: {
        tasks: { done: 0, total: 0 },
        formFields: { done: 0, total: 0 },
        fileUploads: { done: 0, total: 0 },
        overall: { done: 0, total: 0 }
      }
    }
  }

  const pageIds = pages.map(p => p.id)

  // Get all blocks for these pages
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)

  if (!blocks) {
    return {
      byType: { tasks: [], formFields: [], fileUploads: [] },
      byPage: [],
      totals: {
        tasks: { done: 0, total: 0 },
        formFields: { done: 0, total: 0 },
        fileUploads: { done: 0, total: 0 },
        overall: { done: 0, total: 0 }
      }
    }
  }

  const blockIds = blocks.map(b => b.id)

  // ===== TASKS =====
  const taskBlocks = blocks.filter(b => b.type === 'task')
  const taskBlockIds = taskBlocks.map(b => b.id)

  // Get task responses (stored in responses table now)
  const { data: taskResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', taskBlockIds)

  const tasks: TaskItem[] = []

  taskBlocks.forEach(block => {
    const page = pages.find(p => p.id === block.page_id)
    const content = block.content as any
    const blockTasks = content?.tasks || []
    const response = taskResponses?.find(r => r.block_id === block.id)
    const taskStatuses = response?.value?.tasks || {}

    // Create a TaskItem for each task in the block
    blockTasks.forEach((task: any) => {
      const status = taskStatuses[task.id] || 'pending'

      tasks.push({
        id: `${block.id}-${task.id}`,
        blockId: block.id,
        pageId: page?.id || '',
        pageTitle: page?.title || 'Untitled',
        title: task.title || 'Untitled',
        description: task.description || undefined,
        dueDate: task.dueDate || undefined,
        status: status as 'pending' | 'in_progress' | 'completed',
        completedAt: undefined,
        completedBy: undefined,
        isDone: status === 'completed'
      })
    })
  })

  // ===== FORM FIELDS =====
  const formBlocks = blocks.filter(b => b.type === 'form')
  const formBlockIds = formBlocks.map(b => b.id)

  const { data: formResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', formBlockIds)

  // Get unique user IDs from form responses
  const formUserIds = [...new Set(formResponses?.map(r => r.user_id).filter(Boolean) || [])]
  const { data: formUsers } = formUserIds.length > 0
    ? await supabase.from('users').select('id, email, full_name').in('id', formUserIds)
    : { data: [] }

  const formFields: FormFieldItem[] = []

  formBlocks.forEach(block => {
    const page = pages.find(p => p.id === block.page_id)
    const content = block.content as any
    const blockQuestions = content?.questions || []
    const response = formResponses?.find(r => r.block_id === block.id)
    const questionAnswers = response?.value?.questions || {}
    const responseUser = response?.user_id ? formUsers?.find(u => u.id === response.user_id) : null

    // Create a FormFieldItem for each question in the block
    blockQuestions.forEach((question: any) => {
      const answer = questionAnswers[question.id]
      const hasAnswer = answer && (answer.text || answer.selected || answer.date)

      formFields.push({
        id: `${block.id}-${question.id}`,
        blockId: block.id,
        pageId: page?.id || '',
        pageTitle: page?.title || 'Untitled',
        question: question.question || 'Question',
        type: question.type || 'text',
        required: question.required || false,
        response: hasAnswer ? {
          value: answer,
          answeredBy: {
            email: responseUser?.email || response.customer_email || '',
            name: responseUser?.full_name || undefined
          },
          answeredAt: response.created_at
        } : undefined,
        isDone: hasAnswer
      })
    })
  })

  // ===== FILE UPLOADS =====
  const fileBlocks = blocks.filter(b => b.type === 'file_upload')
  const { data: filesData } = await supabase
    .from('files')
    .select('*')
    .in('block_id', fileBlocks.map(b => b.id))
    .is('deleted_at', null)

  // Get unique user IDs from files
  const fileUserIds = [...new Set(filesData?.map(f => f.uploaded_by).filter(Boolean) || [])]
  const { data: fileUsers } = fileUserIds.length > 0
    ? await supabase.from('users').select('id, email, full_name').in('id', fileUserIds)
    : { data: [] }

  const fileUploads: FileUploadItem[] = fileBlocks.map(block => {
    const page = pages.find(p => p.id === block.page_id)
    const content = block.content as any
    const blockFiles = filesData?.filter(f => f.block_id === block.id) || []

    return {
      id: block.id,
      blockId: block.id,
      pageId: page?.id || '',
      pageTitle: page?.title || 'Untitled',
      label: content?.label || 'File Upload',
      description: content?.description || undefined,
      maxFiles: content?.maxFiles || 5,
      files: blockFiles.map(file => {
        const uploadedByUser = fileUsers?.find(u => u.id === file.uploaded_by)
        return {
          id: file.id,
          name: file.original_name || 'Unnamed file',
          size: file.file_size_bytes || 0,
          uploadedBy: {
            email: uploadedByUser?.email || '',
            name: uploadedByUser?.full_name || undefined
          },
          uploadedAt: file.created_at,
          downloadUrl: `/api/files/${file.id}/download`
        }
      }),
      isDone: blockFiles.length > 0
    }
  })

  // ===== GROUP BY PAGE =====
  const byPage: PageWithItems[] = pages.map(page => {
    const pageItems: ActionItem[] = [
      ...tasks.filter(t => t.pageId === page.id),
      ...formFields.filter(q => q.pageId === page.id),
      ...fileUploads.filter(f => f.pageId === page.id)
    ]

    const done = pageItems.filter(item => item.isDone).length
    const total = pageItems.length

    return {
      pageId: page.id,
      pageTitle: page.title,
      items: pageItems,
      progress: { done, total }
    }
  }).filter(page => page.items.length > 0) // Only include pages with action items

  // ===== TOTALS =====
  const totals = {
    tasks: {
      done: tasks.filter(t => t.isDone).length,
      total: tasks.length
    },
    formFields: {
      done: formFields.filter(q => q.isDone).length,
      total: formFields.length
    },
    fileUploads: {
      done: fileUploads.filter(f => f.isDone).length,
      total: fileUploads.length
    },
    overall: {
      done: 0,
      total: 0
    }
  }

  totals.overall.done = totals.tasks.done + totals.formFields.done + totals.fileUploads.done
  totals.overall.total = totals.tasks.total + totals.formFields.total + totals.fileUploads.total

  return {
    byType: {
      tasks,
      formFields,
      fileUploads
    },
    byPage,
    totals
  }
}
