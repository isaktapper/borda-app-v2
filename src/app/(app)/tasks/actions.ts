'use server'

import { createClient } from '@/lib/supabase/server'

export type Task = {
  id: string
  block_id: string
  space_id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string | null
  assignee_id: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
  space?: {
    id: string
    name: string
    client_name: string
    client_logo_url: string | null
  }
  assignee?: {
    id: string
    email: string
    full_name: string | null
  }
}

export type GroupedTasks = {
  overdue: Task[]
  upcoming: Task[]
  noDueDate: Task[]
}

export async function getTasks(): Promise<GroupedTasks> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { overdue: [], upcoming: [], noDueDate: [] }
  }

  // Get all pages with their spaces
  const { data: pages } = await supabase
    .from('pages')
    .select(`
      id,
      space_id,
      space:spaces!inner(id, name, client_name, client_logo_url, deleted_at)
    `)
    .is('space.deleted_at', null)

  if (!pages || pages.length === 0) {
    return { overdue: [], upcoming: [], noDueDate: [] }
  }

  const pageIds = pages.map(p => p.id)

  // Get all task blocks for these pages
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)
    .eq('type', 'task')

  if (!blocks || blocks.length === 0) {
    return { overdue: [], upcoming: [], noDueDate: [] }
  }

  const blockIds = blocks.map(b => b.id)

  // Get task responses (statuses)
  const { data: taskResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', blockIds)

  // Extract all tasks from blocks
  const allTasks: Task[] = []

  for (const block of blocks) {
    const content = block.content as any
    const blockTasks = content?.tasks || []
    const response = taskResponses?.find(r => r.block_id === block.id)
    const taskStatuses = response?.value?.tasks || {}

    const page = pages.find(p => p.id === block.page_id)
    if (!page) continue

    // Supabase returns space as an object (not array) for inner join
    const spaceData = page.space as any

    // Generate signed URL for client logo if exists
    let clientLogoUrl = null
    if (spaceData?.client_logo_url) {
      const { data } = await supabase.storage
        .from('client-logos')
        .createSignedUrl(spaceData.client_logo_url, 60 * 60 * 24)
      clientLogoUrl = data?.signedUrl || null
    }

    blockTasks.forEach((task: any) => {
      const status = taskStatuses[task.id] || 'pending'

      // Skip completed tasks
      if (status === 'completed') return

      allTasks.push({
        id: `${block.id}-${task.id}`,
        block_id: block.id,
        space_id: page.space_id,
        title: task.title || 'Untitled',
        description: task.description || null,
        status: status as 'pending' | 'in_progress' | 'completed',
        due_date: task.dueDate || null,
        assignee_id: null,
        completed_at: null,
        completed_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        space: {
          id: spaceData?.id,
          name: spaceData?.name,
          client_name: spaceData?.client_name,
          client_logo_url: clientLogoUrl
        }
      })
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Group tasks
  const grouped: GroupedTasks = {
    overdue: [],
    upcoming: [],
    noDueDate: []
  }

  allTasks.forEach(task => {
    if (!task.due_date) {
      grouped.noDueDate.push(task)
    } else {
      const dueDate = new Date(task.due_date)
      if (dueDate < today) {
        grouped.overdue.push(task)
      } else {
        grouped.upcoming.push(task)
      }
    }
  })

  // Sort each group by due date
  grouped.overdue.sort((a, b) =>
    (a.due_date || '').localeCompare(b.due_date || '')
  )
  grouped.upcoming.sort((a, b) =>
    (a.due_date || '').localeCompare(b.due_date || '')
  )

  return grouped
}

export async function getMyTasks(): Promise<GroupedTasks> {
  // Note: Assignee functionality not yet implemented in new task structure
  // For now, this returns all tasks (same as getTasks)
  // TODO: Add assignee support when task assignment is implemented
  return getTasks()
}

export async function toggleTaskStatus(compositeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // compositeId format: "blockId-taskId"
  const [blockId, taskId] = compositeId.split('-').reduce<[string, string]>((acc, part, idx) => {
    if (idx < 5) {
      // First 5 parts belong to blockId (UUID format)
      acc[0] = acc[0] ? `${acc[0]}-${part}` : part
    } else {
      // Remaining parts belong to taskId
      acc[1] = acc[1] ? `${acc[1]}-${part}` : part
    }
    return acc
  }, ['', ''])

  // Get current task statuses from responses
  const { data: response } = await supabase
    .from('responses')
    .select('value')
    .eq('block_id', blockId)
    .single()

  const taskStatuses = response?.value?.tasks || {}
  const currentStatus = taskStatuses[taskId] || 'pending'
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

  // Update the specific task status
  taskStatuses[taskId] = newStatus

  // Save back to responses
  const { error } = await supabase
    .from('responses')
    .upsert({
      block_id: blockId,
      user_id: user.id,
      value: { tasks: taskStatuses },
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'block_id'
    })

  if (error) {
    console.error('[toggleTaskStatus] Error:', error)
    return { error: error.message }
  }

  return { success: true, status: newStatus }
}
