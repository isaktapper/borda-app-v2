import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { taskReminderTemplate } from '@/lib/email/templates'
import type { ActionPlanContent, Task } from '@/types/action-plan'

interface TaskWithEmail {
  email: string
  task: {
    title: string
    description?: string
    due_date?: string
  }
  spaceName: string
  spaceId: string
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional: Test mode parameters
  const { searchParams } = new URL(request.url)
  const testSpaceId = searchParams.get('spaceId')
  const forceAll = searchParams.get('force') === 'true' // Ignore date filter for testing

  try {
    const supabase = await createAdminClient()

    // Calculate today and tomorrow dates
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // 1. Fetch all action_plan blocks from active spaces
    let query = supabase
      .from('blocks')
      .select(`
        id,
        content,
        pages!inner (
          id,
          space_id,
          spaces!inner (
            id,
            name,
            status
          )
        )
      `)
      .eq('type', 'action_plan')
      .eq('pages.spaces.status', 'active')

    // Filter by specific space if testing
    if (testSpaceId) {
      query = query.eq('pages.space_id', testSpaceId)
    }

    const { data: blocks, error: blocksError } = await query

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError)
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 })
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ message: 'No action plan blocks found', sent: 0 })
    }

    // 2. Fetch task responses to check completion status
    const blockIds = blocks.map(b => b.id)
    const { data: responses } = await supabase
      .from('responses')
      .select('block_id, value')
      .in('block_id', blockIds)

    const responseMap = new Map<string, Record<string, string>>()
    for (const response of responses || []) {
      if (response.value?.tasks) {
        responseMap.set(response.block_id, response.value.tasks)
      }
    }

    // 3. Fetch staff emails for staff assignees
    const { data: users } = await supabase
      .from('users')
      .select('id, email')

    const userEmailMap = new Map<string, string>()
    for (const user of users || []) {
      if (user.email) {
        userEmailMap.set(user.id, user.email)
      }
    }

    // 4. Fetch stakeholder emails
    const { data: stakeholders } = await supabase
      .from('space_members')
      .select('id, invited_email')
      .eq('role', 'stakeholder')

    const stakeholderEmailMap = new Map<string, string>()
    for (const stakeholder of stakeholders || []) {
      if (stakeholder.invited_email) {
        stakeholderEmailMap.set(stakeholder.id, stakeholder.invited_email)
      }
    }

    // 5. Extract tasks due today or tomorrow with email assignees
    const tasksWithEmails: TaskWithEmail[] = []

    for (const block of blocks) {
      const content = block.content as ActionPlanContent
      const page = block.pages as any
      const space = page.spaces
      const spaceId = space.id
      const spaceName = space.name

      const taskStatuses = responseMap.get(block.id) || {}

      for (const milestone of content.milestones || []) {
        for (const task of milestone.tasks || []) {
          // Check if task has a due date for today or tomorrow (skip check if force mode)
          if (!forceAll) {
            if (!task.dueDate) continue
            if (task.dueDate !== todayStr && task.dueDate !== tomorrowStr) continue
          }

          // Check if task is not completed
          const compositeId = `${milestone.id}-${task.id}`
          const status = taskStatuses[compositeId] || 'pending'
          if (status === 'completed') continue

          // Check if task has an assignee with email
          if (!task.assignee) continue

          let email: string | undefined

          if (task.assignee.type === 'staff' && task.assignee.staffId) {
            email = userEmailMap.get(task.assignee.staffId)
          } else if (task.assignee.type === 'stakeholder' && task.assignee.stakeholderId) {
            email = stakeholderEmailMap.get(task.assignee.stakeholderId)
          } else if (task.assignee.email) {
            // Fallback to email stored directly on assignee
            email = task.assignee.email
          }

          if (!email) continue

          tasksWithEmails.push({
            email,
            task: {
              title: task.title,
              description: task.description,
              due_date: task.dueDate
            },
            spaceName,
            spaceId
          })
        }
      }
    }

    if (tasksWithEmails.length === 0) {
      return NextResponse.json({ message: 'No tasks due today or tomorrow', sent: 0 })
    }

    // 6. Group tasks by email and space
    const tasksByEmailAndSpace = new Map<string, Map<string, {
      spaceName: string
      spaceId: string
      tasks: TaskWithEmail['task'][]
    }>>()

    for (const taskWithEmail of tasksWithEmails) {
      if (!tasksByEmailAndSpace.has(taskWithEmail.email)) {
        tasksByEmailAndSpace.set(taskWithEmail.email, new Map())
      }

      const spaceMap = tasksByEmailAndSpace.get(taskWithEmail.email)!

      if (!spaceMap.has(taskWithEmail.spaceId)) {
        spaceMap.set(taskWithEmail.spaceId, {
          spaceName: taskWithEmail.spaceName,
          spaceId: taskWithEmail.spaceId,
          tasks: []
        })
      }

      spaceMap.get(taskWithEmail.spaceId)!.tasks.push(taskWithEmail.task)
    }

    // 7. Send emails
    let emailsSent = 0

    for (const [email, spaceMap] of tasksByEmailAndSpace) {
      for (const [spaceId, spaceData] of spaceMap) {
        const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/space/${spaceId}/shared`

        try {
          await sendEmail({
            to: email,
            subject: `Reminder: ${spaceData.tasks.length} task${spaceData.tasks.length > 1 ? 's' : ''} due soon`,
            html: taskReminderTemplate({
              tasks: spaceData.tasks,
              projectName: spaceData.spaceName,
              portalLink
            }),
            type: 'task_reminder',
            metadata: {
              spaceId,
              taskCount: spaceData.tasks.length
            }
          })

          emailsSent++
        } catch (emailError) {
          console.error(`Failed to send reminder to ${email}:`, emailError)
        }
      }
    }

    return NextResponse.json({
      message: 'Task reminders sent',
      sent: emailsSent,
      tasksProcessed: tasksWithEmails.length
    })
  } catch (error) {
    console.error('Error in task reminders cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
