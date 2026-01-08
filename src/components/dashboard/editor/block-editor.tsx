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
    CheckSquare,
    Upload,
    Download,
    HelpCircle,
    Calendar,
    LayoutGrid,
    AlignLeft,
    List,
    ListChecks,
    Video,
    User,
    Minus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BlockItem } from './block-item'
import { TextBlockEditor } from './text-block-editor'
import { TaskBlockEditor } from './task-block-editor'
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

const BLOCK_TYPES = [
    { type: 'text', label: 'Text / Rubrik', icon: Type, description: 'Vanlig text, stycken eller rubriker.' },
    { type: 'task', label: 'To-do', icon: CheckSquare, description: 'Task for the customer with checkbox and deadline.' },
    { type: 'form', label: 'Form', icon: HelpCircle, description: 'Collect responses from the customer.' },
    { type: 'file_upload', label: 'Filuppladdning', icon: Upload, description: 'Be kunden ladda upp dokument eller bilder.' },
    { type: 'file_download', label: 'Files to download', icon: Download, description: 'Files for the customer to download.' },
    { type: 'embed', label: 'Video / Embed', icon: Video, description: 'Embed Loom, YouTube or Calendly.' },
    { type: 'contact', label: 'Contact card', icon: User, description: 'Show contact info for the customer.' },
    { type: 'divider', label: 'Avskiljare', icon: Minus, description: 'Linje eller mellanrum.' },
    { type: 'meeting', label: 'Book meeting', icon: Calendar, description: 'Embed link for scheduling.', disabled: true },
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
                                        {block.type !== 'text' && block.type !== 'task' && block.type !== 'file_upload' && block.type !== 'file_download' && block.type !== 'form' && block.type !== 'embed' && block.type !== 'contact' && block.type !== 'divider' && (
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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full h-10 px-6 hover:bg-primary/5 hover:text-primary transition-all shadow-sm">
                    <Plus className="size-4" />
                    Add block
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select block type</DialogTitle>
                    <DialogDescription>
                        Choose what type of content you want to add to the page.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                    {BLOCK_TYPES.map((type) => (
                        <button
                            key={type.type}
                            disabled={type.disabled}
                            onClick={() => onSelect(type.type)}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                                !type.disabled
                                    ? "hover:border-primary hover:bg-primary/5 border-transparent bg-muted/30"
                                    : "opacity-50 cursor-not-allowed border-transparent bg-muted/10"
                            )}
                        >
                            <div className={cn(
                                "p-2.5 rounded-lg",
                                !type.disabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                <type.icon className="size-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-sm flex items-center gap-2">
                                    {type.label}
                                    {type.disabled && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider font-bold">Kommer snart</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
