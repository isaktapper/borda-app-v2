import { createClient } from '@/lib/supabase/server'

export interface EngagementScoreResult {
  score: number
  level: 'high' | 'medium' | 'low' | 'none'
  factors: {
    visits: { score: number; count: number }
    tasks: { score: number; completed: number; total: number }
    formFields: { score: number; answered: number; total: number }
    files: { score: number; uploaded: number; total: number }
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

  // Get all pages for this project
  const { data: pages } = await supabase
    .from('pages')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!pages || pages.length === 0) {
    return { completed: 0, total: 0 }
  }

  const pageIds = pages.map(p => p.id)

  // Get all task blocks
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, content')
    .in('page_id', pageIds)
    .eq('type', 'task')
    .is('deleted_at', null)

  if (!blocks || blocks.length === 0) {
    return { completed: 0, total: 0 }
  }

  // Count total tasks across all task blocks
  let totalTasks = 0
  const tasksByBlock: { [blockId: string]: number } = {}

  for (const block of blocks) {
    const content = block.content as any
    const tasks = content?.tasks || []
    totalTasks += tasks.length
    tasksByBlock[block.id] = tasks.length
  }

  if (totalTasks === 0) {
    return { completed: 0, total: 0 }
  }

  const blockIds = blocks.map(b => b.id)

  // Get responses for these blocks to check task statuses
  const { data: responses } = await supabase
    .from('responses')
    .select('block_id, value')
    .in('block_id', blockIds)

  // Count completed tasks
  let completedTasks = 0

  for (const response of responses || []) {
    const value = response.value as any
    const tasks = value?.tasks || {}

    // Count tasks with 'completed' status
    completedTasks += Object.values(tasks).filter(status => status === 'completed').length
  }

  return {
    completed: completedTasks,
    total: totalTasks
  }
}

async function getFormFieldStats(projectId: string): Promise<{ answered: number; total: number }> {
  const supabase = await createClient()

  // Get all form blocks for this project
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
    .select('id, content')
    .in('page_id', pageIds)
    .eq('type', 'form')
    .is('deleted_at', null)

  if (!blocks || blocks.length === 0) {
    return { answered: 0, total: 0 }
  }

  // Count total form fields across all form blocks
  let totalFields = 0
  const fieldsByBlock: { [blockId: string]: number } = {}

  for (const block of blocks) {
    const content = block.content as any
    const questions = content?.questions || []
    totalFields += questions.length
    fieldsByBlock[block.id] = questions.length
  }

  if (totalFields === 0) {
    return { answered: 0, total: 0 }
  }

  const blockIds = blocks.map(b => b.id)

  // Get responses for these blocks
  const { data: responses } = await supabase
    .from('responses')
    .select('block_id, value')
    .in('block_id', blockIds)

  // Count answered fields
  let answeredFields = 0

  for (const response of responses || []) {
    const value = response.value as any
    const questions = value?.questions || {}

    // Count how many fields have non-empty answers
    answeredFields += Object.values(questions).filter((answer: any) => {
      if (!answer) return false
      // Check different field types
      if (answer.text && typeof answer.text === 'string') return answer.text.trim() !== ''
      if (answer.selected) {
        if (typeof answer.selected === 'string') return answer.selected.trim() !== ''
        if (Array.isArray(answer.selected)) return answer.selected.length > 0
      }
      return false
    }).length
  }

  return {
    answered: answeredFields,
    total: totalFields
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

export async function calculateEngagementScore(projectId: string): Promise<EngagementScoreResult> {
  // 1. Fetch visits from last 14 days
  const visitCount = await getVisitCount(projectId, 14)

  // 2. Fetch task completion
  const tasks = await getTaskStats(projectId)

  // 3. Fetch form field stats
  const formFields = await getFormFieldStats(projectId)

  // 4. Fetch file upload stats
  const files = await getFileUploadStats(projectId)

  // 5. Calculate partial scores
  // Total: 100 points = Visits (20) + Tasks (30) + Form Fields (30) + Files (20)
  const visitScore = calculateVisitScore(visitCount)
  const taskScore = tasks.total > 0 ? (tasks.completed / tasks.total) * 30 : 0
  const formFieldScore = formFields.total > 0 ? (formFields.answered / formFields.total) * 30 : 0
  const fileScore = files.total > 0 ? (files.uploaded / files.total) * 20 : 0

  // 6. Total
  const totalScore = Math.round(visitScore + taskScore + formFieldScore + fileScore)

  // 7. Determine level
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
      formFields: { score: Math.round(formFieldScore), answered: formFields.answered, total: formFields.total },
      files: { score: Math.round(fileScore), uploaded: files.uploaded, total: files.total },
    },
    calculatedAt: new Date(),
  }
}
