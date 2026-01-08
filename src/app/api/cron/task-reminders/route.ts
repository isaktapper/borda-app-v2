import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { taskReminderTemplate } from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createAdminClient()

    // Calculate tomorrow's date (for due_date comparison)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    // Fetch tasks that are due tomorrow and not completed
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        page_id,
        pages!inner(
          id,
          space_id,
          projects!inner(
            id,
            name,
            status,
            project_members!inner(
              invited_email,
              role
            )
          )
        )
      `)
      .eq('status', 'pending')
      .eq('due_date', tomorrowDate)
      .eq('pages.projects.status', 'active')
      .eq('pages.projects.project_members.role', 'customer')

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: 'No tasks due tomorrow', sent: 0 })
    }

    // Group tasks by customer email and project
    interface ProjectData {
      projectName: string
      spaceId: string
      tasks: Array<{
        title: string
        description?: string
        due_date?: string
      }>
    }

    const tasksByCustomer = new Map<string, Map<string, ProjectData>>()

    for (const task of tasks) {
      const project = (task as any).pages.projects
      const members = project.project_members

      if (!members || members.length === 0) continue

      for (const member of members) {
        if (!member.invited_email) continue

        if (!tasksByCustomer.has(member.invited_email)) {
          tasksByCustomer.set(member.invited_email, new Map())
        }

        const customerProjects = tasksByCustomer.get(member.invited_email)!

        if (!customerProjects.has(project.id)) {
          customerProjects.set(project.id, {
            projectName: project.name,
            spaceId: project.id,
            tasks: []
          })
        }

        customerProjects.get(project.id)!.tasks.push({
          title: task.title,
          description: task.description,
          due_date: task.due_date
        })
      }
    }

    // Send emails
    let emailsSent = 0

    for (const [email, projects] of tasksByCustomer) {
      for (const [spaceId, projectData] of projects) {
        const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/space/${spaceId}/shared`

        await sendEmail({
          to: email,
          subject: `Reminder: ${projectData.tasks.length} task${projectData.tasks.length > 1 ? 'er' : ''}  to complete`,
          html: taskReminderTemplate({
            tasks: projectData.tasks,
            projectName: projectData.projectName,
            portalLink
          }),
          type: 'task_reminder',
          metadata: {
            spaceId,
            taskCount: projectData.tasks.length,
            dueDate: tomorrowDate
          }
        })

        emailsSent++
      }
    }

    return NextResponse.json({
      message: 'Task reminders sent',
      sent: emailsSent,
      tasksProcessed: tasks.length
    })
  } catch (error) {
    console.error('Error in task reminders cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
