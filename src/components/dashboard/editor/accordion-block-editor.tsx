'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
    Plus,
    Trash2,
    GripVertical,
    ChevronRight
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

interface AccordionItem {
    id: string
    title: string
    content: string
}

interface AccordionBlockContent {
    title?: string
    description?: string
    items?: AccordionItem[]
}

interface AccordionBlockEditorProps {
    content: AccordionBlockContent
    onChange: (content: AccordionBlockContent) => void
}

function SortableAccordionItem({
    item,
    onUpdate,
    onRemove,
}: {
    item: AccordionItem
    onUpdate: (id: string, updates: Partial<AccordionItem>) => void
    onRemove: (id: string) => void
}) {
    const [isOpen, setIsOpen] = useState(true)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
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
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex items-center gap-2 p-3 bg-muted/30">
                    {/* Drag handle */}
                    <button
                        type="button"
                        className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="size-4 text-muted-foreground" />
                    </button>

                    {/* Title input */}
                    <Input
                        value={item.title}
                        onChange={(e) => onUpdate(item.id, { title: e.target.value })}
                        placeholder="Section title..."
                        className="flex-1 h-8 text-sm font-medium"
                    />

                    {/* Expand/collapse */}
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="p-1 hover:bg-muted rounded"
                        >
                            <ChevronRight
                                className={cn(
                                    'size-4 text-muted-foreground transition-transform',
                                    isOpen && 'rotate-90'
                                )}
                            />
                        </button>
                    </CollapsibleTrigger>

                    {/* Remove button */}
                    <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                    >
                        <Trash2 className="size-4" />
                    </button>
                </div>

                <CollapsibleContent>
                    <div className="p-3 pt-0">
                        <Textarea
                            value={item.content}
                            onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                            placeholder="Section content..."
                            rows={3}
                            className="text-sm"
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}

export function AccordionBlockEditor({ content, onChange }: AccordionBlockEditorProps) {
    const items = content.items || []

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id)
            const newIndex = items.findIndex((item) => item.id === over.id)

            const newItems = arrayMove(items, oldIndex, newIndex)
            onChange({ ...content, items: newItems })
        }
    }

    const handleAddItem = () => {
        const newItem: AccordionItem = {
            id: crypto.randomUUID(),
            title: '',
            content: '',
        }
        onChange({ ...content, items: [...items, newItem] })
    }

    const handleUpdateItem = (id: string, updates: Partial<AccordionItem>) => {
        const newItems = items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
        )
        onChange({ ...content, items: newItems })
    }

    const handleRemoveItem = (id: string) => {
        const newItems = items.filter((item) => item.id !== id)
        onChange({ ...content, items: newItems })
    }

    return (
        <BlockEditorWrapper blockType="accordion">
            {/* Block Title */}
            <div className="space-y-2">
                <Label htmlFor="accordion-title">Block Title (optional)</Label>
                <Input
                    id="accordion-title"
                    placeholder="Enter title..."
                    value={content.title || ''}
                    onChange={(e) => onChange({ ...content, title: e.target.value })}
                />
            </div>

            {/* Block Description */}
            <div className="space-y-2">
                <Label htmlFor="accordion-description">Description (optional)</Label>
                <Textarea
                    id="accordion-description"
                    placeholder="Enter description..."
                    value={content.description || ''}
                    onChange={(e) => onChange({ ...content, description: e.target.value })}
                    rows={2}
                />
            </div>

            {/* Accordion Items */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Accordion Sections</Label>
                    <span className="text-xs text-muted-foreground">
                        {items.length} section{items.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {items.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <SortableAccordionItem
                                        key={item.id}
                                        item={item}
                                        onUpdate={handleUpdateItem}
                                        onRemove={handleRemoveItem}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="text-center p-6 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground mb-3">
                            No sections yet
                        </p>
                    </div>
                )}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="w-full"
                >
                    <Plus className="size-4 mr-2" />
                    Add Section
                </Button>
            </div>
        </BlockEditorWrapper>
    )
}
