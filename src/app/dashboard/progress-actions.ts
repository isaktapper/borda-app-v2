'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface ProgressStats {
  totalTasks: number
  completedTasks: number
  totalQuestions: number
  answeredQuestions: number
  totalChecklists: number
  completedChecklists: number
  totalFiles: number
  uploadedFiles: number
  progressPercentage: number
}

export interface ActivityItem {
  id: string
  actor_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: any
  created_at: string
}

export async function getProjectProgress(projectId: string): Promise<ProgressStats | null> {
  const supabase = await createClient()

  // Get all pages for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      totalQuestions: 0,
      answeredQuestions: 0,
      totalChecklists: 0,
      completedChecklists: 0,
      totalFiles: 0,
      uploadedFiles: 0,
      progressPercentage: 0
    }
  }

  const pageIds = pages.map(p => p.id)

  // Get all blocks for these pages
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, content')
    .in('page_id', pageIds)

  if (!blocks) return null

  const blockIds = blocks.map(b => b.id)

  // Count tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status')
    .in('block_id', blockIds)

  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0

  // Count questions (blocks with type 'question')
  const questionBlocks = blocks.filter(b => b.type === 'question')
  const totalQuestions = questionBlocks.length

  // Get responses for question blocks
  const { data: responses } = await supabase
    .from('responses')
    .select('block_id')
    .in('block_id', questionBlocks.map(b => b.id))

  const answeredQuestions = responses?.length || 0

  // Count checklists
  const checklistBlocks = blocks.filter(b => b.type === 'checklist')
  const totalChecklists = checklistBlocks.length

  // Get responses for checklist blocks to count completed
  const { data: checklistResponses } = await supabase
    .from('responses')
    .select('block_id, value')
    .in('block_id', checklistBlocks.map(b => b.id))

  // Count completed checklists (where all items are checked)
  let completedChecklists = 0
  checklistResponses?.forEach(response => {
    const block = checklistBlocks.find(b => b.id === response.block_id)
    if (!block?.content?.items) return

    const totalItems = block.content.items.length
    const checkedItems = response.value?.checked?.length || 0
    if (totalItems > 0 && checkedItems === totalItems) {
      completedChecklists++
    }
  })

  // Count file uploads
  const fileBlocks = blocks.filter(b => b.type === 'file_upload')
  const totalFiles = fileBlocks.length

  const { data: files } = await supabase
    .from('files')
    .select('block_id')
    .in('block_id', fileBlocks.map(b => b.id))
    .is('deleted_at', null)

  // Count blocks that have at least one file
  const blocksWithFiles = new Set(files?.map(f => f.block_id) || [])
  const uploadedFiles = blocksWithFiles.size

  // Calculate progress percentage
  const totalItems = totalTasks + totalQuestions + totalChecklists + totalFiles
  const completedItems = completedTasks + answeredQuestions + completedChecklists + uploadedFiles
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return {
    totalTasks,
    completedTasks,
    totalQuestions,
    answeredQuestions,
    totalChecklists,
    completedChecklists,
    totalFiles,
    uploadedFiles,
    progressPercentage
  }
}

export async function getProjectActivity(projectId: string, limit: number = 10): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching activity:', error)
    return []
  }

  return data || []
}

export async function getUpcomingTasks(projectId: string, limit: number = 5) {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      block_id,
      title,
      due_date,
      status,
      blocks!inner(page_id, pages!inner(project_id))
    `)
    .eq('status', 'pending')
    .eq('blocks.pages.project_id', projectId)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(limit)

  return tasks || []
}

export async function getOverdueTasks(projectId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      block_id,
      title,
      due_date,
      status,
      blocks!inner(page_id, pages!inner(project_id))
    `)
    .eq('status', 'pending')
    .eq('blocks.pages.project_id', projectId)
    .not('due_date', 'is', null)
    .lt('due_date', today)

  return tasks || []
}

export async function getDashboardStats(organizationId: string) {
  const supabase = await createClient()

  // Get all non-archived projects for this organization
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, target_go_live_date, status, client_name')
    .eq('organization_id', organizationId)
    .in('status', ['draft', 'active', 'completed'])
    .is('deleted_at', null)

  // Count only active projects
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0

  if (!projects || projects.length === 0) {
    return {
      activeProjects: 0,
      overdueTasks: 0,
      avgDaysToGoLive: 0,
      projectsAtRisk: 0,
      topProjects: []
    }
  }

  const projectIds = projects.map(p => p.id)

  // Get all pages for these projects
  const { data: pages } = await supabase
    .from('pages')
    .select('id, project_id')
    .in('project_id', projectIds)
    .is('deleted_at', null)

  const pagesByProject = new Map<string, string[]>()
  pages?.forEach(page => {
    if (!pagesByProject.has(page.project_id)) {
      pagesByProject.set(page.project_id, [])
    }
    pagesByProject.get(page.project_id)!.push(page.id)
  })

  // Get all blocks
  const allPageIds = pages?.map(p => p.id) || []
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, page_id')
    .in('page_id', allPageIds)

  const blocksByPage = new Map<string, string[]>()
  blocks?.forEach(block => {
    if (!blocksByPage.has(block.page_id)) {
      blocksByPage.set(block.page_id, [])
    }
    blocksByPage.get(block.page_id)!.push(block.id)
  })

  // Get all tasks
  const allBlockIds = blocks?.map(b => b.id) || []
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('block_id, status, due_date')
    .in('block_id', allBlockIds)

  const today = new Date().toISOString().split('T')[0]
  let totalOverdueTasks = 0
  const projectOverdueTasks = new Map<string, number>()

  allTasks?.forEach(task => {
    if (task.status === 'pending' && task.due_date && task.due_date < today) {
      totalOverdueTasks++

      // Find project for this task
      const block = blocks?.find(b => b.id === task.block_id)
      if (block) {
        const page = pages?.find(p => p.id === block.page_id)
        if (page) {
          projectOverdueTasks.set(
            page.project_id,
            (projectOverdueTasks.get(page.project_id) || 0) + 1
          )
        }
      }
    }
  })

  // Calculate projects at risk (>50% of tasks are overdue)
  let projectsAtRisk = 0
  projectOverdueTasks.forEach((overdueCount, projectId) => {
    const projectPages = pagesByProject.get(projectId) || []
    const projectBlocks = projectPages.flatMap(pageId => blocksByPage.get(pageId) || [])
    const projectTasks = allTasks?.filter(t => projectBlocks.includes(t.block_id)) || []

    if (projectTasks.length > 0 && (overdueCount / projectTasks.length) > 0.5) {
      projectsAtRisk++
    }
  })

  // Calculate average days to go-live (only for active/paused projects with future dates)
  const activeProjectsWithGoLive = projects.filter(p =>
    (p.status === 'active' || p.status === 'paused') &&
    p.target_go_live_date &&
    new Date(p.target_go_live_date) > new Date()
  )
  const totalDays = activeProjectsWithGoLive.reduce((sum, p) => {
    const daysUntil = Math.ceil((new Date(p.target_go_live_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return sum + Math.max(0, daysUntil)
  }, 0)
  const avgDaysToGoLive = activeProjectsWithGoLive.length > 0 ? Math.round(totalDays / activeProjectsWithGoLive.length) : 0

  // Get top 5 projects that need attention (only active/paused)
  const relevantProjects = projects.filter(p => p.status === 'active' || p.status === 'paused')
  const projectStats = await Promise.all(
    relevantProjects.map(async (project) => {
      const progress = await getProjectProgress(project.id)
      const overdue = projectOverdueTasks.get(project.id) || 0
      const daysToGoLive = project.target_go_live_date
        ? Math.ceil((new Date(project.target_go_live_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        id: project.id,
        name: project.name,
        clientName: project.client_name,
        progress: progress?.progressPercentage || 0,
        overdueTasks: overdue,
        daysToGoLive,
        needsAttention: overdue > 0 || (progress?.progressPercentage || 0) < 30
      }
    })
  )

  // Sort by needs attention, then by overdue tasks, then by progress
  const topProjects = projectStats
    .sort((a, b) => {
      if (a.needsAttention && !b.needsAttention) return -1
      if (!a.needsAttention && b.needsAttention) return 1
      if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks
      return a.progress - b.progress
    })
    .slice(0, 5)

  return {
    activeProjects,
    overdueTasks: totalOverdueTasks,
    avgDaysToGoLive,
    projectsAtRisk,
    topProjects
  }
}

// Helper function to log activity
export async function logActivity(
  projectId: string,
  actorEmail: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: any
) {
  // Use admin client to bypass RLS - we trust the actorEmail from portal session validation
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('activity_log')
    .insert({
      project_id: projectId,
      actor_email: actorEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: metadata || {}
    })

  if (error) {
    console.error('Error logging activity:', error)
  }
}
