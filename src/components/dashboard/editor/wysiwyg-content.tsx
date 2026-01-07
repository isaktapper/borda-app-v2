'use client'

import { Loader2, GripVertical, MoreHorizontal, Trash2, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
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

interface WYSIWYGContentProps {
    blocks: Block[]
    selectedBlockId: string | null
    isLoading: boolean
    onBlockSelect: (blockId: string) => void
    onBlockDelete: (blockId: string) => void
}

export function WYSIWYGContent({
    blocks,
    selectedBlockId,
    isLoading,
    onBlockSelect,
    onBlockDelete
}: WYSIWYGContentProps) {
    // Sort and filter hidden blocks
    const visibleBlocks = blocks
        .filter(b => !b.content.hidden)
        .sort((a, b) => a.sort_order - b.sort_order)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Loading content...</p>
            </div>
        )
    }

    if (visibleBlocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <LayoutGrid className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">No visible blocks</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Add blocks from the sidebar to build your page
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-6">
            <div className="space-y-4">
                {visibleBlocks.map((block) => (
                    <WYSIWYGBlock
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => onBlockSelect(block.id)}
                        onDelete={() => onBlockDelete(block.id)}
                    />
                ))}
            </div>
        </div>
    )
}

interface WYSIWYGBlockProps {
    block: Block
    isSelected: boolean
    onSelect: () => void
    onDelete: () => void
}

function WYSIWYGBlock({ block, isSelected, onSelect, onDelete }: WYSIWYGBlockProps) {
    return (
        <div
            className={cn(
                "group relative rounded-lg transition-all cursor-pointer",
                isSelected
                    ? "ring-2 ring-primary ring-offset-2"
                    : "hover:ring-1 hover:ring-border hover:ring-offset-1"
            )}
            onClick={onSelect}
        >
            {/* Hover Controls */}
            <div className={cn(
                "absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 transition-opacity",
                "group-hover:opacity-100",
                isSelected && "opacity-100"
            )}>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <GripVertical className="size-4" />
                </button>
            </div>

            <div className={cn(
                "absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 transition-opacity",
                "group-hover:opacity-100",
                isSelected && "opacity-100"
            )}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted text-muted-foreground">
                            <MoreHorizontal className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete block
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Block Content - rendered as preview */}
            <div className="pointer-events-none">
                <BlockPreview block={block} />
            </div>
        </div>
    )
}

// Preview renderer for WYSIWYG editing
// Renders blocks similar to portal but without interactive functionality
function BlockPreview({ block }: { block: Block }) {
    switch (block.type) {
        case 'text':
            return <TextPreview content={block.content} />
        case 'task':
            return <TaskPreview content={block.content} />
        case 'form':
            return <FormPreview content={block.content} />
        case 'file_upload':
            return <FileUploadPreview content={block.content} />
        case 'file_download':
            return <FileDownloadPreview content={block.content} />
        case 'embed':
            return <EmbedPreview content={block.content} />
        case 'contact':
            return <ContactPreview content={block.content} />
        case 'divider':
            return <DividerPreview content={block.content} />
        default:
            return (
                <div className="p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
                    Unknown block type: {block.type}
                </div>
            )
    }
}

function TextPreview({ content }: { content: any }) {
    if (content.html) {
        return (
            <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html) }}
            />
        )
    }
    return <p className="text-muted-foreground italic">Empty text block</p>
}

function TaskPreview({ content }: { content: any }) {
    const tasks = content.tasks || []
    if (tasks.length === 0) {
        return (
            <div className="border rounded-lg p-4 bg-muted/10 text-center text-sm text-muted-foreground">
                No tasks added yet
            </div>
        )
    }
    return (
        <div className="border rounded-lg p-4 bg-white space-y-2">
            {tasks.map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/30">
                    <div className="size-4 rounded border-2 border-muted mt-0.5" />
                    <div className="flex-1">
                        <span className="text-sm font-medium">{task.title || 'Untitled task'}</span>
                        {task.dueDate && (
                            <span className="text-xs text-muted-foreground ml-2">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function FormPreview({ content }: { content: any }) {
    const questions = content.questions || []
    if (questions.length === 0) {
        return (
            <div className="border rounded-lg p-4 bg-muted/10 text-center text-sm text-muted-foreground">
                No form questions added yet
            </div>
        )
    }
    return (
        <div className="border rounded-lg p-4 bg-white space-y-4">
            {questions.map((q: any) => (
                <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium">
                        {q.question || 'Untitled question'}
                        {q.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <div className="h-9 bg-muted/30 rounded border" />
                </div>
            ))}
        </div>
    )
}

function FileUploadPreview({ content }: { content: any }) {
    return (
        <div className="border border-dashed rounded-lg p-6 text-center bg-white">
            <div className="mx-auto size-10 rounded-lg bg-primary/5 flex items-center justify-center mb-3">
                <svg className="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>
            <p className="font-medium text-sm">{content.label || 'Upload file'}</p>
            {content.description && (
                <p className="text-xs text-muted-foreground mt-1">{content.description}</p>
            )}
        </div>
    )
}

function FileDownloadPreview({ content }: { content: any }) {
    const files = content.files || []
    return (
        <div className="space-y-2">
            {content.title && <h4 className="font-semibold text-sm">{content.title}</h4>}
            {content.description && <p className="text-sm text-muted-foreground">{content.description}</p>}
            {files.length > 0 ? (
                <div className="space-y-2">
                    {files.map((file: any) => (
                        <div key={file.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                            <div className="size-8 rounded bg-primary/5 flex items-center justify-center">
                                <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-muted/10 text-center text-sm text-muted-foreground">
                    No files added yet
                </div>
            )}
        </div>
    )
}

function EmbedPreview({ content }: { content: any }) {
    if (!content.url) {
        return (
            <div className="aspect-video border border-dashed rounded-lg flex items-center justify-center bg-muted/10">
                <p className="text-sm text-muted-foreground">No URL set</p>
            </div>
        )
    }

    const getEmbedUrl = (url: string) => {
        if (url.includes('loom.com/share/')) return url.replace('loom.com/share/', 'loom.com/embed/')
        if (url.includes('youtube.com/watch?v=')) return `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`
        if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('/').pop()}`
        return url
    }

    return (
        <div className="aspect-video rounded-lg border overflow-hidden bg-black">
            <iframe
                src={getEmbedUrl(content.url)}
                className="w-full h-full border-0 pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    )
}

function ContactPreview({ content }: { content: any }) {
    const initials = content.name
        ? content.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    return (
        <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{content.name || 'Name not set'}</h4>
                    {content.title && <p className="text-sm text-muted-foreground">{content.title}</p>}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {content.email && <span>{content.email}</span>}
                        {content.phone && <span>{content.phone}</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DividerPreview({ content }: { content: any }) {
    if (content.style === 'space') {
        return <div className="h-8" />
    }
    return (
        <div className="py-4 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <div className="size-1 bg-muted-foreground/30 rounded-full" />
            <div className="h-px bg-border flex-1" />
        </div>
    )
}

