'use client'

import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
import { sanitizeStoragePath, sanitizeFileExtension, isValidStoragePath } from '@/lib/storage-security'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { 
    Mail, 
    Phone, 
    Calendar as CalendarIcon, 
    FileUp, 
    Check, 
    Loader2, 
    Download, 
    Trash2, 
    FileText, 
    FileSpreadsheet, 
    Image as ImageIcon, 
    File, 
    Info, 
    ChevronRight,
    ChevronDown,
    Play,
    ExternalLink,
    Zap
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { CircularProgress } from '@/components/ui/circular-progress'
import { BlockContainer } from './block-container'
import type { ActionPlanContent, Milestone, QuickAction } from '@/types/action-plan'
import {
    getTaskCompositeId,
    calculateMilestoneProgress,
    formatDate,
    isPastDue,
    getInitials,
} from '@/lib/action-plan-utils'

// ============================================================================
// Types
// ============================================================================

interface Block {
    id: string
    type: string
    content: any
    sort_order?: number
}

interface BlockInteractionContext {
    /** Whether the block is interactive (portal) or read-only (editor preview) */
    interactive: boolean
    /** Space ID for file operations */
    spaceId?: string
    /** Task states for action plans and tasks */
    tasks?: Record<string, 'pending' | 'completed'>
    /** Form responses */
    responses?: Record<string, any>
    /** Uploaded files per block */
    files?: Record<string, any[]>
    /** Toggle task completion */
    toggleTask?: (taskId: string, title: string) => void
    /** Update form response */
    updateResponse?: (key: string, value: any) => void
    /** Add file to block */
    addFile?: (blockId: string, file: any) => void
    /** Remove file from block */
    removeFile?: (blockId: string, fileId: string) => void
}

const BlockContext = createContext<BlockInteractionContext>({ interactive: false })

// ============================================================================
// Main Renderer
// ============================================================================

interface SharedBlockRendererProps {
    block: Block
    /** Context for interactive features (portal mode) */
    context?: BlockInteractionContext
}

/**
 * SharedBlockRenderer - Unified block renderer for both Editor Preview and Portal
 * 
 * Usage:
 * - Editor Preview: <SharedBlockRenderer block={block} />
 * - Portal: <SharedBlockRenderer block={block} context={portalContext} />
 */
export function SharedBlockRenderer({ block, context }: SharedBlockRendererProps) {
    const ctx = context || { interactive: false }
    
    return (
        <BlockContext.Provider value={ctx}>
            <div className="mb-4">
                {renderBlock(block)}
            </div>
        </BlockContext.Provider>
    )
}

function renderBlock(block: Block) {
    switch (block.type) {
        case 'text':
            return <TextBlock content={block.content} />
        case 'action_plan':
            return <ActionPlanBlock blockId={block.id} content={block.content} />
        case 'task':
            // Deprecated but kept for backward compatibility
            return <TaskBlock blockId={block.id} content={block.content} />
        case 'file_upload':
            return <FileUploadBlock blockId={block.id} content={block.content} />
        case 'file_download':
            return <FileDownloadBlock content={block.content} />
        case 'form':
            return <FormBlock blockId={block.id} content={block.content} />
        case 'embed':
            return <EmbedBlock content={block.content} />
        case 'contact':
            return <ContactBlock content={block.content} />
        case 'divider':
            // Deprecated but kept for backward compatibility
            return <DividerBlock content={block.content} />
        case 'media':
            return <MediaBlock content={block.content} />
        case 'accordion':
            return <AccordionBlock content={block.content} />
        default:
            return (
                <BlockContainer className="bg-muted/10">
                    <p className="text-sm text-muted-foreground text-center">
                        Unknown block type: {block.type}
                    </p>
                </BlockContainer>
            )
    }
}

// ============================================================================
// Text Block
// ============================================================================

function TextBlock({ content }: { content: any }) {
    // Handle new HTML format
    if (content.html) {
        return (
            <BlockContainer>
                <div
                    className="prose prose-sm max-w-none portal-text-content"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html) }}
                />
            </BlockContainer>
        )
    }

    // Backward compatibility with old { variant, text } format
    return (
        <BlockContainer>
            <div className={cn(
                "text-foreground/90 leading-relaxed max-w-none",
                content.variant === 'h1' && "text-4xl font-extrabold tracking-tight text-foreground",
                content.variant === 'h2' && "text-2xl font-bold tracking-tight text-foreground",
                content.variant === 'h3' && "text-xl font-semibold text-foreground",
                content.variant === 'p' && "text-base text-muted-foreground/80"
            )}>
                {content.text || <span className="text-muted-foreground/50 italic">Empty text block</span>}
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Quick Action Pill (for Action Plan)
// ============================================================================

interface QuickActionPillProps {
    quickAction: QuickAction
    onClick?: (e: React.MouseEvent) => void
}

function QuickActionPill({ quickAction, onClick }: QuickActionPillProps) {
    const handleClick = (e: React.MouseEvent) => {
        onClick?.(e)
        
        switch (quickAction.type) {
            case 'link':
                if (quickAction.url) {
                    window.open(quickAction.url, '_blank', 'noopener,noreferrer')
                }
                break
            case 'go_to_page':
                if (quickAction.pageId) {
                    // Scroll to page or navigate - for now we'll scroll to the page element
                    const pageElement = document.getElementById(`page-${quickAction.pageId}`)
                    if (pageElement) {
                        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }
                break
            case 'go_to_block':
                if (quickAction.blockId) {
                    // Scroll to the block element
                    const blockElement = document.getElementById(`block-${quickAction.blockId}`)
                    if (blockElement) {
                        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        // Add a brief highlight effect
                        blockElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
                        setTimeout(() => {
                            blockElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
                        }, 2000)
                    }
                }
                break
        }
    }

    const getIcon = () => {
        switch (quickAction.type) {
            case 'link':
                return <ExternalLink className="size-3" />
            case 'go_to_page':
                return <FileText className="size-3" />
            case 'go_to_block':
                return <Zap className="size-3" />
            default:
                return null
        }
    }

    return (
        <button
            onClick={handleClick}
            className="inline-flex items-center gap-1 bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
            {getIcon()}
            {quickAction.title}
        </button>
    )
}

// ============================================================================
// Action Plan Block
// ============================================================================

function ActionPlanBlock({ blockId, content }: { blockId: string; content: ActionPlanContent }) {
    const ctx = useContext(BlockContext)
    const milestones = content.milestones || []
    const permissions = content.permissions || {
        customerCanEdit: true,
        customerCanComplete: true,
    }

    // Track which milestones are open (first one open by default)
    const [openMilestones, setOpenMilestones] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        if (milestones.length > 0) {
            initial[milestones[0].id] = true
        }
        return initial
    })

    if (milestones.length === 0) {
        return (
            <BlockContainer 
                title={content.title} 
                description={content.description}
                className="bg-muted/10"
            >
                <p className="text-sm text-muted-foreground text-center py-4">No milestones yet</p>
            </BlockContainer>
        )
    }

    // Extract task statuses for this block only
    const blockTaskStatuses = ctx.tasks 
        ? Object.keys(ctx.tasks)
            .filter(key => key.startsWith(blockId + '-'))
            .reduce((acc, key) => {
                const taskId = key.replace(blockId + '-', '')
                acc[taskId] = ctx.tasks![key]
                return acc
            }, {} as Record<string, 'pending' | 'completed'>)
        : {}

    const toggleMilestone = (milestoneId: string) => {
        setOpenMilestones(prev => ({
            ...prev,
            [milestoneId]: !prev[milestoneId]
        }))
    }

    // Calculate overall progress
    const overallProgress = milestones.reduce((acc, m) => {
        const progress = calculateMilestoneProgress(m, blockTaskStatuses)
        return {
            completed: acc.completed + progress.completed,
            total: acc.total + progress.total,
        }
    }, { completed: 0, total: 0 })
    
    const progressPercentage = overallProgress.total > 0 
        ? Math.round((overallProgress.completed / overallProgress.total) * 100) 
        : 0

    return (
        <BlockContainer 
            title={content.title} 
            description={content.description}
        >
            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Completed tasks</span>
                    <span>{progressPercentage}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Milestones accordion */}
            <div className="space-y-2">
                {milestones.map((milestone: Milestone) => {
                    const progress = calculateMilestoneProgress(milestone, blockTaskStatuses)
                    const tasks = milestone.tasks || []
                    const isOpen = openMilestones[milestone.id] ?? false

                    return (
                        <Collapsible
                            key={milestone.id}
                            open={isOpen}
                            onOpenChange={() => toggleMilestone(milestone.id)}
                        >
                            {/* Milestone header row */}
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/30 bg-muted/10">
                                    {/* Circular progress */}
                                    <CircularProgress
                                        value={progress.percentage}
                                        size={24}
                                        strokeWidth={2.5}
                                        className="shrink-0"
                                    />

                                    {/* Milestone title */}
                                    <span className="flex-1 font-medium text-sm">
                                        {milestone.title}
                                    </span>

                                    {/* Chevron */}
                                    <ChevronRight
                                        className={cn(
                                            'size-5 text-muted-foreground transition-transform duration-200',
                                            isOpen && 'rotate-90'
                                        )}
                                    />
                                </div>
                            </CollapsibleTrigger>

                            {/* Tasks content */}
                            <CollapsibleContent>
                                <div className="pl-4 pr-2 py-2 space-y-1">
                                    {tasks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-2 pl-9">
                                            No tasks in this milestone
                                        </p>
                                    ) : (
                                        tasks.map((task) => {
                                            const taskCompositeId = getTaskCompositeId(milestone.id, task.id)
                                            const fullCompositeId = `${blockId}-${taskCompositeId}`
                                            const status = ctx.tasks?.[fullCompositeId] || 'pending'
                                            const isCompleted = status === 'completed'
                                            const canComplete = ctx.interactive && permissions.customerCanComplete

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={cn(
                                                        'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors',
                                                        canComplete && 'cursor-pointer hover:bg-muted/30'
                                                    )}
                                                    onClick={() =>
                                                        canComplete && ctx.toggleTask?.(fullCompositeId, task.title)
                                                    }
                                                >
                                                    {/* Checkbox */}
                                                    <div
                                                        className={cn(
                                                            'size-5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                                                            isCompleted
                                                                ? 'bg-emerald-500 border-emerald-500'
                                                                : 'bg-white border-muted-foreground/30',
                                                            !canComplete && 'opacity-50'
                                                        )}
                                                    >
                                                        {isCompleted && (
                                                            <Check className="size-3.5 text-white stroke-[3px]" />
                                                        )}
                                                    </div>

                                                    {/* Title + Info icon */}
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span
                                                            className={cn(
                                                                'text-sm',
                                                                isCompleted
                                                                    ? 'text-muted-foreground line-through'
                                                                    : 'text-foreground'
                                                            )}
                                                        >
                                                            {task.title}
                                                        </span>

                                                        {task.description && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Info className="size-4 text-muted-foreground hover:text-foreground shrink-0 cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-xs">
                                                                    {task.description}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {/* Quick Action Pill */}
                                                        {task.quickAction && (
                                                            <QuickActionPill 
                                                                quickAction={task.quickAction} 
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Assignee + Due date */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {task.assignee && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                <Avatar className="size-4 mr-1">
                                                                    {task.assignee.avatarUrl && (
                                                                        <AvatarImage
                                                                            src={task.assignee.avatarUrl}
                                                                            alt={task.assignee.name}
                                                                        />
                                                                    )}
                                                                    <AvatarFallback className="text-[8px]">
                                                                        {getInitials(task.assignee.name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                {task.assignee.name}
                                                            </Badge>
                                                        )}
                                                        {task.dueDate && !isCompleted && (
                                                            <Badge
                                                                variant={
                                                                    isPastDue(task.dueDate)
                                                                        ? 'destructive'
                                                                        : 'outline'
                                                                }
                                                                className="text-xs"
                                                            >
                                                                <CalendarIcon className="size-3 mr-1" />
                                                                {formatDate(task.dueDate)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Task Block (Deprecated - kept for backward compatibility)
// ============================================================================

function TaskBlock({ blockId, content }: { blockId: string; content: any }) {
    const ctx = useContext(BlockContext)
    const tasks = content.tasks || []

    if (tasks.length === 0) {
        return (
            <BlockContainer className="bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">No tasks</p>
            </BlockContainer>
        )
    }

    return (
        <BlockContainer>
            <div className="space-y-2">
                {tasks.map((task: any) => {
                    const taskId = `${blockId}-${task.id}`
                    const status = ctx.tasks?.[taskId] || 'pending'
                    const isCompleted = status === 'completed'
                    const canComplete = ctx.interactive

                    return (
                        <div
                            key={task.id}
                            className={cn(
                                "flex items-start gap-3 p-2.5 rounded-lg transition-colors",
                                canComplete && "cursor-pointer",
                                isCompleted ? "bg-muted/20" : canComplete && "hover:bg-muted/30"
                            )}
                            onClick={() => canComplete && ctx.toggleTask?.(taskId, task.title)}
                        >
                            <div className="pt-0.5">
                                <div className={cn(
                                    "size-4 rounded border-2 flex items-center justify-center transition-colors",
                                    isCompleted ? "bg-primary border-primary" : "bg-white border-muted"
                                )}>
                                    {isCompleted && <Check className="size-3 text-white stroke-[3px]" />}
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                                <span className={cn(
                                    "text-sm font-medium",
                                    isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                )}>
                                    {task.title || 'Untitled task'}
                                </span>
                                {task.dueDate && !isCompleted && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                        <CalendarIcon className="size-3" />
                                        <span>{format(new Date(task.dueDate), 'd MMM')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// File Upload Block
// ============================================================================

function FileUploadBlock({ blockId, content }: { blockId: string; content: any }) {
    const ctx = useContext(BlockContext)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const files = ctx.files?.[blockId] || []

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!ctx.interactive || !ctx.spaceId) return
        
        const file = e.target.files?.[0]
        if (!file) return

        if (content.maxFiles && files.length >= content.maxFiles) {
            alert(`Max ${content.maxFiles} file(s) allowed`)
            return
        }

        setIsUploading(true)
        setProgress(10)

        try {
            const supabase = createClient()
            const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'bin')
            const fileName = `${Math.random().toString(36).substring(2, 12)}.${fileExt}`
            const storagePath = sanitizeStoragePath(`portal/${ctx.spaceId}/${blockId}/${fileName}`)

            const { error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(storagePath, file)

            if (uploadError) throw uploadError
            setProgress(70)

            // Dynamic import to avoid SSR issues
            const { uploadFile: saveFileToDb } = await import('@/app/space/actions')
            const result = await saveFileToDb(
                blockId,
                ctx.spaceId,
                file.name,
                file.type,
                file.size,
                storagePath
            )

            if (result.error) throw new Error(result.error)

            ctx.addFile?.(blockId, result.file)
            setProgress(100)
            setTimeout(() => {
                setIsUploading(false)
                setProgress(0)
            }, 500)
        } catch (error: any) {
            console.error('Upload error:', error)
            alert('Could not upload file: ' + error.message)
            setIsUploading(false)
            setProgress(0)
        }
    }

    return (
        <BlockContainer
            title={content.title || content.label}
            description={content.description}
        >
            {/* Upload area */}
            <div className="bg-muted/10 border border-dashed rounded-lg p-5 hover:border-primary/40 transition-colors relative">
                {ctx.interactive && (
                    <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={onUpload}
                        disabled={isUploading}
                        accept={content.acceptedTypes?.join(',')}
                    />
                )}

                <div className="text-center space-y-3">
                    <div className="mx-auto size-12 rounded-lg bg-primary/5 flex items-center justify-center">
                        {isUploading ? (
                            <Loader2 className="size-6 text-primary animate-spin" />
                        ) : (
                            <FileUp className="size-6 text-primary" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            {ctx.interactive ? 'Click or drag to upload' : 'File upload area'}
                        </p>
                        {content.maxFileSize && (
                            <p className="text-xs text-muted-foreground">
                                Maximum file size of {content.maxFileSize}MB
                            </p>
                        )}
                    </div>
                    {isUploading && (
                        <div className="max-w-xs mx-auto space-y-2">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-xs font-medium text-primary">Uploading...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Uploaded files */}
            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        Uploaded files ({files.length})
                    </p>
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div 
                                key={file.id} 
                                className="flex items-center justify-between p-3 bg-muted/10 rounded-lg group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-8 rounded bg-primary/5 flex items-center justify-center shrink-0">
                                        <FileUp className="size-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                {ctx.interactive && (
                                    <button
                                        onClick={() => ctx.removeFile?.(blockId, file.id)}
                                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </BlockContainer>
    )
}

// ============================================================================
// File Download Block
// ============================================================================

function FileDownloadBlock({ content }: { content: any }) {
    const ctx = useContext(BlockContext)
    const files = content.files || []

    const getFileIcon = (type: string) => {
        if (type?.includes('pdf')) return FileText
        if (type?.includes('word') || type?.includes('document')) return FileText
        if (type?.includes('excel') || type?.includes('spreadsheet') || type?.includes('csv')) return FileSpreadsheet
        if (type?.includes('image')) return ImageIcon
        return File
    }

    const getFileIconColor = (type: string): string => {
        if (type?.includes('pdf')) return 'text-red-500 bg-red-50'
        if (type?.includes('word') || type?.includes('document')) return 'text-blue-500 bg-blue-50'
        if (type?.includes('excel') || type?.includes('spreadsheet') || type?.includes('csv')) return 'text-green-500 bg-green-50'
        if (type?.includes('image')) return 'text-purple-500 bg-purple-50'
        return 'text-muted-foreground bg-muted'
    }

    const formatFileSize = (bytes: number): string => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const handleDownload = async (file: any) => {
        if (!ctx.interactive) return
        
        try {
            if (!isValidStoragePath(file.storagePath)) {
                throw new Error('Invalid file path')
            }

            const supabase = createClient()
            const safePath = sanitizeStoragePath(file.storagePath)
            const { data, error } = await supabase.storage
                .from('project-files')
                .createSignedUrl(safePath, 3600)

            if (error) throw error

            // Log the download activity
            if (ctx.spaceId) {
                const { logFileDownload } = await import('@/app/space/actions')
                await logFileDownload(ctx.spaceId, file.id, file.name)
            }

            window.open(data.signedUrl, '_blank')
        } catch (error) {
            console.error('Download error:', error)
            alert('Could not download file')
        }
    }

    if (files.length === 0 && !content.title && !content.description) {
        return (
            <BlockContainer className="bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">No files added yet</p>
            </BlockContainer>
        )
    }

    return (
        <BlockContainer
            title={content.title}
            description={content.description}
        >
            {files.length > 0 ? (
                <div className="space-y-2">
                    {files.map((file: any) => {
                        const Icon = getFileIcon(file.type)
                        const iconColor = getFileIconColor(file.type)

                        return (
                            <div
                                key={file.id}
                                className={cn(
                                    "flex items-center gap-3 p-3 bg-muted/10 rounded-lg transition-colors",
                                    ctx.interactive && "cursor-pointer hover:bg-muted/20"
                                )}
                                onClick={() => handleDownload(file)}
                            >
                                <div className={cn("p-2 rounded shrink-0", iconColor)}>
                                    <Icon className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <div className="shrink-0 p-2 rounded bg-primary/5 text-primary">
                                    <Download className="size-4" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center p-5 rounded-lg border border-dashed bg-muted/10">
                    <p className="text-sm text-muted-foreground">No files added yet</p>
                </div>
            )}
        </BlockContainer>
    )
}

// ============================================================================
// Form Block
// ============================================================================

function FormBlock({ blockId, content }: { blockId: string; content: any }) {
    const ctx = useContext(BlockContext)
    const [savingId, setSavingId] = useState<string | null>(null)
    const questions = content.questions || []

    const handleChange = async (questionId: string, newValue: any) => {
        if (!ctx.interactive) return
        setSavingId(questionId)
        const responseKey = `${blockId}-${questionId}`
        await ctx.updateResponse?.(responseKey, newValue)
        setSavingId(null)
    }

    if (questions.length === 0) {
        return (
            <BlockContainer 
                title={content.title} 
                description={content.description}
                className="bg-muted/10"
            >
                <p className="text-sm text-muted-foreground text-center">No questions added yet</p>
            </BlockContainer>
        )
    }

    return (
        <BlockContainer
            title={content.title}
            description={content.description}
        >
            <div className="space-y-4">
                {questions.map((question: any) => {
                    const responseKey = `${blockId}-${question.id}`
                    const value = ctx.responses?.[responseKey] || {}
                    const isSaving = savingId === question.id

                    return (
                        <div key={question.id} className="space-y-2">
                            <div className="flex items-start justify-between gap-4">
                                <h4 className="font-medium text-sm text-foreground">
                                    {question.question || 'Untitled question'}
                                    {question.required && <span className="text-destructive ml-1">*</span>}
                                </h4>
                                {isSaving && <Loader2 className="size-3 text-primary animate-spin shrink-0" />}
                            </div>

                            <div>
                                {question.type === 'text' && (
                                    ctx.interactive ? (
                                        <Input
                                            placeholder="Your answer..."
                                            value={value.text || ''}
                                            onChange={(e) => ctx.updateResponse?.(responseKey, { text: e.target.value })}
                                            onBlur={() => handleChange(question.id, { text: value.text })}
                                            className="h-9 text-sm"
                                        />
                                    ) : (
                                        <div className="h-9 bg-muted/30 rounded-lg border px-3 flex items-center">
                                            <span className="text-sm text-muted-foreground">Short answer...</span>
                                        </div>
                                    )
                                )}
                                {question.type === 'textarea' && (
                                    ctx.interactive ? (
                                        <Textarea
                                            placeholder="Write a longer answer..."
                                            value={value.text || ''}
                                            onChange={(e) => ctx.updateResponse?.(responseKey, { text: e.target.value })}
                                            onBlur={() => handleChange(question.id, { text: value.text })}
                                            className="min-h-[80px] text-sm"
                                        />
                                    ) : (
                                        <div className="min-h-[80px] bg-muted/30 rounded-lg border p-3">
                                            <span className="text-sm text-muted-foreground">Long answer...</span>
                                        </div>
                                    )
                                )}
                                {question.type === 'select' && (
                                    ctx.interactive ? (
                                        <Select
                                            value={value.selected || ''}
                                            onValueChange={(val) => handleChange(question.id, { selected: val })}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Select an option..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(question.options || []).map((o: string) => (
                                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="h-9 bg-muted/30 rounded-lg border px-3 flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Select an option...</span>
                                            <ChevronDown className="size-4 text-muted-foreground" />
                                        </div>
                                    )
                                )}
                                {question.type === 'multiselect' && (
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {(question.options || ['Option 1', 'Option 2']).slice(0, 4).map((o: string, i: number) => {
                                            const isChecked = ctx.interactive && (value.selected || []).includes(o)
                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
                                                        ctx.interactive && "cursor-pointer",
                                                        isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                                                    )}
                                                    onClick={() => {
                                                        if (!ctx.interactive) return
                                                        const current = value.selected || []
                                                        const next = isChecked ? current.filter((v: string) => v !== o) : [...current, o]
                                                        handleChange(question.id, { selected: next })
                                                    }}
                                                >
                                                    <div className={cn(
                                                        "size-4 rounded border-2 flex items-center justify-center shrink-0",
                                                        isChecked ? "bg-primary border-primary" : "bg-white border-muted"
                                                    )}>
                                                        {isChecked && <Check className="size-3 text-white stroke-[3px]" />}
                                                    </div>
                                                    <span className="text-sm font-medium">{o}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                {question.type === 'date' && (
                                    ctx.interactive ? (
                                        <Input
                                            type="date"
                                            value={value.date || ''}
                                            onChange={(e) => handleChange(question.id, { date: e.target.value })}
                                            className="h-9 text-sm"
                                        />
                                    ) : (
                                        <div className="h-9 bg-muted/30 rounded-lg border px-3 flex items-center gap-2">
                                            <CalendarIcon className="size-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">Select date...</span>
                                        </div>
                                    )
                                )}
                            </div>

                            {ctx.interactive && (value.text || value.selected || value.date) && !isSaving && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Check className="size-3" />
                                    <span>Saved</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Embed Block
// ============================================================================

function EmbedBlock({ content }: { content: any }) {
    if (!content.url) {
        return (
            <BlockContainer 
                title={content.title}
                description={content.description}
            >
                <div className="aspect-video rounded-lg flex items-center justify-center bg-muted/10 border border-dashed">
                    <p className="text-sm text-muted-foreground">No video URL set</p>
                </div>
            </BlockContainer>
        )
    }

    const getEmbedUrl = (url: string) => {
        if (url.includes('loom.com/share/')) return url.replace('loom.com/share/', 'loom.com/embed/')
        if (url.includes('youtube.com/watch?v=')) {
            try {
                return `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`
            } catch {
                return url
            }
        }
        if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('/').pop()}`
        return url
    }

    return (
        <BlockContainer
            title={content.title}
            description={content.description}
            noPadding
        >
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
                <iframe
                    src={getEmbedUrl(content.url)}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Contact Block
// ============================================================================

function ContactBlock({ content }: { content: any }) {
    const initials = content.name
        ? content.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    return (
        <BlockContainer>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Avatar className="size-16 border-2 border-background">
                    <AvatarImage src={content.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
                    <div className="space-y-0.5">
                        <h4 className="text-lg font-semibold text-foreground truncate">
                            {content.name || 'Name not set'}
                        </h4>
                        {content.title && (
                            <p className="text-sm text-muted-foreground">{content.title}</p>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                        {content.email && (
                            <a 
                                href={`mailto:${content.email}`} 
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Mail className="size-4" />
                                <span className="truncate">{content.email}</span>
                            </a>
                        )}
                        {content.phone && (
                            <a 
                                href={`tel:${content.phone}`} 
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Phone className="size-4" />
                                <span>{content.phone}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Divider Block (Deprecated - kept for backward compatibility)
// ============================================================================

function DividerBlock({ content }: { content: any }) {
    if (content.style === 'space') {
        return <div className="h-8" />
    }
    return (
        <div className="py-6 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <div className="size-1 bg-muted-foreground/30 rounded-full" />
            <div className="h-px bg-border flex-1" />
        </div>
    )
}

// ============================================================================
// Media Block
// ============================================================================

interface MediaBlockContent {
    title?: string
    description?: string
    imageUrl?: string
    storagePath?: string
    layout?: 'left' | 'right' | 'full'
    aspectRatio?: 'auto' | '16:9' | '4:3' | '1:1' | '3:2'
    imageFit?: 'cover' | 'contain'
}

function MediaBlock({ content }: { content: MediaBlockContent }) {
    const layout = content.layout || 'left'
    const aspectRatio = content.aspectRatio || 'auto'
    const imageFit = content.imageFit || 'cover'
    const [imageUrl, setImageUrl] = useState<string | null>(content.imageUrl || null)
    const [isLoading, setIsLoading] = useState(false)

    // Fetch signed URL if we have a storagePath but no valid imageUrl
    useEffect(() => {
        async function fetchSignedUrl() {
            if (!content.storagePath) return
            
            // If we already have an imageUrl that works, use it
            if (content.imageUrl) {
                setImageUrl(content.imageUrl)
                return
            }

            setIsLoading(true)
            try {
                const supabase = createClient()
                const { data, error } = await supabase.storage
                    .from('project-files')
                    .createSignedUrl(content.storagePath, 3600) // 1 hour

                if (!error && data) {
                    setImageUrl(data.signedUrl)
                }
            } catch (error) {
                console.error('Failed to fetch signed URL:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSignedUrl()
    }, [content.storagePath, content.imageUrl])

    // Get CSS classes for aspect ratio
    const getAspectRatioClasses = () => {
        switch (aspectRatio) {
            case '16:9': return 'aspect-video'
            case '4:3': return 'aspect-[4/3]'
            case '1:1': return 'aspect-square'
            case '3:2': return 'aspect-[3/2]'
            case 'auto':
            default: return 'max-h-[500px]'
        }
    }

    // Get CSS classes for image fit
    const getImageFitClass = () => {
        return imageFit === 'contain' ? 'object-contain' : 'object-cover'
    }

    const renderImage = () => {
        const aspectClass = getAspectRatioClasses()
        const fitClass = getImageFitClass()
        const isAutoAspect = aspectRatio === 'auto'

        if (isLoading) {
            return (
                <div className={cn(
                    "bg-muted/20 rounded-lg flex items-center justify-center",
                    isAutoAspect ? "min-h-[200px]" : aspectClass
                )}>
                    <Loader2 className="size-8 text-muted-foreground/50 animate-spin" />
                </div>
            )
        }
        
        if (imageUrl) {
            // For 'auto' aspect ratio, we use natural dimensions with max-height
            if (isAutoAspect) {
                return (
                    <img 
                        src={imageUrl} 
                        alt={content.title || 'Media'} 
                        className={cn(
                            "w-full h-auto rounded-lg max-h-[500px]",
                            fitClass
                        )}
                        onError={() => setImageUrl(null)}
                    />
                )
            }
            
            // For fixed aspect ratios, use a container with the aspect ratio
            return (
                <div className={cn("relative rounded-lg overflow-hidden", aspectClass)}>
                    <img 
                        src={imageUrl} 
                        alt={content.title || 'Media'} 
                        className={cn(
                            "absolute inset-0 w-full h-full rounded-lg",
                            fitClass
                        )}
                        onError={() => setImageUrl(null)}
                    />
                </div>
            )
        }
        
        return (
            <div className={cn(
                "bg-muted/20 rounded-lg flex items-center justify-center",
                isAutoAspect ? "min-h-[200px]" : aspectClass
            )}>
                <ImageIcon className="size-12 text-muted-foreground/30" />
            </div>
        )
    }

    // Full width layout
    if (layout === 'full') {
        return (
            <BlockContainer noPadding>
                <div className="p-5 pb-0">
                    {renderImage()}
                </div>
                {(content.title || content.description) && (
                    <div className="p-5">
                        {content.title && (
                            <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
                        )}
                        {content.description && (
                            <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
                        )}
                    </div>
                )}
            </BlockContainer>
        )
    }

    // Side-by-side layout (left or right)
    return (
        <BlockContainer>
            <div className={cn(
                "flex flex-col sm:flex-row gap-5",
                layout === 'right' && "sm:flex-row-reverse"
            )}>
                {/* Image */}
                <div className="sm:w-1/2 shrink-0">
                    {renderImage()}
                </div>

                {/* Text content */}
                <div className="sm:w-1/2 flex flex-col justify-center">
                    {content.title && (
                        <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
                    )}
                    {content.description && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            {content.description}
                        </p>
                    )}
                    {!content.title && !content.description && (
                        <p className="text-sm text-muted-foreground italic">
                            Add title and description...
                        </p>
                    )}
                </div>
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Accordion Block (New - Design only)
// ============================================================================

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

function AccordionBlock({ content }: { content: AccordionBlockContent }) {
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
        // First item open by default
        if (content.items && content.items.length > 0) {
            return { [content.items[0].id]: true }
        }
        return {}
    })

    const items = content.items || []

    const toggleItem = (id: string) => {
        setOpenItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    if (items.length === 0) {
        return (
            <BlockContainer
                title={content.title}
                description={content.description}
            >
                <div className="text-center p-5 rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">No accordion items added yet</p>
                </div>
            </BlockContainer>
        )
    }

    return (
        <BlockContainer
            title={content.title}
            description={content.description}
        >
            <div className="space-y-2">
                {items.map((item) => {
                    const isOpen = openItems[item.id] ?? false

                    return (
                        <Collapsible
                            key={item.id}
                            open={isOpen}
                            onOpenChange={() => toggleItem(item.id)}
                        >
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/30 bg-muted/10">
                                    <ChevronRight
                                        className={cn(
                                            'size-5 text-muted-foreground transition-transform duration-200',
                                            isOpen && 'rotate-90'
                                        )}
                                    />
                                    <span className="flex-1 font-medium text-sm">
                                        {item.title || 'Untitled section'}
                                    </span>
                                </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <div className="px-11 py-3">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {item.content || 'No content'}
                                    </p>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Exports
// ============================================================================

export { BlockContainer } from './block-container'
export type { BlockInteractionContext }
