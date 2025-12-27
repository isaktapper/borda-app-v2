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

export interface QuestionItem {
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

export interface ChecklistItem {
  id: string
  blockId: string
  pageId: string
  pageTitle: string
  title?: string
  items: { id: string; label: string }[]
  checkedItems: string[]
  checkedCount: number
  totalCount: number
  lastUpdatedBy?: { email: string; name?: string }
  lastUpdatedAt?: string
  isDone: boolean
}

export type ActionItem = TaskItem | QuestionItem | FileUploadItem | ChecklistItem

export interface PageWithItems {
  pageId: string
  pageTitle: string
  items: ActionItem[]
  progress: { done: number; total: number }
}

export interface ActionItemsData {
  byType: {
    tasks: TaskItem[]
    questions: QuestionItem[]
    fileUploads: FileUploadItem[]
    checklists: ChecklistItem[]
  }
  byPage: PageWithItems[]
  totals: {
    tasks: { done: number; total: number }
    questions: { done: number; total: number }
    fileUploads: { done: number; total: number }
    checklists: { done: number; total: number }
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
      byType: { tasks: [], questions: [], fileUploads: [], checklists: [] },
      byPage: [],
      totals: {
        tasks: { done: 0, total: 0 },
        questions: { done: 0, total: 0 },
        fileUploads: { done: 0, total: 0 },
        checklists: { done: 0, total: 0 },
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
      byType: { tasks: [], questions: [], fileUploads: [], checklists: [] },
      byPage: [],
      totals: {
        tasks: { done: 0, total: 0 },
        questions: { done: 0, total: 0 },
        fileUploads: { done: 0, total: 0 },
        checklists: { done: 0, total: 0 },
        overall: { done: 0, total: 0 }
      }
    }
  }

  const blockIds = blocks.map(b => b.id)

  // ===== TASKS =====
  // Tasks have project_id directly, no need to go through blocks
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)

  // Get unique user IDs from tasks
  const taskUserIds = [...new Set(tasksData?.map(t => t.completed_by).filter(Boolean) || [])]
  const { data: taskUsers } = taskUserIds.length > 0
    ? await supabase.from('users').select('id, email, full_name').in('id', taskUserIds)
    : { data: [] }

  const tasks: TaskItem[] = (tasksData || []).map(task => {
    const block = blocks.find(b => b.id === task.block_id)
    const page = pages.find(p => p.id === block?.page_id)
    const completedByUser = taskUsers?.find(u => u.id === task.completed_by)

    return {
      id: task.id,
      blockId: task.block_id,
      pageId: page?.id || '',
      pageTitle: page?.title || 'Untitled',
      title: task.title,
      description: task.description || undefined,
      dueDate: task.due_date || undefined,
      status: task.status as 'pending' | 'in_progress' | 'completed',
      completedAt: task.completed_at || undefined,
      completedBy: completedByUser ? {
        email: completedByUser.email,
        name: completedByUser.full_name || undefined
      } : undefined,
      isDone: task.status === 'completed'
    }
  })

  // ===== QUESTIONS =====
  const questionBlocks = blocks.filter(b => b.type === 'question')
  const questionBlockIds = questionBlocks.map(b => b.id)

  const { data: questionResponses, error: questionError } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', questionBlockIds)

  // Get unique user IDs from question responses
  const questionUserIds = [...new Set(questionResponses?.map(r => r.user_id).filter(Boolean) || [])]
  const { data: questionUsers } = questionUserIds.length > 0
    ? await supabase.from('users').select('id, email, full_name').in('id', questionUserIds)
    : { data: [] }

  const questions: QuestionItem[] = questionBlocks.map(block => {
    const page = pages.find(p => p.id === block.page_id)
    const content = block.content as any
    const response = questionResponses?.find(r => r.block_id === block.id)
    const responseUser = response?.user_id ? questionUsers?.find(u => u.id === response.user_id) : null

    return {
      id: block.id,
      blockId: block.id,
      pageId: page?.id || '',
      pageTitle: page?.title || 'Untitled',
      question: content?.question || content?.placeholder || 'Question',
      type: content?.type || 'text',
      required: content?.required || false,
      response: response ? {
        value: response.value,
        answeredBy: {
          email: responseUser?.email || response.customer_email || '',
          name: responseUser?.full_name || undefined
        },
        answeredAt: response.created_at
      } : undefined,
      isDone: !!response
    }
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
          name: file.name,
          size: file.size,
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

  // ===== CHECKLISTS =====
  const checklistBlocks = blocks.filter(b => b.type === 'checklist')
  const { data: checklistResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', checklistBlocks.map(b => b.id))

  // Get unique user IDs from checklist responses
  const checklistUserIds = [...new Set(checklistResponses?.map(r => r.user_id).filter(Boolean) || [])]
  const { data: checklistUsers } = checklistUserIds.length > 0
    ? await supabase.from('users').select('id, email, full_name').in('id', checklistUserIds)
    : { data: [] }

  const checklists: ChecklistItem[] = checklistBlocks.map(block => {
    const page = pages.find(p => p.id === block.page_id)
    const content = block.content as any
    const response = checklistResponses?.find(r => r.block_id === block.id)
    const responseUser = response?.user_id ? checklistUsers?.find(u => u.id === response.user_id) : null

    const items = (content?.items || []).map((item: any, index: number) => ({
      id: item.id || `item-${index}`,
      label: typeof item === 'string' ? item : item.label || item
    }))

    const checkedItems = response?.value?.checked || []
    const totalCount = items.length
    const checkedCount = checkedItems.length

    return {
      id: block.id,
      blockId: block.id,
      pageId: page?.id || '',
      pageTitle: page?.title || 'Untitled',
      title: content?.title || undefined,
      items,
      checkedItems,
      checkedCount,
      totalCount,
      lastUpdatedBy: response ? {
        email: responseUser?.email || response.customer_email || '',
        name: responseUser?.full_name || undefined
      } : undefined,
      lastUpdatedAt: response?.created_at || undefined,
      isDone: totalCount > 0 && checkedCount === totalCount
    }
  })

  // ===== GROUP BY PAGE =====
  const byPage: PageWithItems[] = pages.map(page => {
    const pageItems: ActionItem[] = [
      ...tasks.filter(t => t.pageId === page.id),
      ...questions.filter(q => q.pageId === page.id),
      ...fileUploads.filter(f => f.pageId === page.id),
      ...checklists.filter(c => c.pageId === page.id)
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
    questions: {
      done: questions.filter(q => q.isDone).length,
      total: questions.length
    },
    fileUploads: {
      done: fileUploads.filter(f => f.isDone).length,
      total: fileUploads.length
    },
    checklists: {
      done: checklists.filter(c => c.isDone).length,
      total: checklists.length
    },
    overall: {
      done: 0,
      total: 0
    }
  }

  totals.overall.done = totals.tasks.done + totals.questions.done + totals.fileUploads.done + totals.checklists.done
  totals.overall.total = totals.tasks.total + totals.questions.total + totals.fileUploads.total + totals.checklists.total

  return {
    byType: {
      tasks,
      questions,
      fileUploads,
      checklists
    },
    byPage,
    totals
  }
}
