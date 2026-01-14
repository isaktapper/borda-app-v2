'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Plus,
    Trash2,
    GripVertical,
    Check,
    ArrowRight,
    Circle,
    Calendar as CalendarIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockEditorWrapper } from './block-editor-wrapper'
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
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

// ============================================================================
// Types
// ============================================================================

interface TimelinePhase {
    id: string
    title: string
    description?: string
    date?: string
    status: 'completed' | 'current' | 'upcoming'
}

interface TimelineBlockContent {
    title?: string
    description?: string
    phases: TimelinePhase[]
    showDates: boolean
}

interface TimelineBlockEditorProps {
    content: TimelineBlockContent
    onChange: (content: TimelineBlockContent) => void
}

// ============================================================================
// Sortable Phase Item
// ============================================================================

function SortablePhaseItem({
    phase,
    onUpdate,
    onRemove,
    showDates,
}: {
    phase: TimelinePhase
    onUpdate: (id: string, updates: Partial<TimelinePhase>) => void
    onRemove: (id: string) => void
    showDates: boolean
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: phase.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const getStatusIcon = (status: TimelinePhase['status']) => {
        switch (status) {
            case 'completed':
                return <Check className="size-4" />
            case 'current':
                return <ArrowRight className="size-4" />
            case 'upcoming':
                return <Circle className="size-4" />
        }
    }

    const getStatusColor = (status: TimelinePhase['status']) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-600 bg-emerald-50 border-emerald-200'
            case 'current':
                return 'text-primary bg-primary/10 border-primary/20'
            case 'upcoming':
                return 'text-muted-foreground bg-muted/30 border-muted'
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'bg-card border rounded-lg overflow-hidden',
                isDragging && 'opacity-50 shadow-lg'
            )}
        >
            <div className="flex items-start gap-2 p-3">
                {/* Drag handle */}
                <button
                    type="button"
                    className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing mt-1"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4 text-muted-foreground" />
                </button>

                {/* Status indicator */}
                <div className={cn(
                    'p-2 rounded-lg border shrink-0 mt-0.5',
                    getStatusColor(phase.status)
                )}>
                    {getStatusIcon(phase.status)}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2 min-w-0">
                    {/* Title */}
                    <Input
                        value={phase.title}
                        onChange={(e) => onUpdate(phase.id, { title: e.target.value })}
                        placeholder="Phase title..."
                        className="h-8 text-sm font-medium"
                    />

                    {/* Description */}
                    <Textarea
                        value={phase.description || ''}
                        onChange={(e) => onUpdate(phase.id, { description: e.target.value })}
                        placeholder="Description (optional)..."
                        rows={2}
                        className="text-sm resize-none"
                    />

                    {/* Status & Date row */}
                    <div className="flex items-center gap-2">
                        {/* Status select */}
                        <Select
                            value={phase.status}
                            onValueChange={(value: TimelinePhase['status']) =>
                                onUpdate(phase.id, { status: value })
                            }
                        >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="completed">
                                    <div className="flex items-center gap-2">
                                        <Check className="size-3 text-emerald-600" />
                                        Completed
                                    </div>
                                </SelectItem>
                                <SelectItem value="current">
                                    <div className="flex items-center gap-2">
                                        <ArrowRight className="size-3 text-primary" />
                                        Current
                                    </div>
                                </SelectItem>
                                <SelectItem value="upcoming">
                                    <div className="flex items-center gap-2">
                                        <Circle className="size-3 text-muted-foreground" />
                                        Upcoming
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date picker */}
                        {showDates && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-8 text-xs gap-1.5',
                                            !phase.date && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="size-3" />
                                        {phase.date
                                            ? format(new Date(phase.date), 'd MMM yyyy')
                                            : 'Set date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={phase.date ? new Date(phase.date) : undefined}
                                        onSelect={(date) =>
                                            onUpdate(phase.id, { date: date?.toISOString() })
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </div>

                {/* Remove button */}
                <button
                    type="button"
                    onClick={() => onRemove(phase.id)}
                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors mt-1"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>
        </div>
    )
}

// ============================================================================
// Main Editor Component
// ============================================================================

export function TimelineBlockEditor({ content, onChange }: TimelineBlockEditorProps) {
    const phases = content.phases || []
    const showDates = content.showDates ?? true

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = phases.findIndex((p) => p.id === active.id)
            const newIndex = phases.findIndex((p) => p.id === over.id)

            const newPhases = arrayMove(phases, oldIndex, newIndex)
            onChange({ ...content, phases: newPhases })
        }
    }

    const handleAddPhase = () => {
        const newPhase: TimelinePhase = {
            id: crypto.randomUUID(),
            title: '',
            status: 'upcoming',
        }
        onChange({ ...content, phases: [...phases, newPhase] })
    }

    const handleUpdatePhase = (id: string, updates: Partial<TimelinePhase>) => {
        const newPhases = phases.map((phase) =>
            phase.id === id ? { ...phase, ...updates } : phase
        )
        onChange({ ...content, phases: newPhases })
    }

    const handleRemovePhase = (id: string) => {
        const newPhases = phases.filter((phase) => phase.id !== id)
        onChange({ ...content, phases: newPhases })
    }

    return (
        <BlockEditorWrapper blockType="timeline">
            {/* Block Title */}
            <div className="space-y-2">
                <Label htmlFor="timeline-title">Block Title (optional)</Label>
                <Input
                    id="timeline-title"
                    placeholder="e.g., Your Customer Journey"
                    value={content.title || ''}
                    onChange={(e) => onChange({ ...content, title: e.target.value })}
                />
            </div>

            {/* Block Description */}
            <div className="space-y-2">
                <Label htmlFor="timeline-description">Description (optional)</Label>
                <Textarea
                    id="timeline-description"
                    placeholder="Add a description for this timeline..."
                    value={content.description || ''}
                    onChange={(e) => onChange({ ...content, description: e.target.value })}
                    rows={2}
                />
            </div>

            {/* Show Dates Toggle */}
            <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                    <Label htmlFor="show-dates" className="text-sm font-medium">
                        Show dates
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Display date for each phase
                    </p>
                </div>
                <Switch
                    id="show-dates"
                    checked={showDates}
                    onCheckedChange={(checked) =>
                        onChange({ ...content, showDates: checked })
                    }
                />
            </div>

            {/* Phases List */}
            <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                    <Label>Phases</Label>
                    <span className="text-xs text-muted-foreground">
                        {phases.length} phase{phases.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {phases.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={phases.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {phases.map((phase) => (
                                    <SortablePhaseItem
                                        key={phase.id}
                                        phase={phase}
                                        onUpdate={handleUpdatePhase}
                                        onRemove={handleRemovePhase}
                                        showDates={showDates}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="text-center p-6 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground mb-3">
                            No phases yet
                        </p>
                    </div>
                )}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPhase}
                    className="w-full"
                >
                    <Plus className="size-4 mr-2" />
                    Add Phase
                </Button>
            </div>
        </BlockEditorWrapper>
    )
}
