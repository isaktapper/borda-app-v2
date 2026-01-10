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
    Blocks,
    Sparkles,
    Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
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
    onPageRename?: (newTitle: string) => void
}

const BLOCK_TYPES = [
    { type: 'text', label: 'Text', icon: Type, description: 'Rich text content' },
    { type: 'action_plan', label: 'Action Plan', icon: Target, description: 'Collaborative milestones and tasks' },
    { type: 'task', label: 'To-do', icon: CheckSquare, description: 'Checkable tasks' },
    { type: 'form', label: 'Form', icon: HelpCircle, description: 'Collect responses' },
    { type: 'file_upload', label: 'File Upload', icon: Upload, description: 'Customer uploads' },
    { type: 'file_download', label: 'File Download', icon: Download, description: 'Share files' },
    { type: 'embed', label: 'Video / Embed', icon: Video, description: 'YouTube, Loom' },
    { type: 'contact', label: 'Contact Card', icon: User, description: 'Contact info' },
    { type: 'divider', label: 'Divider', icon: Minus, description: 'Visual separator' },
]

const BLOCK_ICONS: Record<string, any> = {
    text: Type,
    action_plan: Target,
    task: CheckSquare,
    form: HelpCircle,
    file_upload: Upload,
    file_download: Download,
    embed: Video,
    contact: User,
    divider: Minus,
}

const QUICK_ADD_TYPES = ['text', 'task', 'form', 'file_upload']

export function BlocksListView({
    pageTitle,
    blocks,
    isLoading,
    onBack,
    onBlockSelect,
    onBlockToggle,
    onBlockReorder,
    onBlockDelete,
    onAddBlock,
    onPageRename
}: BlocksListViewProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editedTitle, setEditedTitle] = useState(pageTitle)
    const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order)

    const handleTitleSubmit = () => {
        const trimmedTitle = editedTitle.trim()
        if (trimmedTitle && trimmedTitle !== pageTitle && onPageRename) {
            onPageRename(trimmedTitle)
        } else {
            setEditedTitle(pageTitle) // Reset if empty or unchanged
        }
        setIsEditingTitle(false)
    }

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSubmit()
        } else if (e.key === 'Escape') {
            setEditedTitle(pageTitle)
            setIsEditingTitle(false)
        }
    }

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
                <div className="flex items-center justify-between">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleTitleSubmit}
                            onKeyDown={handleTitleKeyDown}
                            autoFocus
                            className="font-semibold text-sm bg-background border rounded px-2 py-1 w-full mr-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    ) : (
                        <h3
                            onClick={() => {
                                if (onPageRename) {
                                    setEditedTitle(pageTitle)
                                    setIsEditingTitle(true)
                                }
                            }}
                            className={cn(
                                "font-semibold text-sm truncate",
                                onPageRename && "cursor-pointer hover:bg-muted px-2 py-1 -mx-2 -my-1 rounded transition-colors"
                            )}
                            title={onPageRename ? "Click to rename" : undefined}
                        >
                            {pageTitle}
                        </h3>
                    )}
                    {sortedBlocks.length > 0 && !isEditingTitle && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                            {sortedBlocks.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Blocks List */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Loading blocks...</p>
                    </div>
                ) : sortedBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        {/* Decorative illustration */}
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Blocks className="size-8 text-primary/60" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="size-3 text-primary" />
                            </div>
                        </div>

                        <h4 className="font-semibold text-foreground mb-1">
                            Start building
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                            Add content blocks to create an engaging experience for your client.
                        </p>

                        {/* Quick add buttons */}
                        <div className="grid grid-cols-2 gap-2 w-full max-w-[220px]">
                            {QUICK_ADD_TYPES.map((type) => {
                                const blockType = BLOCK_TYPES.find(b => b.type === type)
                                if (!blockType) return null
                                const Icon = blockType.icon
                                return (
                                    <button
                                        key={type}
                                        onClick={() => onAddBlock(type)}
                                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-left"
                                    >
                                        <Icon className="size-4 text-muted-foreground shrink-0" />
                                        <span className="text-xs font-medium truncate">{blockType.label}</span>
                                    </button>
                                )
                            })}
                        </div>
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
                    <DropdownMenuContent align="center" className="w-64">
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                            Choose a block type
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {BLOCK_TYPES.map((type) => (
                            <DropdownMenuItem
                                key={type.type}
                                onClick={() => onAddBlock(type.type)}
                                className="gap-3 py-2.5"
                            >
                                <div className="p-1.5 rounded bg-muted">
                                    <type.icon className="size-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{type.label}</div>
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                </div>
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

            <div className="p-1 rounded bg-muted/50">
                <Icon className="size-4 text-muted-foreground" />
            </div>

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
