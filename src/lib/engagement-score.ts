import { createClient } from '@/lib/supabase/server'

export interface EngagementScoreResult {
  score: number
  level: 'high' | 'medium' | 'low' | 'none'
  factors: {
    visits: { score: number; count: number }
    tasks: { score: number; completed: number; total: number }
    questions: { score: number; answered: number; total: number }
    files: { score: number; uploaded: number; total: number }
    checklists: { score: number; completed: number; total: number }
  }
  calculatedAt: Date
}

function calculateVisitScore(visits: number): number {
  if (visits === 0) return 0
  if (visits === 1) return 5
  if (visits <= 3) return 10
  if (visits <= 6) return 15
  return 20
}

async function getVisitCount(projectId: string, days: number): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('portal_visits')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('visited_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Error fetching visit count:', error)
    return 0
  }

  return count || 0
}

async function getTaskStats(projectId: string): Promise<{ completed: number; total: number }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId)

  if (error || !data) {
    console.error('Error fetching task stats:', error)
    return { completed: 0, total: 0 }
  }

  const total = data.length
  const completed = data.filter(t => t.status === 'completed').length

  return { completed, total }
}

async function getQuestionStats(projectId: string): Promise<{ answered: number; total: number }> {
  const supabase = await createClient()

  // Get all question blocks for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return { answered: 0, total: 0 }
  }

  const pageIds = pages.map(p => p.id)

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id')
    .in('page_id', pageIds)
    .eq('type', 'question')

  if (!blocks || blocks.length === 0) {
    return { answered: 0, total: 0 }
  }

  const blockIds = blocks.map(b => b.id)

  // Get responses for these blocks
  const { data: responses } = await supabase
    .from('responses')
    .select('block_id')
    .in('block_id', blockIds)

  const answeredCount = new Set(responses?.map(r => r.block_id) || []).size

  return {
    answered: answeredCount,
    total: blocks.length
  }
}

async function getFileUploadStats(projectId: string): Promise<{ uploaded: number; total: number }> {
  const supabase = await createClient()

  // Get all file_upload blocks for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return { uploaded: 0, total: 0 }
  }

  const pageIds = pages.map(p => p.id)

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id')
    .in('page_id', pageIds)
    .eq('type', 'file_upload')

  if (!blocks || blocks.length === 0) {
    return { uploaded: 0, total: 0 }
  }

  const blockIds = blocks.map(b => b.id)

  // Get files for these blocks
  const { data: files } = await supabase
    .from('files')
    .select('block_id')
    .in('block_id', blockIds)
    .is('deleted_at', null)

  const blocksWithFiles = new Set(files?.map(f => f.block_id) || []).size

  return {
    uploaded: blocksWithFiles,
    total: blocks.length
  }
}

async function getChecklistStats(projectId: string): Promise<{ completed: number; total: number }> {
  const supabase = await createClient()

  // Get all checklist blocks for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return { completed: 0, total: 0 }
  }

  const pageIds = pages.map(p => p.id)

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, content')
    .in('page_id', pageIds)
    .eq('type', 'checklist')

  if (!blocks || blocks.length === 0) {
    return { completed: 0, total: 0 }
  }

  const blockIds = blocks.map(b => b.id)

  // Get responses for these blocks
  const { data: responses } = await supabase
    .from('responses')
    .select('block_id, value')
    .in('block_id', blockIds)

  // Count checklists where all items are checked
  let completedCount = 0

  for (const block of blocks) {
    const content = block.content as any
    const items = content?.items || []
    const totalItems = items.length

    if (totalItems === 0) continue

    const response = responses?.find(r => r.block_id === block.id)
    const checkedItems = (response?.value as any)?.checked || []

    if (checkedItems.length === totalItems) {
      completedCount++
    }
  }

  return {
    completed: completedCount,
    total: blocks.length
  }
}

export async function calculateEngagementScore(projectId: string): Promise<EngagementScoreResult> {
  // 1. Hämta besök senaste 14 dagarna
  const visitCount = await getVisitCount(projectId, 14)

  // 2. Hämta task completion
  const tasks = await getTaskStats(projectId)

  // 3. Hämta question stats
  const questions = await getQuestionStats(projectId)

  // 4. Hämta file upload stats
  const files = await getFileUploadStats(projectId)

  // 5. Hämta checklist stats
  const checklists = await getChecklistStats(projectId)

  // 6. Beräkna delpoäng
  const visitScore = calculateVisitScore(visitCount)
  const taskScore = tasks.total > 0 ? (tasks.completed / tasks.total) * 25 : 25
  const questionScore = questions.total > 0 ? (questions.answered / questions.total) * 25 : 25
  const fileScore = files.total > 0 ? (files.uploaded / files.total) * 15 : 15
  const checklistScore = checklists.total > 0 ? (checklists.completed / checklists.total) * 15 : 15

  // 7. Total
  const totalScore = Math.round(visitScore + taskScore + questionScore + fileScore + checklistScore)

  // 8. Bestäm nivå
  let level: 'high' | 'medium' | 'low' | 'none'
  if (visitCount === 0) level = 'none'
  else if (totalScore >= 75) level = 'high'
  else if (totalScore >= 40) level = 'medium'
  else level = 'low'

  return {
    score: totalScore,
    level,
    factors: {
      visits: { score: visitScore, count: visitCount },
      tasks: { score: Math.round(taskScore), completed: tasks.completed, total: tasks.total },
      questions: { score: Math.round(questionScore), answered: questions.answered, total: questions.total },
      files: { score: Math.round(fileScore), uploaded: files.uploaded, total: files.total },
      checklists: { score: Math.round(checklistScore), completed: checklists.completed, total: checklists.total },
    },
    calculatedAt: new Date(),
  }
}
