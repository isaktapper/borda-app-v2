import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTaskReminderEmail, wasTaskReminderSentToday } from '@/lib/email'
import type { ActionPlanContent } from '@/types/action-plan'

interface TaskWithEmail {
  email: string
  task: {
    id: string
    title: string
    description?: string
    dueDate?: string
  }
  spaceName: string
  spaceId: string
  organizationId: string
  recipientUserId?: string
  recipientMemberId?: string
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
  const forceAll = searchParams.get('force') === 'true'

  try {
    const supabase = await createAdminClient()

    // Only tasks due TODAY
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

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
            status,
            organization_id
          )
        )
      `)
      .eq('type', 'action_plan')
      .eq('pages.spaces.status', 'active')

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
    const blockIds = blocks.map((b) => b.id)
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

    // 3. Fetch staff emails
    const { data: users } = await supabase.from('users').select('id, email')

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

    // 5. Extract tasks due today with email assignees
    const tasksWithEmails: TaskWithEmail[] = []

    for (const block of blocks) {
      const content = block.content as ActionPlanContent
      const page = block.pages as unknown as {
        id: string
        space_id: string
        spaces: { id: string; name: string; status: string; organization_id: string }
      }
      const space = page.spaces
      const spaceId = space.id
      const spaceName = space.name
      const organizationId = space.organization_id

      const taskStatuses = responseMap.get(block.id) || {}

      for (const milestone of content.milestones || []) {
        for (const task of milestone.tasks || []) {
          // Check if task has a due date for today (skip check if force mode)
          if (!forceAll) {
            if (!task.dueDate) continue
            if (task.dueDate !== todayStr) continue
          }

          // Check if task is not completed
          const compositeId = `${milestone.id}-${task.id}`
          const status = taskStatuses[compositeId] || 'pending'
          if (status === 'completed') continue

          // Check if task has an assignee with email
          if (!task.assignee) continue

          let email: string | undefined
          let recipientUserId: string | undefined
          let recipientMemberId: string | undefined

          if (task.assignee.type === 'staff' && task.assignee.staffId) {
            email = userEmailMap.get(task.assignee.staffId)
            recipientUserId = task.assignee.staffId
          } else if (task.assignee.type === 'stakeholder' && task.assignee.stakeholderId) {
            email = stakeholderEmailMap.get(task.assignee.stakeholderId)
            recipientMemberId = task.assignee.stakeholderId
          } else if (task.assignee.email) {
            email = task.assignee.email
          }

          if (!email) continue

          tasksWithEmails.push({
            email,
            task: {
              id: compositeId,
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
            },
            spaceName,
            spaceId,
            organizationId,
            recipientUserId,
            recipientMemberId,
          })
        }
      }
    }

    if (tasksWithEmails.length === 0) {
      return NextResponse.json({ message: 'No tasks due today', sent: 0 })
    }

    // 6. Group tasks by email and space
    const tasksByEmailAndSpace = new Map<
      string,
      Map<
        string,
        {
          spaceName: string
          spaceId: string
          organizationId: string
          recipientUserId?: string
          recipientMemberId?: string
          tasks: TaskWithEmail['task'][]
        }
      >
    >()

    for (const taskWithEmail of tasksWithEmails) {
      if (!tasksByEmailAndSpace.has(taskWithEmail.email)) {
        tasksByEmailAndSpace.set(taskWithEmail.email, new Map())
      }

      const spaceMap = tasksByEmailAndSpace.get(taskWithEmail.email)!

      if (!spaceMap.has(taskWithEmail.spaceId)) {
        spaceMap.set(taskWithEmail.spaceId, {
          spaceName: taskWithEmail.spaceName,
          spaceId: taskWithEmail.spaceId,
          organizationId: taskWithEmail.organizationId,
          recipientUserId: taskWithEmail.recipientUserId,
          recipientMemberId: taskWithEmail.recipientMemberId,
          tasks: [],
        })
      }

      spaceMap.get(taskWithEmail.spaceId)!.tasks.push(taskWithEmail.task)
    }

    // 7. Send emails (with deduplication)
    let emailsSent = 0
    let emailsSkipped = 0

    for (const [email, spaceMap] of tasksByEmailAndSpace) {
      for (const [spaceId, spaceData] of spaceMap) {
        // Check if we already sent a reminder today for this email + space + dueDate
        const alreadySent = await wasTaskReminderSentToday(email, spaceId, todayStr)

        if (alreadySent) {
          emailsSkipped++
          continue
        }

        const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/space/${spaceId}/shared`

        try {
          await sendTaskReminderEmail({
            to: email,
            spaceId,
            spaceName: spaceData.spaceName,
            organizationId: spaceData.organizationId,
            recipientUserId: spaceData.recipientUserId,
            recipientMemberId: spaceData.recipientMemberId,
            tasks: spaceData.tasks,
            portalLink,
            dueDate: todayStr,
          })

          emailsSent++
        } catch (emailError) {
          console.error(`Failed to send reminder to ${email}:`, emailError)
        }
      }
    }

    return NextResponse.json({
      message: 'Task reminders processed',
      sent: emailsSent,
      skipped: emailsSkipped,
      tasksProcessed: tasksWithEmails.length,
      dueDate: todayStr,
    })
  } catch (error) {
    console.error('Error in task reminders cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
