'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateEngagementScore } from '@/lib/engagement-score'
import type { EngagementScoreResult } from '@/lib/engagement-score'

export async function getProjectEngagement(projectId: string): Promise<EngagementScoreResult | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // First check if we have cached engagement data
  const { data: project } = await supabase
    .from('projects')
    .select('engagement_score, engagement_level, engagement_calculated_at, engagement_factors')
    .eq('id', projectId)
    .single()

  // If we have cached data that's recent (less than 1 hour old), return it
  if (
    project?.engagement_score !== null &&
    project?.engagement_level !== null &&
    project?.engagement_calculated_at &&
    project?.engagement_factors
  ) {
    const calculatedAt = new Date(project.engagement_calculated_at)
    const hoursSinceCalculation = (Date.now() - calculatedAt.getTime()) / (1000 * 60 * 60)

    // If less than 1 hour old, return cached data with factors
    if (hoursSinceCalculation < 1) {
      return {
        score: project.engagement_score,
        level: project.engagement_level as 'high' | 'medium' | 'low' | 'none',
        factors: project.engagement_factors as any,
        calculatedAt
      }
    }
  }

  // Otherwise calculate fresh score
  try {
    const engagement = await calculateEngagementScore(projectId)

    // Cache the results including factors
    await supabase
      .from('projects')
      .update({
        engagement_score: engagement.score,
        engagement_level: engagement.level,
        engagement_calculated_at: engagement.calculatedAt.toISOString(),
        engagement_factors: engagement.factors
      })
      .eq('id', projectId)

    return engagement
  } catch (error) {
    console.error('Error calculating engagement score:', error)
    return null
  }
}
