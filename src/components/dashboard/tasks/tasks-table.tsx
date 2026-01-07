'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Task, toggleTaskStatus } from '@/app/(app)/tasks/actions'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TasksTableProps {
  tasks: Task[]
}

type SortField = 'title' | 'project_id' | 'due_date' | 'status'
type SortOrder = 'asc' | 'desc' | null

export function TasksTable({ tasks }: TasksTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField | null>('due_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      } else {
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedTasks = useMemo(() => {
    if (!sortField || !sortOrder) return tasks

    return [...tasks].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle null values
      if (aValue === null) return 1
      if (bValue === null) return -1

      if (sortField === 'due_date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [tasks, sortField, sortOrder])

  const handleToggleTask = async (taskId: string) => {
    setTogglingTaskId(taskId)
    await toggleTaskStatus(taskId)
    router.refresh()
    setTogglingTaskId(null)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-8 px-2 -ml-2"
    >
      {children}
      {sortField === field ? (
        sortOrder === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>
              <SortButton field="title">Task</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="project_id">Project</SortButton>
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Last Visit</TableHead>
            <TableHead>
              <SortButton field="due_date">Due Date</SortButton>
            </TableHead>
            <TableHead>Assignees</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => (
              <TableRow key={task.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleTask(task.id)}
                    disabled={togglingTaskId === task.id}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/projects/${task.project_id}`}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{task.project?.name || 'Unknown Project'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {task.project?.client_logo_url && (
                        <AvatarImage src={task.project.client_logo_url} className="object-contain" />
                      )}
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {task.project?.client_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.project?.client_name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">-</span>
                </TableCell>
                <TableCell>
                  {task.due_date ? (
                    <span className="text-sm">
                      {format(new Date(task.due_date), 'd MMM yyyy')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">-</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
