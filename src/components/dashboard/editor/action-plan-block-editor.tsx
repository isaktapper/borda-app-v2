'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import {
  Plus,
  X,
  GripVertical,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  User,
  Target,
  Lock,
  Link,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockEditorWrapper } from './block-editor-wrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type {
  ActionPlanContent,
  Milestone,
  Task,
  Assignee,
} from '@/types/action-plan'
import {
  createEmptyMilestone,
  createEmptyTask,
  getInitials,
  resetIdCounter,
} from '@/lib/action-plan-utils'

interface ActionPlanBlockEditorProps {
  content: ActionPlanContent
  onChange: (updates: Partial<ActionPlanContent>) => void
  spaceId: string
}

export function ActionPlanBlockEditor({
  content,
  onChange,
  spaceId,
}: ActionPlanBlockEditorProps) {
  const milestones = content.milestones || []
  const permissions = content.permissions || {
    customerCanEdit: true,
    customerCanComplete: true,
  }

  // Reset ID counter when component mounts (for new blocks)
  useEffect(() => {
    if (milestones.length === 0) {
      resetIdCounter()
    }
  }, [])

  const [activeTab, setActiveTab] = useState<'milestones' | 'permissions'>('milestones')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addMilestone = () => {
    const newMilestone = createEmptyMilestone(milestones.length)
    onChange({ milestones: [...milestones, newMilestone] })
  }

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    onChange({
      milestones: milestones.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })
  }

  const removeMilestone = (id: string) => {
    onChange({ milestones: milestones.filter((m) => m.id !== id) })
  }

  const handleMilestoneDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex((m) => m.id === active.id)
      const newIndex = milestones.findIndex((m) => m.id === over.id)

      const reordered = arrayMove(milestones, oldIndex, newIndex).map(
        (m, idx) => ({
          ...m,
          sortOrder: idx,
        })
      )

      onChange({ milestones: reordered })
    }
  }

  const addTask = (milestoneId: string) => {
    const newTask = createEmptyTask()
    onChange({
      milestones: milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, tasks: [...m.tasks, newTask] }
          : m
      ),
    })
  }

  const updateTask = (
    milestoneId: string,
    taskId: string,
    updates: Partial<Task>
  ) => {
    onChange({
      milestones: milestones.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              tasks: m.tasks.map((t) =>
                t.id === taskId ? { ...t, ...updates } : t
              ),
            }
          : m
      ),
    })
  }

  const removeTask = (milestoneId: string, taskId: string) => {
    onChange({
      milestones: milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) }
          : m
      ),
    })
  }

  const handleTaskDragEnd = (milestoneId: string, event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const milestone = milestones.find((m) => m.id === milestoneId)
      if (!milestone) return

      const oldIndex = milestone.tasks.findIndex((t) => t.id === active.id)
      const newIndex = milestone.tasks.findIndex((t) => t.id === over.id)

      const reordered = arrayMove(milestone.tasks, oldIndex, newIndex)

      onChange({
        milestones: milestones.map((m) =>
          m.id === milestoneId ? { ...m, tasks: reordered } : m
        ),
      })
    }
  }

  const updatePermissions = (
    updates: Partial<NonNullable<ActionPlanContent['permissions']>>
  ) => {
    onChange({
      permissions: { ...permissions, ...updates },
    })
  }

  return (
    <BlockEditorWrapper
      blockType="action_plan"
      tabs={[
        { id: 'milestones', label: 'Milestones', icon: Target },
        { id: 'permissions', label: 'Permissions', icon: Lock },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as 'milestones' | 'permissions')}
    >
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleMilestoneDragEnd}
          >
            <SortableContext
              items={milestones.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {milestones.map((milestone) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  onUpdate={updateMilestone}
                  onRemove={removeMilestone}
                  onAddTask={addTask}
                  onUpdateTask={updateTask}
                  onRemoveTask={removeTask}
                  onTaskDragEnd={handleTaskDragEnd}
                  sensors={sensors}
                  spaceId={spaceId}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 border-dashed"
            onClick={addMilestone}
          >
            <Plus className="size-4 mr-2" />
            Add milestone
          </Button>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="space-y-3 bg-grey-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="customer-can-edit" className="text-sm font-medium">
                  Stakeholders can edit
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow stakeholders to edit task details
                </p>
              </div>
              <Switch
                id="customer-can-edit"
                checked={permissions.customerCanEdit}
                onCheckedChange={(checked) =>
                  updatePermissions({ customerCanEdit: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="customer-can-complete" className="text-sm font-medium">
                  Stakeholders can complete tasks
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow stakeholders to mark tasks as complete
                </p>
              </div>
              <Switch
                id="customer-can-complete"
                checked={permissions.customerCanComplete}
                onCheckedChange={(checked) =>
                  updatePermissions({ customerCanComplete: checked })
                }
              />
            </div>
          </div>
        </div>
      )}
    </BlockEditorWrapper>
  )
}

interface MilestoneItemProps {
  milestone: Milestone
  onUpdate: (id: string, updates: Partial<Milestone>) => void
  onRemove: (id: string) => void
  onAddTask: (milestoneId: string) => void
  onUpdateTask: (milestoneId: string, taskId: string, updates: Partial<Task>) => void
  onRemoveTask: (milestoneId: string, taskId: string) => void
  onTaskDragEnd: (milestoneId: string, event: DragEndEvent) => void
  sensors: any
  spaceId: string
}

function MilestoneItem({
  milestone,
  onUpdate,
  onRemove,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onTaskDragEnd,
  sensors,
  spaceId,
}: MilestoneItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-grey-50 overflow-hidden"
    >
      <div className="flex items-start gap-2 p-3 bg-grey-100">
        <div {...attributes} {...listeners} className="pt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="size-4 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </Button>

            <Input
              value={milestone.title}
              onChange={(e) => onUpdate(milestone.id, { title: e.target.value })}
              placeholder="Milestone title..."
              className="border-none p-0 h-auto text-sm font-semibold focus-visible:ring-0 bg-transparent"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2 text-xs gap-1 shrink-0',
                    !milestone.dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="size-3" />
                  {milestone.dueDate
                    ? format(new Date(milestone.dueDate), 'd MMM')
                    : 'Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={
                    milestone.dueDate ? new Date(milestone.dueDate) : undefined
                  }
                  onSelect={(date) =>
                    onUpdate(milestone.id, { dueDate: date?.toISOString() })
                  }
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => onRemove(milestone.id)}
            >
              <X className="size-3" />
            </Button>
          </div>

          {milestone.description !== undefined && (
            <Textarea
              value={milestone.description}
              onChange={(e) =>
                onUpdate(milestone.id, { description: e.target.value })
              }
              placeholder="Milestone description (optional)..."
              className="text-xs resize-none min-h-[60px]"
            />
          )}

          {milestone.description === undefined && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => onUpdate(milestone.id, { description: '' })}
            >
              + Add description
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => onTaskDragEnd(milestone.id, event)}
          >
            <SortableContext
              items={milestone.tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {milestone.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  milestoneId={milestone.id}
                  onUpdate={onUpdateTask}
                  onRemove={onRemoveTask}
                  spaceId={spaceId}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 border border-dashed"
            onClick={() => onAddTask(milestone.id)}
          >
            <Plus className="size-3 mr-2" />
            Add task
          </Button>
        </div>
      )}
    </div>
  )
}

interface TaskItemProps {
  task: Task
  milestoneId: string
  onUpdate: (milestoneId: string, taskId: string, updates: Partial<Task>) => void
  onRemove: (milestoneId: string, taskId: string) => void
  spaceId: string
}

function TaskItem({
  task,
  milestoneId,
  onUpdate,
  onRemove,
  spaceId,
}: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 px-1 hover:bg-grey-100 rounded group transition-colors"
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="size-3 text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <Checkbox disabled className="size-4" />

      {/* Task title - takes up remaining space */}
      <div className="flex-1 min-w-0">
        <Input
          value={task.title}
          onChange={(e) => onUpdate(milestoneId, task.id, { title: e.target.value })}
          placeholder="Task title..."
          className="border-none p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent"
        />
      </div>

      {/* Assignee picker */}
      <AssigneePicker
        assignee={task.assignee}
        onSelect={(assignee) =>
          onUpdate(milestoneId, task.id, { assignee })
        }
        spaceId={spaceId}
      />

      {/* Due date picker - icon only */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 p-0',
              task.dueDate ? 'text-foreground' : 'text-muted-foreground'
            )}
            title={task.dueDate ? format(new Date(task.dueDate), 'd MMM yyyy') : 'Add date'}
          >
            <CalendarIcon className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={task.dueDate ? new Date(task.dueDate) : undefined}
            onSelect={(date) =>
              onUpdate(milestoneId, task.id, { dueDate: date?.toISOString() })
            }
          />
        </PopoverContent>
      </Popover>

      {/* Link - placeholder for future functionality */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground"
        title="Add link (coming soon)"
        disabled
      >
        <Link className="size-3.5" />
      </Button>

      {/* Description button */}
      {task.description !== undefined ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
            >
              📝
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Task Description</Label>
              <Textarea
                value={task.description}
                onChange={(e) =>
                  onUpdate(milestoneId, task.id, { description: e.target.value })
                }
                placeholder="Enter task description..."
                className="text-xs resize-none min-h-[80px]"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive"
                onClick={() =>
                  onUpdate(milestoneId, task.id, { description: undefined })
                }
              >
                Remove description
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover:opacity-100"
          onClick={() => onUpdate(milestoneId, task.id, { description: '' })}
        >
          <Plus className="size-3" />
        </Button>
      )}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={() => onRemove(milestoneId, task.id)}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

interface AssigneePickerProps {
  assignee?: Assignee
  onSelect: (assignee: Assignee | undefined) => void
  spaceId: string
}

function AssigneePicker({ assignee, onSelect, spaceId }: AssigneePickerProps) {
  const [showExternalDialog, setShowExternalDialog] = useState(false)
  const [externalName, setExternalName] = useState('')
  const [externalEmail, setExternalEmail] = useState('')

  const handleAddExternal = () => {
    if (!externalName.trim()) return

    onSelect({
      type: 'external',
      name: externalName.trim(),
      email: externalEmail.trim() || undefined,
    })

    setExternalName('')
    setExternalEmail('')
    setShowExternalDialog(false)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1',
              assignee ? 'px-2' : 'w-7 p-0',
              !assignee && 'text-muted-foreground'
            )}
            title={assignee ? assignee.name : 'Assign person'}
          >
            {assignee ? (
              <>
                <Avatar className="size-4">
                  {assignee.avatarUrl && (
                    <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                  )}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[80px] truncate text-xs">{assignee.name}</span>
              </>
            ) : (
              <User className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            {assignee && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-destructive"
                onClick={() => onSelect(undefined)}
              >
                <X className="size-3 mr-2" />
                Remove assignee
              </Button>
            )}

            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Quick assign
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => setShowExternalDialog(true)}
            >
              <Plus className="size-3 mr-2" />
              Add external person
            </Button>

            <div className="text-xs text-muted-foreground px-2 py-1 mt-2">
              Note: Staff and stakeholder selection will be implemented with space members fetch
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showExternalDialog} onOpenChange={setShowExternalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Person</DialogTitle>
            <DialogDescription>
              Assign this task to someone outside your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="external-name">Name *</Label>
              <Input
                id="external-name"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                placeholder="Enter name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external-email">Email (optional)</Label>
              <Input
                id="external-email"
                type="email"
                value={externalEmail}
                onChange={(e) => setExternalEmail(e.target.value)}
                placeholder="Enter email..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExternalDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddExternal} disabled={!externalName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
