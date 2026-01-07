'use client'

import { useState } from 'react'
import { GroupedTasks } from '@/app/(app)/tasks/actions'
import { TaskColumn } from './task-column'
import { TasksTable } from './tasks-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LayoutGrid, List, SlidersHorizontal, Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface TaskDashboardProps {
  groupedTasks: GroupedTasks
}

export function TaskDashboard({ groupedTasks }: TaskDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'me'>('me')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open'>('open')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const totalTasks = groupedTasks.overdue.length + groupedTasks.upcoming.length + groupedTasks.noDueDate.length
  const allTasks = [...groupedTasks.overdue, ...groupedTasks.upcoming, ...groupedTasks.noDueDate]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Task Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Stay on top of due dates and manage tasks.
        </p>
      </div>

      {/* Filters and View Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {viewMode === 'list' && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <Select value={filter} onValueChange={(v: 'all' | 'me') => setFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">
                <div className="flex items-center gap-2">
                  <span>Project owners</span>
                  <span className="text-[10px] bg-primary text-primary-foreground px-1 py-0.5 rounded font-medium">Me</span>
                </div>
              </SelectItem>
              <SelectItem value="all">All owners</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: 'all' | 'open') => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open tasks</SelectItem>
              <SelectItem value="all">All tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="size-4 mr-2" />
            Filters
          </Button>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* View-specific content */}
      {viewMode === 'grid' ? (
        <>
          {/* Task Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn
              title="Overdue"
              count={groupedTasks.overdue.length}
              tasks={groupedTasks.overdue}
              emptyIcon="📅"
              emptyMessage="No overdue tasks"
              emptySubtext="Good job, you did not miss a deadline."
              variant="danger"
            />
            <TaskColumn
              title="Upcoming Due Dates"
              count={groupedTasks.upcoming.length}
              tasks={groupedTasks.upcoming}
              variant="info"
            />
            <TaskColumn
              title="Tasks Without Due Date"
              count={groupedTasks.noDueDate.length}
              tasks={groupedTasks.noDueDate}
              variant="warning"
            />
          </div>
        </>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{groupedTasks.overdue.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Due Dates</p>
                <p className="text-2xl font-bold">{groupedTasks.upcoming.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div>
                <p className="text-sm text-muted-foreground">Next Task Without Due Date</p>
                <p className="text-2xl font-bold">{groupedTasks.noDueDate.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div>
                <p className="text-sm text-muted-foreground">All open tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          <TasksTable tasks={allTasks} />
        </>
      )}
    </div>
  )
}
