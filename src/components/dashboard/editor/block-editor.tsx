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
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
    Plus,
    Type,
    Loader2,
    Upload,
    Download,
    HelpCircle,
    LayoutGrid,
    List,
    Video,
    User,
    Target,
    Image as ImageIcon,
    MessageSquare,
    FolderKanban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BlockItem } from './block-item'
import { TextBlockEditor } from './text-block-editor'
import { TaskBlockEditor } from './task-block-editor'
import { ActionPlanBlockEditor } from './action-plan-block-editor'
import { FileUploadBlockEditor } from './file-upload-block-editor'
import { FileDownloadBlockEditor } from './file-download-block-editor'
import { FormBlockEditor } from './form-block-editor'
import { EmbedBlockEditor } from './embed-block-editor'
import { ContactCardBlockEditor } from './contact-card-block-editor'
import { DividerBlockEditor } from './divider-block-editor'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

interface BlockEditorProps {
    pageId: string
    spaceId?: string
    blocks: Block[]
    onBlocksChange: (newBlocks: Block[]) => void
    isLoading?: boolean
}

type BlockCategory = 'content' | 'projects' | 'collaboration'

interface BlockTypeConfig {
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

const BLOCK_TYPES: BlockTypeConfig[] = [
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

export function BlockEditor({ pageId, spaceId, blocks, onBlocksChange, isLoading }: BlockEditorProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleAddBlock = (type: string) => {
        const newId = `new-${Date.now()}`
        let initialContent: any = {}
        if (type === 'text') initialContent = { html: '<p></p>' }
        if (type === 'action_plan') initialContent = { milestones: [], permissions: { stakeholderCanEdit: true, stakeholderCanComplete: true } }
        if (type === 'task') initialContent = { tasks: [] }
        if (type === 'file_upload') initialContent = { label: '', description: '', acceptedTypes: [], maxFiles: 1 }
        if (type === 'file_download') initialContent = { title: '', description: '', files: [] }
        if (type === 'form') initialContent = { questions: [] }
        if (type === 'embed') initialContent = { url: '', type: 'video' }
        if (type === 'contact') initialContent = { name: '', title: '', email: '', phone: '' }
        if (type === 'divider') initialContent = { style: 'line' }

        const newBlock = {
            id: newId,
            type,
            content: initialContent,
            sort_order: blocks.length
        }
        onBlocksChange([...blocks, newBlock])
        setIsPickerOpen(false)
    }

    const handleDeleteBlock = (id: string) => {
        onBlocksChange(blocks.filter((b: Block) => b.id !== id))
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex((b: Block) => b.id === active.id)
            const newIndex = blocks.findIndex((b: Block) => b.id === over.id)
            const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((b: Block, i: number) => ({
                ...b,
                sort_order: i
            }))
            onBlocksChange(newBlocks)
        }
    }

    const updateBlockContent = (id: string, updates: any) => {
        onBlocksChange(blocks.map((b: Block) =>
            b.id === id ? { ...b, content: { ...b.content, ...updates } } : b
        ))
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                <Loader2 className="size-8 animate-spin text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground italic">Loading content...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* List */}
            <div className="space-y-1">
                {blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20 border-muted-foreground/10 transition-colors hover:bg-muted/30">
                        <LayoutGrid className="size-12 text-muted-foreground/20 mb-4" />
                        <h3 className="font-semibold text-lg">Nothing here yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 mb-6">
                            Your page has no content. Add your first block to get started.
                        </p>
                        <BlockPickerButton onSelect={handleAddBlock} open={isPickerOpen} onOpenChange={setIsPickerOpen} />
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={blocks.map((b: Block) => b.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {blocks.map((block: Block) => (
                                    <BlockItem
                                        key={block.id}
                                        id={block.id}
                                        onDelete={() => handleDeleteBlock(block.id)}
                                    >
                                        {block.type === 'text' && (
                                            <TextBlockEditor
                                                blockId={block.id}
                                                content={block.content}
                                                onChange={(updates) => updateBlockContent(block.id, updates)}
                                            />
                                        )}
                                        {block.type === 'action_plan' && (
                                            <ActionPlanBlockEditor
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                                spaceId={spaceId || ''}
                                            />
                                        )}
                                        {block.type === 'task' && (
                                            <TaskBlockEditor
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type === 'file_upload' && (
                                            <FileUploadBlockEditor
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type === 'file_download' && (
                                            <FileDownloadBlockEditor
                                                blockId={block.id}
                                                spaceId={spaceId}
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type === 'form' && (
                                            <FormBlockEditor
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type === 'embed' && (
                                            <EmbedBlockEditor
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type === 'contact' && (
                                            <ContactCardBlockEditor
                                                blockId={block.id}
                                                spaceId={spaceId}
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type === 'divider' && (
                                            <DividerBlockEditor
                                                content={block.content}
                                                onChange={(newContent) => updateBlockContent(block.id, newContent)}
                                            />
                                        )}
                                        {block.type !== 'text' && block.type !== 'action_plan' && block.type !== 'task' && block.type !== 'file_upload' && block.type !== 'file_download' && block.type !== 'form' && block.type !== 'embed' && block.type !== 'contact' && block.type !== 'divider' && (
                                            <div className="py-4 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/5">
                                                Placeholder for {block.type}-block
                                            </div>
                                        )}
                                    </BlockItem>
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay
                            dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({
                                    styles: {
                                        active: {
                                            opacity: '0.4',
                                        },
                                    },
                                }),
                            }}
                        >
                            {activeId ? (
                                <div className="w-full bg-background border rounded-xl shadow-2xl ring-1 ring-primary/20 p-4 opacity-90 cursor-grabbing bg-white">
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'text' && (
                                        <TextBlockEditor
                                            blockId={activeId}
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'task' && (
                                        <TaskBlockEditor
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'file_upload' && (
                                        <FileUploadBlockEditor
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'file_download' && (
                                        <FileDownloadBlockEditor
                                            blockId={activeId}
                                            spaceId={spaceId}
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'form' && (
                                        <FormBlockEditor
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'embed' && (
                                        <EmbedBlockEditor
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'contact' && (
                                        <ContactCardBlockEditor
                                            blockId={activeId}
                                            spaceId={spaceId}
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                    {blocks.find((b: Block) => b.id === activeId)?.type === 'divider' && (
                                        <DividerBlockEditor
                                            content={blocks.find((b: Block) => b.id === activeId)?.content}
                                            onChange={() => { }}
                                        />
                                    )}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {blocks.length > 0 && (
                <div className="flex justify-center pt-4 border-t border-dashed">
                    <BlockPickerButton onSelect={handleAddBlock} open={isPickerOpen} onOpenChange={setIsPickerOpen} />
                </div>
            )}
        </div>
    )
}

function BlockPickerButton({ onSelect, open, onOpenChange }: { onSelect: (type: string) => void, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [selectedCategory, setSelectedCategory] = useState<BlockCategory | 'all'>('all')

    const handleSelect = (type: string) => {
        onSelect(type)
        setSelectedCategory('all')
    }

    const filteredBlockTypes = selectedCategory === 'all' 
        ? BLOCK_TYPES 
        : BLOCK_TYPES.filter(b => b.category === selectedCategory)

    const getBlocksByCategory = (category: BlockCategory) => 
        BLOCK_TYPES.filter(b => b.category === category)

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen)
            if (!isOpen) setSelectedCategory('all')
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full h-10 px-6 hover:bg-primary/5 hover:text-primary transition-all shadow-sm">
                    <Plus className="size-4" />
                    Add block
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
                                                        onClick={() => handleSelect(type.type)}
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
                                        onClick={() => handleSelect(type.type)}
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
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
