'use client'

import { useState } from 'react'
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
import {
    ArrowLeft,
    GripVertical,
    Type,
    CheckSquare,
    Upload,
    Download,
    HelpCircle,
    Video,
    User,
    Minus,
    Plus,
    Trash2,
    Loader2,
    LayoutGrid
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface BlocksListViewProps {
    pageTitle: string
    blocks: Block[]
    isLoading: boolean
    onBack: () => void
    onBlockSelect: (blockId: string) => void
    onBlockToggle: (blockId: string, hidden: boolean) => void
    onBlockReorder: (blocks: Block[]) => void
    onBlockDelete: (blockId: string) => void
    onAddBlock: (type: string) => void
}

const BLOCK_TYPES = [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'task', label: 'To-do', icon: CheckSquare },
    { type: 'form', label: 'Form', icon: HelpCircle },
    { type: 'file_upload', label: 'File Upload', icon: Upload },
    { type: 'file_download', label: 'File Download', icon: Download },
    { type: 'embed', label: 'Video / Embed', icon: Video },
    { type: 'contact', label: 'Contact Card', icon: User },
    { type: 'divider', label: 'Divider', icon: Minus },
]

const BLOCK_ICONS: Record<string, any> = {
    text: Type,
    task: CheckSquare,
    form: HelpCircle,
    file_upload: Upload,
    file_download: Download,
    embed: Video,
    contact: User,
    divider: Minus,
}

export function BlocksListView({
    pageTitle,
    blocks,
    isLoading,
    onBack,
    onBlockSelect,
    onBlockToggle,
    onBlockReorder,
    onBlockDelete,
    onAddBlock
}: BlocksListViewProps) {
    const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id)
            const newIndex = sortedBlocks.findIndex((b) => b.id === over.id)
            const newBlocks = arrayMove(sortedBlocks, oldIndex, newIndex)
            onBlockReorder(newBlocks)
        }
    }

    const getBlockTitle = (block: Block): string => {
        switch (block.type) {
            case 'text':
                // Extract text from HTML
                const html = block.content.html || ''
                const text = html.replace(/<[^>]*>/g, '').trim()
                return text.slice(0, 30) || 'Empty text'
            case 'task':
                const tasks = block.content.tasks || []
                return tasks.length > 0 ? `${tasks.length} task${tasks.length > 1 ? 's' : ''}` : 'No tasks'
            case 'form':
                const questions = block.content.questions || []
                return questions.length > 0 ? `${questions.length} question${questions.length > 1 ? 's' : ''}` : 'No questions'
            case 'file_upload':
                return block.content.label || 'File upload'
            case 'file_download':
                return block.content.title || 'Files'
            case 'embed':
                return block.content.url ? 'Embedded content' : 'No URL set'
            case 'contact':
                return block.content.name || 'Contact card'
            case 'divider':
                return 'Divider'
            default:
                return block.type
        }
    }

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b bg-muted/30">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                    <ArrowLeft className="size-4" />
                    Back to pages
                </button>
                <h3 className="font-semibold text-sm truncate">{pageTitle}</h3>
            </div>

            {/* Blocks List */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Loading blocks...</p>
                    </div>
                ) : sortedBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <LayoutGrid className="size-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No blocks yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add your first block to get started</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedBlocks.map((b) => b.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {sortedBlocks.map((block) => (
                                    <SortableBlockItem
                                        key={block.id}
                                        block={block}
                                        title={getBlockTitle(block)}
                                        icon={BLOCK_ICONS[block.type] || Type}
                                        onSelect={() => onBlockSelect(block.id)}
                                        onToggle={(hidden) => onBlockToggle(block.id, hidden)}
                                        onDelete={() => onBlockDelete(block.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Add Block Button */}
            <div className="p-3 border-t">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full gap-2">
                            <Plus className="size-4" />
                            Add block
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                        {BLOCK_TYPES.map((type) => (
                            <DropdownMenuItem
                                key={type.type}
                                onClick={() => onAddBlock(type.type)}
                                className="gap-2"
                            >
                                <type.icon className="size-4 text-muted-foreground" />
                                {type.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )
}

interface SortableBlockItemProps {
    block: Block
    title: string
    icon: any
    onSelect: () => void
    onToggle: (hidden: boolean) => void
    onDelete: () => void
}

function SortableBlockItem({ block, title, icon: Icon, onSelect, onToggle, onDelete }: SortableBlockItemProps) {
    const isHidden = block.content.hidden === true

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: block.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors",
                "hover:bg-muted cursor-pointer",
                isDragging && "opacity-50 z-50 bg-muted ring-1 ring-primary",
                isHidden && "opacity-50"
            )}
            onClick={onSelect}
        >
            <button
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted-foreground/10 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
            >
                <GripVertical className="size-4" />
            </button>

            <Icon className="size-4 text-muted-foreground shrink-0" />

            <span className={cn(
                "flex-1 text-sm font-medium truncate",
                isHidden && "line-through"
            )}>
                {title}
            </span>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
            >
                <Trash2 className="size-3.5" />
            </button>

            <Switch
                checked={!isHidden}
                onCheckedChange={(checked) => {
                    onToggle(!checked)
                }}
                onClick={(e) => e.stopPropagation()}
                className="scale-75"
            />
        </div>
    )
}

