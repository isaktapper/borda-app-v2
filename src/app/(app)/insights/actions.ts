'use server'

import { createClient } from '@/lib/supabase/server'
import { format, subMonths, differenceInDays, startOfMonth } from 'date-fns'

export interface KPIStats {
  totalProjects: number
  activeProjects: number
  avgCompletionDays: number | null
  avgTimeToFirstAccess: number | null
}

export interface ProjectsByMonth {
  month: string
  count: number
}

export interface StatusDistribution {
  status: string
  count: number
}

export interface EngagementDistribution {
  level: string
  count: number
}

export interface CompletionFunnel {
  name: string
  value: number
}

export interface TimeToAccessDistribution {
  bucket: string
  count: number
}

export interface UpcomingProject {
  id: string
  name: string
  clientName: string
  targetDate: string
  daysRemaining: number
  progress: number
}

export interface InsightsData {
  kpis: KPIStats
  projectsByMonth: ProjectsByMonth[]
  statusDistribution: StatusDistribution[]
  engagementDistribution: EngagementDistribution[]
  completionFunnel: CompletionFunnel[]
  timeToAccessDistribution: TimeToAccessDistribution[]
  upcomingProjects: UpcomingProject[]
}

export async function getInsightsData(): Promise<InsightsData> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return getEmptyInsightsData()
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return getEmptyInsightsData()
  }

  const orgId = membership.organization_id

  // Fetch all data in parallel
  const [
    projectsData,
    projectMembersData,
    portalVisitsData,
    activityData
  ] = await Promise.all([
    // Get all projects for the org
    supabase
      .from('spaces')
      .select('id, name, client_name, status, created_at, target_go_live_date, engagement_level')
      .eq('organization_id', orgId)
      .is('deleted_at', null),
    
    // Get project members with invite data
    supabase
      .from('space_members')
      .select('space_id, invited_email, invited_at, role')
      .eq('role', 'customer'),
    
    // Get portal visits
    supabase
      .from('portal_visits')
      .select('space_id, visitor_email, visited_at'),
    
    // Get status change activities
    supabase
      .from('activity_log')
      .select('space_id, action, metadata, created_at')
      .eq('action', 'project.status_changed')
  ])

  const projects = projectsData.data || []
  const projectMembers = projectMembersData.data || []
  const portalVisits = portalVisitsData.data || []
  const activities = activityData.data || []

  // Filter to only org projects
  const spaceIds = new Set(projects.map(p => p.id))
  const orgMembers = projectMembers.filter(pm => spaceIds.has(pm.space_id))
  const orgVisits = portalVisits.filter(pv => spaceIds.has(pv.space_id))

  // === KPI Calculations ===
  const kpis = calculateKPIs(projects, orgMembers, orgVisits, activities)

  // === Projects by Month (last 12 months) ===
  const projectsByMonth = calculateProjectsByMonth(projects)

  // === Status Distribution ===
  const statusDistribution = calculateStatusDistribution(projects)

  // === Engagement Distribution ===
  const engagementDistribution = calculateEngagementDistribution(projects)

  // === Completion Funnel ===
  const completionFunnel = calculateCompletionFunnel(projects)

  // === Time to First Access Distribution ===
  const timeToAccessDistribution = calculateTimeToAccessDistribution(orgMembers, orgVisits)

  // === Upcoming Projects (next 30 days) ===
  const upcomingProjects = await calculateUpcomingProjects(supabase, projects)

  return {
    kpis,
    projectsByMonth,
    statusDistribution,
    engagementDistribution,
    completionFunnel,
    timeToAccessDistribution,
    upcomingProjects
  }
}

function getEmptyInsightsData(): InsightsData {
  return {
    kpis: {
      totalProjects: 0,
      activeProjects: 0,
      avgCompletionDays: null,
      avgTimeToFirstAccess: null
    },
    projectsByMonth: [],
    statusDistribution: [],
    engagementDistribution: [],
    completionFunnel: [],
    timeToAccessDistribution: [],
    upcomingProjects: []
  }
}

function calculateKPIs(
  projects: any[],
  members: any[],
  visits: any[],
  activities: any[]
): KPIStats {
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'active').length

  // Calculate avg completion time from status change activities
  const completionTimes: number[] = []
  const completedProjects = projects.filter(p => p.status === 'completed')
  
  for (const project of completedProjects) {
    // Find when project became active and when it became completed
    const projectActivities = activities
      .filter(a => a.space_id === project.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    let activeDate: Date | null = null
    let completedDate: Date | null = null
    
    for (const activity of projectActivities) {
      if (activity.metadata?.to === 'active' && !activeDate) {
        activeDate = new Date(activity.created_at)
      }
      if (activity.metadata?.to === 'completed') {
        completedDate = new Date(activity.created_at)
      }
    }
    
    if (activeDate && completedDate) {
      const days = differenceInDays(completedDate, activeDate)
      if (days >= 0) completionTimes.push(days)
    }
  }

  const avgCompletionDays = completionTimes.length > 0
    ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
    : null

  // Calculate avg time from invite to first access
  const accessTimes: number[] = []
  
  for (const member of members) {
    if (!member.invited_at || !member.invited_email) continue
    
    // Find first visit for this member on this project
    const memberVisits = visits
      .filter(v => v.space_id === member.space_id && v.visitor_email === member.invited_email)
      .sort((a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime())
    
    if (memberVisits.length > 0) {
      const inviteDate = new Date(member.invited_at)
      const firstVisit = new Date(memberVisits[0].visited_at)
      const days = differenceInDays(firstVisit, inviteDate)
      if (days >= 0) accessTimes.push(days)
    }
  }

  const avgTimeToFirstAccess = accessTimes.length > 0
    ? Math.round(accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length * 10) / 10
    : null

  return {
    totalProjects,
    activeProjects,
    avgCompletionDays,
    avgTimeToFirstAccess
  }
}

function calculateProjectsByMonth(projects: any[]): ProjectsByMonth[] {
  const now = new Date()
  const months: ProjectsByMonth[] = []
  
  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthKey = format(monthDate, 'yyyy-MM')
    const monthLabel = format(monthDate, 'MMM yyyy')
    
    const count = projects.filter(p => {
      const createdMonth = format(new Date(p.created_at), 'yyyy-MM')
      return createdMonth === monthKey
    }).length
    
    months.push({ month: monthLabel, count })
  }
  
  return months
}

function calculateStatusDistribution(projects: any[]): StatusDistribution[] {
  const statusCounts: Record<string, number> = {
    draft: 0,
    active: 0,
    completed: 0,
    archived: 0
  }
  
  for (const project of projects) {
    if (statusCounts[project.status] !== undefined) {
      statusCounts[project.status]++
    }
  }
  
  return Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count
    }))
}

function calculateEngagementDistribution(projects: any[]): EngagementDistribution[] {
  const levelCounts: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0
  }
  
  for (const project of projects) {
    const level = project.engagement_level || 'none'
    if (levelCounts[level] !== undefined) {
      levelCounts[level]++
    }
  }
  
  const levelLabels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: 'No Activity'
  }
  
  return Object.entries(levelCounts)
    .filter(([_, count]) => count > 0)
    .map(([level, count]) => ({
      level: levelLabels[level] || level,
      count
    }))
}

function calculateCompletionFunnel(projects: any[]): CompletionFunnel[] {
  const total = projects.length
  const active = projects.filter(p => p.status === 'active' || p.status === 'completed').length
  const completed = projects.filter(p => p.status === 'completed').length
  
  return [
    { name: 'Total Created', value: total },
    { name: 'Activated', value: active },
    { name: 'Completed', value: completed }
  ]
}

function calculateTimeToAccessDistribution(members: any[], visits: any[]): TimeToAccessDistribution[] {
  const buckets: Record<string, number> = {
    'Same day': 0,
    '1-3 days': 0,
    '4-7 days': 0,
    '7+ days': 0,
    'Not accessed': 0
  }
  
  for (const member of members) {
    if (!member.invited_at || !member.invited_email) {
      continue
    }
    
    // Find first visit
    const memberVisits = visits
      .filter(v => v.space_id === member.space_id && v.visitor_email === member.invited_email)
      .sort((a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime())
    
    if (memberVisits.length === 0) {
      buckets['Not accessed']++
      continue
    }
    
    const inviteDate = new Date(member.invited_at)
    const firstVisit = new Date(memberVisits[0].visited_at)
    const days = differenceInDays(firstVisit, inviteDate)
    
    if (days === 0) {
      buckets['Same day']++
    } else if (days <= 3) {
      buckets['1-3 days']++
    } else if (days <= 7) {
      buckets['4-7 days']++
    } else {
      buckets['7+ days']++
    }
  }
  
  return Object.entries(buckets)
    .filter(([_, count]) => count > 0)
    .map(([bucket, count]) => ({ bucket, count }))
}

async function calculateUpcomingProjects(
  supabase: any,
  projects: any[]
): Promise<UpcomingProject[]> {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  const upcomingProjects = projects
    .filter(p => {
      if (!p.target_go_live_date) return false
      if (p.status === 'completed' || p.status === 'archived') return false
      const goLiveDate = new Date(p.target_go_live_date)
      return goLiveDate >= now && goLiveDate <= thirtyDaysFromNow
    })
    .map(p => ({
      id: p.id,
      name: p.name,
      clientName: p.client_name,
      targetDate: p.target_go_live_date,
      daysRemaining: differenceInDays(new Date(p.target_go_live_date), now),
      progress: 0 // Will be calculated below
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5)
  
  // Calculate progress for each project
  for (const project of upcomingProjects) {
    const { getSpaceProgress } = await import('@/app/(app)/spaces/progress-actions')
    const progressData = await getSpaceProgress(project.id)
    project.progress = progressData?.progressPercentage || 0
  }
  
  return upcomingProjects
}



