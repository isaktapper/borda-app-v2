import { getTasks } from './actions'
import { TaskDashboard } from '@/components/dashboard/tasks/task-dashboard'

export default async function TasksPage() {
  const groupedTasks = await getTasks()

  return <TaskDashboard groupedTasks={groupedTasks} />
}
