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
    Type,
    Upload,
    Download,
    HelpCircle,
    Video,
    User,
    Plus,
    Trash2,
    Loader2,
    Blocks as BlocksIcon,
    Sparkles,
    Target,
    Image as ImageIcon,
    List,
    LayoutGrid,
    MessageSquare,
    FolderKanban,
    MoreVertical,
    ChevronLeft
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface BlocksTabContentProps {
    spaceId: string
    pageTitle: string
    blocks: Block[]
    isLoadingBlocks: boolean
    selectedBlockId: string | null
    onBlockSelect: (blockId: string) => void
    onBlockToggle: (blockId: string, hidden: boolean) => void
    onBlockReorder: (blocks: Block[]) => void
    onBlockDelete: (blockId: string) => void
    onAddBlock: (type: string) => void
    onBack: () => void
}

type BlockCategory = 'content' | 'projects' | 'collaboration'

interface BlockType {
    type: string
    label: string
    icon: any
    category: BlockCategory
}

const BLOCK_CATEGORIES: { id: BlockCategory; label: string }[] = [
    { id: 'content', label: 'Content' },
    { id: 'projects', label: 'Projects' },
    { id: 'collaboration', label: 'Collaboration' },
]

const BLOCK_TYPES: BlockType[] = [
    // Content
    { type: 'text', label: 'Text', icon: Type, category: 'content' },
    { type: 'media', label: 'Media', icon: ImageIcon, category: 'content' },
    { type: 'accordion', label: 'Accordion', icon: List, category: 'content' },
    { type: 'embed', label: 'Embed', icon: Video, category: 'content' },
    // Projects
    { type: 'action_plan', label: 'Action Plan', icon: Target, category: 'projects' },
    // Collaboration
    { type: 'form', label: 'Form', icon: HelpCircle, category: 'collaboration' },
    { type: 'file_upload', label: 'File Upload', icon: Upload, category: 'collaboration' },
    { type: 'file_download', label: 'Files', icon: Download, category: 'collaboration' },
    { type: 'contact', label: 'Contact', icon: User, category: 'collaboration' },
]

const BLOCK_ICONS: Record<string, any> = {
    text: Type,
    action_plan: Target,
    media: ImageIcon,
    accordion: List,
    form: HelpCircle,
    file_upload: Upload,
    file_download: Download,
    embed: Video,
    contact: User,
    // Deprecated types kept for backward compatibility rendering
    task: Target,
    divider: Type,
}

const QUICK_ADD_TYPES = ['text', 'action_plan', 'form', 'file_upload']

export function BlocksTabContent({
    spaceId,
    pageTitle,
    blocks,
    isLoadingBlocks,
    selectedBlockId,
    onBlockSelect,
    onBlockToggle,
    onBlockReorder,
    onBlockDelete,
    onAddBlock,
    onBack
}: BlocksTabContentProps) {
    const [isAddBlockOpen, setIsAddBlockOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<BlockCategory | 'all'>('all')
    const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order)

    const handleAddBlock = (type: string) => {
        onAddBlock(type)
        setIsAddBlockOpen(false)
        setSelectedCategory('all') // Reset filter when closing
    }

    const filteredBlockTypes = selectedCategory === 'all' 
        ? BLOCK_TYPES 
        : BLOCK_TYPES.filter(b => b.category === selectedCategory)

    const getBlocksByCategory = (category: BlockCategory) => 
        BLOCK_TYPES.filter(b => b.category === category)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        }),
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

    const getBlockTypeLabel = (type: string): string => {
        const blockType = BLOCK_TYPES.find(b => b.type === type)
        return blockType?.label || type
    }

    const getBlockTitle = (block: Block): string => {
        switch (block.type) {
            case 'text':
                const html = block.content.html || ''
                const text = html.replace(/<[^>]*>/g, '').trim()
                return text.slice(0, 40) || 'Empty text block'
            case 'task':
                const tasks = block.content.tasks || []
                return tasks.length > 0 ? `${tasks.length} task${tasks.length > 1 ? 's' : ''}` : 'No tasks'
            case 'action_plan':
                return block.content.title || 'Action plan'
            case 'media':
                return block.content.title || 'Media block'
            case 'accordion':
                return block.content.title || 'Accordion'
            case 'form':
                return block.content.title || 'Form'
            case 'file_upload':
                return block.content.label || block.content.title || 'File upload'
            case 'file_download':
                return block.content.title || 'Files to download'
            case 'embed':
                return block.content.title || 'Embedded content'
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
            <div className="p-4 border-b">
                <div className="flex items-center justify-center relative">
                    {/* Back button */}
                    <button
                        onClick={onBack}
                        className="absolute left-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="size-5" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <span className="text-xs text-muted-foreground">Block overview</span>
                        <h3 className="font-semibold text-base">{pageTitle}</h3>
                    </div>

                    <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" className="size-8 rounded-lg absolute right-0">
                                <Plus className="size-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl p-0 gap-0">
                            <DialogHeader className="p-6 pb-4">
                                <DialogTitle className="text-xl font-bold text-center">Add a Block</DialogTitle>
                                <DialogDescription className="text-center">
                                    Select a block below to add to your page.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="flex border-t">
                                {/* Left sidebar - Category filter */}
                                <div className="w-44 border-r p-3 space-y-1 bg-muted/20">
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                            selectedCategory === 'all' 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <LayoutGrid className="size-4" />
                                        All
                                    </button>
                                    <button
                                        onClick={() => setSelectedCategory('content')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                            selectedCategory === 'content' 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <MessageSquare className="size-4" />
                                        Content
                                    </button>
                                    <button
                                        onClick={() => setSelectedCategory('projects')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                            selectedCategory === 'projects' 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <FolderKanban className="size-4" />
                                        Projects
                                    </button>
                                    <button
                                        onClick={() => setSelectedCategory('collaboration')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                            selectedCategory === 'collaboration' 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <User className="size-4" />
                                        Collaboration
                                    </button>
                                </div>

                                {/* Right side - Block grid */}
                                <div className="flex-1 p-4 max-h-[400px] overflow-y-auto">
                                    {selectedCategory === 'all' ? (
                                        <div className="space-y-5">
                                            {BLOCK_CATEGORIES.map(cat => {
                                                const categoryBlocks = getBlocksByCategory(cat.id)
                                                if (categoryBlocks.length === 0) return null
                                                return (
                                                    <div key={cat.id}>
                                                        <h4 className="text-sm font-semibold text-foreground mb-2">{cat.label}</h4>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {categoryBlocks.map((type) => (
                                                                <button
                                                                    key={type.type}
                                                                    onClick={() => handleAddBlock(type.type)}
                                                                    className="group flex flex-col items-center text-center rounded-lg p-2 transition-all hover:bg-primary/5"
                                                                >
                                                                    <div className="w-full aspect-[4/3] rounded-lg bg-muted/50 flex items-center justify-center transition-colors group-hover:bg-primary/10">
                                                                        <type.icon className="size-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                                                    </div>
                                                                    <span className="text-xs font-medium mt-1.5 text-foreground/70 group-hover:text-primary transition-colors">
                                                                        {type.label}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2">
                                            {filteredBlockTypes.map((type) => (
                                                <button
                                                    key={type.type}
                                                    onClick={() => handleAddBlock(type.type)}
                                                    className="group flex flex-col items-center text-center rounded-lg p-2 transition-all hover:bg-primary/5"
                                                >
                                                    <div className="w-full aspect-[4/3] rounded-lg bg-muted/50 flex items-center justify-center transition-colors group-hover:bg-primary/10">
                                                        <type.icon className="size-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <span className="text-xs font-medium mt-1.5 text-foreground/70 group-hover:text-primary transition-colors">
                                                        {type.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Blocks List */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {isLoadingBlocks ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Loading blocks...</p>
                    </div>
                ) : sortedBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        {/* Decorative illustration */}
                        <div className="relative mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <BlocksIcon className="size-7 text-primary/60" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="size-2.5 text-primary" />
                            </div>
                        </div>

                        <h4 className="font-semibold text-sm text-foreground mb-1">
                            Start building
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
                            Add content blocks to create an engaging experience for your client.
                        </p>

                        {/* Quick add buttons */}
                        <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
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
                            <div className="space-y-3">
                                {sortedBlocks.map((block) => (
                                    <SortableBlockItem
                                        key={block.id}
                                        block={block}
                                        blockTypeLabel={getBlockTypeLabel(block.type)}
                                        title={getBlockTitle(block)}
                                        icon={BLOCK_ICONS[block.type] || Type}
                                        isSelected={selectedBlockId === block.id}
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
        </>
    )
}

interface SortableBlockItemProps {
    block: Block
    blockTypeLabel: string
    title: string
    icon: any
    isSelected: boolean
    onSelect: () => void
    onToggle: (hidden: boolean) => void
    onDelete: () => void
}

function SortableBlockItem({ block, blockTypeLabel, title, icon: Icon, isSelected, onSelect, onToggle, onDelete }: SortableBlockItemProps) {
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
            {...attributes}
            {...listeners}
            onClick={onSelect}
            className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all cursor-pointer",
                "bg-white border border-border shadow-sm",
                "hover:shadow-md hover:border-border/80",
                isDragging && "opacity-50 z-50 ring-2 ring-primary shadow-lg cursor-grabbing",
                isHidden && "opacity-60"
            )}
        >
            {/* Block type icon box */}
            <div className="w-16 h-12 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-primary/60" />
            </div>

            {/* Two lines of text */}
            <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground">{blockTypeLabel}</span>
                <p className={cn(
                    "text-sm font-medium truncate",
                    isHidden && "line-through text-muted-foreground"
                )}>
                    {title}
                </p>
            </div>

            {/* Kebab Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <MoreVertical className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Toggle */}
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
