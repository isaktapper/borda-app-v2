'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { triggerSlackNotification } from '@/lib/slack/activity-hook'
import { triggerTeamsNotification } from '@/lib/teams/activity-hook'

export interface ProgressStats {
  totalTasks: number
  completedTasks: number
  totalForms: number
  answeredForms: number
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

export async function getSpaceProgress(spaceId: string, useAdminClient: boolean = false): Promise<ProgressStats | null> {
  const supabase = useAdminClient ? await createAdminClient() : await createClient()

  // Get all pages for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('space_id', spaceId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      totalForms: 0,
      answeredForms: 0,
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

  // ===== COUNT TASKS =====
  const taskBlocks = blocks.filter(b => b.type === 'task')
  const taskBlockIds = taskBlocks.map(b => b.id)

  // Get task responses (stored in responses table)
  const { data: taskResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', taskBlockIds)

  let totalTasks = 0
  let completedTasks = 0

  taskBlocks.forEach(block => {
    const content = block.content as any
    const blockTasks = content?.tasks || []
    const response = taskResponses?.find(r => r.block_id === block.id)
    const taskStatuses = response?.value?.tasks || {}

    // Count each task in the block
    blockTasks.forEach((task: any) => {
      totalTasks++
      const status = taskStatuses[task.id] || 'pending'
      if (status === 'completed') {
        completedTasks++
      }
    })
  })

  // ===== COUNT FORMS =====
  const formBlocks = blocks.filter(b => b.type === 'form')
  const formBlockIds = formBlocks.map(b => b.id)

  const { data: formResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', formBlockIds)

  let totalForms = 0
  let answeredForms = 0

  formBlocks.forEach(block => {
    const content = block.content as any
    const blockQuestions = content?.questions || []
    const response = formResponses?.find(r => r.block_id === block.id)
    const questionAnswers = response?.value?.questions || {}

    // Count each question in the block
    blockQuestions.forEach((question: any) => {
      totalForms++
      const answer = questionAnswers[question.id]
      
      // Check if there's a meaningful answer (not empty string, null, or empty array)
      let hasAnswer = false
      if (answer) {
        if (answer.text && answer.text.trim() !== '') {
          hasAnswer = true
        } else if (answer.selected) {
          // Handle both single select (string) and multiselect (array)
          if (Array.isArray(answer.selected)) {
            hasAnswer = answer.selected.length > 0
          } else {
            hasAnswer = answer.selected !== ''
          }
        } else if (answer.date) {
          hasAnswer = true
        }
      }
      
      if (hasAnswer) {
        answeredForms++
      }
    })
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
  const totalItems = totalTasks + totalForms + totalFiles
  const completedItems = completedTasks + answeredForms + uploadedFiles
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return {
    totalTasks,
    completedTasks,
    totalForms,
    answeredForms,
    totalFiles,
    uploadedFiles,
    progressPercentage
  }
}

export async function getSpaceActivity(spaceId: string, limit: number = 10, useAdminClient: boolean = false): Promise<ActivityItem[]> {
  const supabase = useAdminClient ? await createAdminClient() : await createClient()

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching activity:', error)
    return []
  }

  return data || []
}

export async function getUpcomingTasks(spaceId: string, limit: number = 5, useAdminClient: boolean = false) {
  const supabase = useAdminClient ? await createAdminClient() : await createClient()

  // Get all pages for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('space_id', spaceId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) return []

  const pageIds = pages.map(p => p.id)

  // Get all task blocks for these pages
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)
    .eq('type', 'task')

  if (!blocks || blocks.length === 0) return []

  const blockIds = blocks.map(b => b.id)

  // Get task responses
  const { data: taskResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', blockIds)

  // Extract all tasks with due dates
  const upcomingTasks: any[] = []

  blocks.forEach(block => {
    const content = block.content as any
    const blockTasks = content?.tasks || []
    const response = taskResponses?.find(r => r.block_id === block.id)
    const taskStatuses = response?.value?.tasks || {}

    blockTasks.forEach((task: any) => {
      const status = taskStatuses[task.id] || 'pending'
      if (status === 'pending' && task.dueDate) {
        upcomingTasks.push({
          id: `${block.id}-${task.id}`,
          blockId: block.id,
          title: task.title,
          dueDate: task.dueDate,
          status
        })
      }
    })
  })

  // Sort by due date and limit
  return upcomingTasks
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit)
}

export async function getOverdueTasks(spaceId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all pages for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('space_id', spaceId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) return []

  const pageIds = pages.map(p => p.id)

  // Get all task blocks for these pages
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, content, page_id')
    .in('page_id', pageIds)
    .eq('type', 'task')

  if (!blocks || blocks.length === 0) return []

  const blockIds = blocks.map(b => b.id)

  // Get task responses
  const { data: taskResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', blockIds)

  // Extract all overdue tasks
  const overdueTasks: any[] = []

  blocks.forEach(block => {
    const content = block.content as any
    const blockTasks = content?.tasks || []
    const response = taskResponses?.find(r => r.block_id === block.id)
    const taskStatuses = response?.value?.tasks || {}

    blockTasks.forEach((task: any) => {
      const status = taskStatuses[task.id] || 'pending'
      if (status === 'pending' && task.dueDate && task.dueDate < today) {
        overdueTasks.push({
          id: `${block.id}-${task.id}`,
          blockId: block.id,
          title: task.title,
          dueDate: task.dueDate,
          status
        })
      }
    })
  })

  return overdueTasks
}

export async function getSpaceStats(organizationId: string) {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Get all active spaces
  const { data: activeSpaces } = await supabase
    .from('spaces')
    .select('engagement_score, engagement_level, target_go_live_date')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (!activeSpaces || activeSpaces.length === 0) {
    return {
      activeSpaces: 0,
      lowEngagement: 0,
      avgEngagement: 0,
      goLiveThisMonth: 0,
    }
  }

  // Count low engagement (low or none)
  const lowEngagement = activeSpaces.filter(
    s => s.engagement_level === 'low' || s.engagement_level === 'none'
  ).length

  // Calculate average engagement score
  const spacesWithScore = activeSpaces.filter(s => s.engagement_score !== null)
  const avgEngagement = spacesWithScore.length > 0
    ? Math.round(
        spacesWithScore.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / spacesWithScore.length
      )
    : 0

  // Count go-live this month
  const goLiveThisMonth = activeSpaces.filter(s => {
    if (!s.target_go_live_date) return false
    const goLiveDate = new Date(s.target_go_live_date)
    return goLiveDate >= startOfMonth && goLiveDate <= endOfMonth
  }).length

  return {
    activeSpaces: activeSpaces.length,
    lowEngagement,
    avgEngagement,
    goLiveThisMonth,
  }
}

export async function getDashboardStats(organizationId: string) {
  const supabase = await createClient()

  // Get all non-archived projects for this organization
  const { data: projects } = await supabase
    .from('spaces')
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

  const spaceIds = projects.map(p => p.id)

  // Get all pages for these projects
  const { data: pages } = await supabase
    .from('pages')
    .select('id, space_id')
    .in('space_id', spaceIds)
    .is('deleted_at', null)

  const pagesByProject = new Map<string, string[]>()
  pages?.forEach(page => {
    if (!pagesByProject.has(page.space_id)) {
      pagesByProject.set(page.space_id, [])
    }
    pagesByProject.get(page.space_id)!.push(page.id)
  })

  // Get all blocks
  const allPageIds = pages?.map(p => p.id) || []
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, page_id, type, content')
    .in('page_id', allPageIds)

  const blocksByPage = new Map<string, string[]>()
  blocks?.forEach(block => {
    if (!blocksByPage.has(block.page_id)) {
      blocksByPage.set(block.page_id, [])
    }
    blocksByPage.get(block.page_id)!.push(block.id)
  })

  // Get task blocks and responses
  const taskBlocks = blocks?.filter(b => b.type === 'task') || []
  const taskBlockIds = taskBlocks.map(b => b.id)

  const { data: taskResponses } = await supabase
    .from('responses')
    .select('*')
    .in('block_id', taskBlockIds)

  const today = new Date().toISOString().split('T')[0]
  let totalOverdueTasks = 0
  const projectOverdueTasks = new Map<string, number>()
  const projectTaskCounts = new Map<string, number>()

  // Count all tasks and overdue tasks per project
  taskBlocks.forEach(block => {
    const content = block.content as any
    const blockTasks = content?.tasks || []
    const response = taskResponses?.find(r => r.block_id === block.id)
    const taskStatuses = response?.value?.tasks || {}

    // Find project for this block
    const page = pages?.find(p => p.id === block.page_id)
    const spaceId = page?.space_id

    if (spaceId) {
      blockTasks.forEach((task: any) => {
        // Increment total task count for this project
        projectTaskCounts.set(spaceId, (projectTaskCounts.get(spaceId) || 0) + 1)

        // Check if task is overdue
        const status = taskStatuses[task.id] || 'pending'
        if (status === 'pending' && task.dueDate && task.dueDate < today) {
          totalOverdueTasks++
          projectOverdueTasks.set(spaceId, (projectOverdueTasks.get(spaceId) || 0) + 1)
        }
      })
    }
  })

  // Calculate projects at risk (>50% of tasks are overdue)
  let projectsAtRisk = 0
  projectOverdueTasks.forEach((overdueCount, spaceId) => {
    const totalTasks = projectTaskCounts.get(spaceId) || 0
    if (totalTasks > 0 && (overdueCount / totalTasks) > 0.5) {
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
      const progress = await getSpaceProgress(project.id)
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

// Helper to check if this is the user's first visit to this portal
export async function isFirstVisit(spaceId: string, actorEmail: string): Promise<boolean> {
  const supabase = await createAdminClient()
  
  const { data: existingVisit, error } = await supabase
    .from('activity_log')
    .select('id')
    .eq('space_id', spaceId)
    .eq('actor_email', actorEmail)
    .in('action', ['portal.first_visit', 'portal.visit'])
    .limit(1)
    .maybeSingle()
  
  if (error) {
    console.error('Error checking first visit:', error)
    return true // Assume first visit on error
  }
  
  return !existingVisit
}

// Helper function to log activity
export async function logActivity(
  spaceId: string,
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
      space_id: spaceId,
      actor_email: actorEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: metadata || {}
    })

  if (error) {
    console.error('Error logging activity:', error)
    return
  }

  // Get organization ID for this project
  const { data: project } = await supabase
    .from('spaces')
    .select('organization_id')
    .eq('id', spaceId)
    .single()

  if (project?.organization_id) {
    // Trigger Slack notification (non-blocking)
    triggerSlackNotification(
      spaceId,
      project.organization_id,
      actorEmail,
      action,
      metadata
    ).catch(console.error)

    // Trigger Teams notification (non-blocking)
    triggerTeamsNotification(
      spaceId,
      project.organization_id,
      actorEmail,
      action,
      metadata
    ).catch(console.error)
  }
}

// Log portal visit with first/return visit detection
export async function logPortalVisitActivity(spaceId: string, visitorEmail: string) {
  const firstVisit = await isFirstVisit(spaceId, visitorEmail)
  const action = firstVisit ? 'portal.first_visit' : 'portal.visit'
  
  await logActivity(spaceId, visitorEmail, action, 'portal', spaceId, {
    firstVisit
  })
}
