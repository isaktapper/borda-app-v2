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
  Zap,
  Info,
  ExternalLink,
  FileText,
  Layers,
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
  QuickAction,
  QuickActionType,
} from '@/types/action-plan'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createEmptyMilestone,
  createEmptyTask,
  getInitials,
  resetIdCounter,
} from '@/lib/action-plan-utils'
import { getPages } from '@/app/(app)/spaces/[spaceId]/pages-actions'
import { getBlocks } from '@/app/(app)/spaces/[spaceId]/block-actions'

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

  const [activeTab, setActiveTab] = useState<'info' | 'milestones' | 'permissions'>('info')

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
        { id: 'info', label: 'Info', icon: Info },
        { id: 'milestones', label: 'Milestones', icon: Target },
        { id: 'permissions', label: 'Permissions', icon: Lock },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as 'info' | 'milestones' | 'permissions')}
    >
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action-plan-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="action-plan-title"
              placeholder="e.g., Proposed next steps"
              value={content.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-plan-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="action-plan-description"
              placeholder="Add a description for this action plan..."
              value={content.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      )}

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
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <Input
          value={task.title}
          onChange={(e) => onUpdate(milestoneId, task.id, { title: e.target.value })}
          placeholder="Task title..."
          className="border-none p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent flex-1"
        />
        {task.quickAction && (
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
            {task.quickAction.title}
          </span>
        )}
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

      {/* Quick Action */}
      <QuickActionPicker
        quickAction={task.quickAction}
        onUpdate={(quickAction) =>
          onUpdate(milestoneId, task.id, { quickAction })
        }
        spaceId={spaceId}
      />

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

// ============================================================================
// Quick Action Picker
// ============================================================================

interface QuickActionPickerProps {
  quickAction?: QuickAction
  onUpdate: (quickAction: QuickAction | undefined) => void
  spaceId: string
}

function QuickActionPicker({ quickAction, onUpdate, spaceId }: QuickActionPickerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [actionType, setActionType] = useState<QuickActionType>('link')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [pageId, setPageId] = useState('')
  const [blockId, setBlockId] = useState('')
  const [pages, setPages] = useState<{ id: string; title: string }[]>([])
  const [blocks, setBlocks] = useState<{ id: string; type: string; title: string }[]>([])
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false)

  // Fetch pages when dialog opens
  useEffect(() => {
    if (showDialog && pages.length === 0) {
      fetchPages()
    }
  }, [showDialog])

  // Fetch blocks when page is selected
  useEffect(() => {
    if (pageId && actionType === 'go_to_block') {
      fetchBlocks(pageId)
    }
  }, [pageId, actionType])

  const fetchPages = async () => {
    setIsLoadingPages(true)
    try {
      const pagesData = await getPages(spaceId)
      setPages(pagesData.map((p: any) => ({ id: p.id, title: p.title })))
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    } finally {
      setIsLoadingPages(false)
    }
  }

  const fetchBlocks = async (selectedPageId: string) => {
    setIsLoadingBlocks(true)
    try {
      const blocksData = await getBlocks(selectedPageId)
      setBlocks(blocksData.map((b: any) => ({
        id: b.id,
        type: b.type,
        title: getBlockDisplayTitle(b)
      })))
    } catch (error) {
      console.error('Failed to fetch blocks:', error)
    } finally {
      setIsLoadingBlocks(false)
    }
  }

  const getBlockDisplayTitle = (block: any): string => {
    if (block.content?.title) return block.content.title
    if (block.type === 'text') {
      const html = block.content?.html || ''
      const text = html.replace(/<[^>]*>/g, '').trim()
      return text.slice(0, 30) || 'Text block'
    }
    return `${block.type} block`
  }

  const handleOpen = () => {
    // Pre-fill form if editing existing quick action
    if (quickAction) {
      setActionType(quickAction.type)
      setTitle(quickAction.title)
      setUrl(quickAction.url || '')
      setPageId(quickAction.pageId || '')
      setBlockId(quickAction.blockId || '')
    } else {
      setActionType('link')
      setTitle('')
      setUrl('')
      setPageId('')
      setBlockId('')
    }
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!title.trim()) return

    const newQuickAction: QuickAction = {
      type: actionType,
      title: title.trim(),
    }

    if (actionType === 'link' && url.trim()) {
      newQuickAction.url = url.trim()
    } else if (actionType === 'go_to_page' && pageId) {
      newQuickAction.pageId = pageId
    } else if (actionType === 'go_to_block' && pageId && blockId) {
      newQuickAction.pageId = pageId
      newQuickAction.blockId = blockId
    }

    onUpdate(newQuickAction)
    setShowDialog(false)
  }

  const handleRemove = () => {
    onUpdate(undefined)
    setShowDialog(false)
  }

  const isValid = () => {
    if (!title.trim()) return false
    if (actionType === 'link') return !!url.trim()
    if (actionType === 'go_to_page') return !!pageId
    if (actionType === 'go_to_block') return !!pageId && !!blockId
    return false
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 w-7 p-0',
          quickAction ? 'text-primary' : 'text-muted-foreground'
        )}
        title={quickAction ? `Quick Action: ${quickAction.title}` : 'Add Quick Action'}
        onClick={handleOpen}
      >
        <Zap className="size-3.5" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              Quick Action
            </DialogTitle>
            <DialogDescription>
              Add a button that customers can click to navigate or open a link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Type Selection */}
            <div className="space-y-2">
              <Label>Action Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('link')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                    actionType === 'link'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <ExternalLink className="size-5" />
                  <span className="text-xs font-medium">Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('go_to_page')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                    actionType === 'go_to_page'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <FileText className="size-5" />
                  <span className="text-xs font-medium">Go to Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('go_to_block')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                    actionType === 'go_to_block'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Layers className="size-5" />
                  <span className="text-xs font-medium">Go to Block</span>
                </button>
              </div>
            </div>

            {/* Button Title */}
            <div className="space-y-2">
              <Label htmlFor="qa-title">Button Title</Label>
              <Input
                id="qa-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Open Dashboard, View Details..."
              />
            </div>

            {/* Link-specific fields */}
            {actionType === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="qa-url">URL</Label>
                <Input
                  id="qa-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Go to Page fields */}
            {actionType === 'go_to_page' && (
              <div className="space-y-2">
                <Label>Select Page</Label>
                <Select value={pageId} onValueChange={setPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPages ? 'Loading...' : 'Choose a page'} />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Go to Block fields */}
            {actionType === 'go_to_block' && (
              <>
                <div className="space-y-2">
                  <Label>Select Page</Label>
                  <Select value={pageId} onValueChange={(val) => { setPageId(val); setBlockId(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPages ? 'Loading...' : 'Choose a page'} />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {pageId && (
                  <div className="space-y-2">
                    <Label>Select Block</Label>
                    <Select value={blockId} onValueChange={setBlockId}>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingBlocks ? 'Loading...' : 'Choose a block'} />
                      </SelectTrigger>
                      <SelectContent>
                        {blocks.map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {quickAction && (
              <Button
                variant="ghost"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid()}>
              {quickAction ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
