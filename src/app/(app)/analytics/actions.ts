'use server'

import { createClient } from '@/lib/supabase/server'
import { differenceInDays, subDays, format } from 'date-fns'

// === Types ===

export interface KPIMetric {
  current: number | null
  previous: number | null
  changePercent: number | null
  suffix?: string
}

export interface AnalyticsKPIs {
  avgOnboardingTime: KPIMetric
  engagementScore: KPIMetric
  avgTimeToFirstAccess: KPIMetric
}

export interface PortalActivityDay {
  date: string
  visits: number
  activities: number
}

export interface OnboardingBucket {
  bucket: string
  Spaces: number
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs
  portalActivity: PortalActivityDay[]
  onboardingVelocity: OnboardingBucket[]
}

// === Main Data Fetcher ===

export async function getAnalyticsData(fromISO?: string, toISO?: string): Promise<AnalyticsData> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return getEmptyData()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return getEmptyData()

  const orgId = membership.organization_id
  const now = new Date()

  // Date range: default to last 90 days
  const to = toISO ? new Date(toISO) : now
  const from = fromISO ? new Date(fromISO) : subDays(now, 90)

  // Previous period: same duration before `from`
  const rangeDays = differenceInDays(to, from) || 1
  const prevFrom = subDays(from, rangeDays)
  const prevTo = new Date(from.getTime() - 1) // 1ms before current period

  // Fetch all data in parallel
  const [
    spacesResult,
    portalVisitsResult,
    statusActivityResult,
    customerActivityResult,
    spaceMembersResult,
  ] = await Promise.all([
    // Spaces with engagement data
    supabase
      .from('spaces')
      .select('id, name, client_name, status, created_at, updated_at, engagement_score, engagement_level, engagement_factors, engagement_calculated_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null),

    // Portal visits (all time, needed for first-access KPI + chart)
    supabase
      .from('portal_visits')
      .select('space_id, visitor_email, visited_at'),

    // Status change activities (for onboarding time) - both legacy and current action names
    supabase
      .from('activity_log')
      .select('space_id, action, metadata, created_at')
      .in('action', ['project.status_changed', 'space.status_changed']),

    // Customer activities (scoped to selected range for chart)
    supabase
      .from('activity_log')
      .select('space_id, action, created_at')
      .in('action', ['task.completed', 'task.reopened', 'form.submitted', 'file.uploaded', 'file.downloaded'])
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString()),

    // Space members (stakeholders) for avg time to first access
    supabase
      .from('space_members')
      .select('space_id, invited_email, invited_at, role')
      .eq('role', 'stakeholder')
      .is('deleted_at', null)
      .not('invited_email', 'is', null)
      .not('invited_at', 'is', null),
  ])

  const spaces = spacesResult.data || []
  const allPortalVisits = portalVisitsResult.data || []
  const statusActivities = statusActivityResult.data || []
  const customerActivities = customerActivityResult.data || []
  const spaceMembers = spaceMembersResult.data || []

  // Filter to org spaces only
  const spaceIds = new Set(spaces.map(s => s.id))
  const orgVisits = allPortalVisits.filter(v => spaceIds.has(v.space_id))
  const orgCustomerActivities = customerActivities.filter(a => spaceIds.has(a.space_id))
  const orgMembers = spaceMembers.filter(m => spaceIds.has(m.space_id))

  // Filter visits for chart (selected range only)
  const rangeVisits = orgVisits.filter(v => {
    const d = new Date(v.visited_at)
    return d >= from && d <= to
  })

  // === Calculate KPIs ===
  const kpis = calculateKPIs(spaces, statusActivities, orgMembers, orgVisits, from, to, prevFrom, prevTo)

  // === Portal Activity (daily, selected range) ===
  const portalActivity = calculatePortalActivity(rangeVisits, orgCustomerActivities, from, to)

  // === Onboarding Velocity ===
  const onboardingVelocity = calculateOnboardingVelocity(spaces, statusActivities)

  return {
    kpis,
    portalActivity,
    onboardingVelocity,
  }
}

// === Empty Data ===

function getEmptyData(): AnalyticsData {
  return {
    kpis: {
      avgOnboardingTime: { current: null, previous: null, changePercent: null, suffix: 'days' },
      engagementScore: { current: null, previous: null, changePercent: null },
      avgTimeToFirstAccess: { current: null, previous: null, changePercent: null, suffix: 'days' },
    },
    portalActivity: [],
    onboardingVelocity: [],
  }
}

// === KPI Calculations ===

function calculateKPIs(
  spaces: any[],
  activities: any[],
  members: any[],
  visits: any[],
  from: Date,
  to: Date,
  prevFrom: Date,
  prevTo: Date,
): AnalyticsKPIs {
  // --- Avg Onboarding Time ---
  const completionTimes = getCompletionTimes(spaces, activities)
  
  const currentCompletions = completionTimes.filter(ct => ct.completedAt >= from && ct.completedAt <= to)
  const prevCompletions = completionTimes.filter(ct => ct.completedAt >= prevFrom && ct.completedAt <= prevTo)

  const currentAvgOnboarding = currentCompletions.length > 0
    ? Math.round(currentCompletions.reduce((sum, ct) => sum + ct.days, 0) / currentCompletions.length)
    : (completionTimes.length > 0 ? Math.round(completionTimes.reduce((sum, ct) => sum + ct.days, 0) / completionTimes.length) : null)
  
  const prevAvgOnboarding = prevCompletions.length > 0
    ? Math.round(prevCompletions.reduce((sum, ct) => sum + ct.days, 0) / prevCompletions.length)
    : null

  // --- Engagement Score ---
  const activeSpaces = spaces.filter(s => s.status === 'active')
  const currentEngagement = activeSpaces.length > 0
    ? Math.round(activeSpaces.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / activeSpaces.length)
    : null

  // For previous engagement, we don't have historical snapshots
  const prevEngagement: number | null = null

  // --- Avg. Time to First Access ---
  const accessTimes = getFirstAccessTimes(members, visits)
  
  const currentAccessTimes = accessTimes.filter(at => at.invitedAt >= from && at.invitedAt <= to)
  const prevAccessTimes = accessTimes.filter(at => at.invitedAt >= prevFrom && at.invitedAt <= prevTo)

  const currentAvgAccess = currentAccessTimes.length > 0
    ? Math.round(currentAccessTimes.reduce((sum, at) => sum + at.days, 0) / currentAccessTimes.length * 10) / 10
    : (accessTimes.length > 0 ? Math.round(accessTimes.reduce((sum, at) => sum + at.days, 0) / accessTimes.length * 10) / 10 : null)

  const prevAvgAccess = prevAccessTimes.length > 0
    ? Math.round(prevAccessTimes.reduce((sum, at) => sum + at.days, 0) / prevAccessTimes.length * 10) / 10
    : null

  return {
    avgOnboardingTime: {
      current: currentAvgOnboarding,
      previous: prevAvgOnboarding,
      changePercent: calcChangePercent(currentAvgOnboarding, prevAvgOnboarding),
      suffix: 'days',
    },
    engagementScore: {
      current: currentEngagement,
      previous: prevEngagement,
      changePercent: calcChangePercent(currentEngagement, prevEngagement),
    },
    avgTimeToFirstAccess: {
      current: currentAvgAccess,
      previous: prevAvgAccess,
      changePercent: calcChangePercent(currentAvgAccess, prevAvgAccess),
      suffix: 'days',
    },
  }
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

function getCompletionTimes(spaces: any[], activities: any[]) {
  const results: { spaceId: string; days: number; completedAt: Date }[] = []
  const completedSpaces = spaces.filter(s => s.status === 'completed')

  for (const space of completedSpaces) {
    const spaceActivities = activities
      .filter(a => a.space_id === space.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    let activeDate: Date | null = null
    let completedDate: Date | null = null

    for (const activity of spaceActivities) {
      if (activity.metadata?.to === 'active' && !activeDate) {
        activeDate = new Date(activity.created_at)
      }
      if (activity.metadata?.to === 'completed') {
        completedDate = new Date(activity.created_at)
      }
    }

    if (activeDate && completedDate) {
      const days = Math.round((completedDate.getTime() - activeDate.getTime()) / MS_PER_DAY * 10) / 10
      if (days >= 0) {
        results.push({ spaceId: space.id, days, completedAt: completedDate })
      }
    }
  }

  return results
}

function getFirstAccessTimes(members: any[], visits: any[]) {
  const results: { days: number; invitedAt: Date }[] = []

  for (const member of members) {
    if (!member.invited_at || !member.invited_email) continue

    // Find first visit for this member in this space
    const memberVisits = visits
      .filter(v => v.space_id === member.space_id && v.visitor_email?.toLowerCase() === member.invited_email?.toLowerCase())
      .sort((a: any, b: any) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime())

    if (memberVisits.length > 0) {
      const inviteDate = new Date(member.invited_at)
      const firstVisit = new Date(memberVisits[0].visited_at)
      const days = Math.round((firstVisit.getTime() - inviteDate.getTime()) / MS_PER_DAY * 10) / 10
      if (days >= 0) {
        results.push({ days, invitedAt: inviteDate })
      }
    }
  }

  return results
}

function calcChangePercent(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// === Portal Activity (daily buckets over 90 days) ===

function calculatePortalActivity(
  visits: any[],
  customerActivities: any[],
  startDate: Date,
  endDate: Date,
): PortalActivityDay[] {
  const days: PortalActivityDay[] = []

  // Generate daily buckets
  let current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  while (current <= end) {
    const dayStart = new Date(current)
    const dayEnd = new Date(current)
    dayEnd.setHours(23, 59, 59, 999)

    const dayVisits = visits.filter(v => {
      const visitDate = new Date(v.visited_at)
      return visitDate >= dayStart && visitDate <= dayEnd
    })

    const dayActivities = customerActivities.filter(a => {
      const activityDate = new Date(a.created_at)
      return activityDate >= dayStart && activityDate <= dayEnd
    })

    days.push({
      date: format(current, 'yyyy-MM-dd'),
      visits: dayVisits.length,
      activities: dayActivities.length,
    })

    current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
  }

  return days
}

// === Onboarding Velocity ===

function calculateOnboardingVelocity(spaces: any[], activities: any[]): OnboardingBucket[] {
  const completionTimes = getCompletionTimes(spaces, activities)

  const buckets: Record<string, number> = {
    '< 2 weeks': 0,
    '2-4 weeks': 0,
    '1-2 months': 0,
    '2+ months': 0,
  }

  for (const ct of completionTimes) {
    if (ct.days < 14) {
      buckets['< 2 weeks']++
    } else if (ct.days < 28) {
      buckets['2-4 weeks']++
    } else if (ct.days < 60) {
      buckets['1-2 months']++
    } else {
      buckets['2+ months']++
    }
  }

  return Object.entries(buckets).map(([bucket, count]) => ({
    bucket,
    Spaces: count,
  }))
}

