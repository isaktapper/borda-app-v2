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
    Zap,
    ArrowRight,
    Circle,
    PartyPopper,
    Clock,
    AlertCircle,
    Eye,
} from 'lucide-react'
import Link from 'next/link'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react'
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
    page_slug?: string  // Page slug for navigation
}

interface BlockInteractionContext {
    /** Whether the block is interactive (portal) or read-only (editor preview) */
    interactive: boolean
    /** Space ID for file operations */
    spaceId?: string
    /** All blocks in the current page (for cross-block references like NextTaskBlock) */
    allBlocks?: Block[]
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
// Mini Confetti Component - Small celebration when task is completed
// ============================================================================

function MiniConfetti({ isActive }: { isActive: boolean }) {
    if (!isActive) return null
    
    // Generate 12 particles with random directions for a fuller effect
    const particles = Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 360
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
        const color = colors[i % colors.length]
        return { angle, color, delay: i * 15 }
    })

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            {particles.map((particle, i) => (
                <div
                    key={i}
                    className="absolute left-1/2 top-1/2 size-2 rounded-full animate-confetti-burst"
                    style={{
                        backgroundColor: particle.color,
                        '--confetti-angle': `${particle.angle}deg`,
                        animationDelay: `${particle.delay}ms`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    )
}

// Next Task Block Types
interface NextTaskBlockContent {
    title?: string
    description?: string
    actionPlanBlockIds: string[]  // Selected action plan blocks
    sortMode: 'smart' | 'due_date' | 'order'  // Smart = overdue > due date > order
    layoutStyle: 'bold' | 'light'
    showProgress: boolean         // Show "X of Y tasks remaining"
    showMilestoneName: boolean    // Show which milestone the task belongs to
}

// Action Plan Progress Block Types
interface ActionPlanProgressContent {
    title?: string
    description?: string
    viewMode: 'single' | 'multiple'  // Single = milestones in one plan, Multiple = overview of multiple plans
    actionPlanBlockIds: string[]     // Selected action plan blocks
    showUpcomingTasks: boolean       // Show upcoming tasks in popover
    maxUpcomingTasks: number         // Max number of tasks to show (default 3)
}

interface ResolvedTask {
    blockId: string
    milestoneId: string
    milestoneTitle: string
    taskId: string
    compositeId: string  // blockId-milestoneId-taskId format
    pageSlug?: string  // Page slug for navigation to the action plan
    task: {
        id: string
        title: string
        description?: string
        dueDate?: string
        assignee?: {
            type: 'staff' | 'stakeholder'
            name: string
            avatarUrl?: string
        }
        quickAction?: {
            type: 'link' | 'go_to_page' | 'go_to_block'
            title: string
            url?: string
            pageId?: string
            blockId?: string
        }
    }
    priority: number  // Lower = higher priority
}

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
        case 'timeline':
            return <TimelineBlock content={block.content} />
        case 'next_task':
            return <NextTaskBlock blockId={block.id} content={block.content} />
        case 'action_plan_progress':
            return <ActionPlanProgressBlock blockId={block.id} content={block.content} />
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
        stakeholderCanEdit: true,
        stakeholderCanComplete: true,
    }

    // Track which milestones are open (first one open by default)
    const [openMilestones, setOpenMilestones] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        if (milestones.length > 0) {
            initial[milestones[0].id] = true
        }
        return initial
    })

    // Track confetti for recently completed tasks
    const [confettiTaskId, setConfettiTaskId] = useState<string | null>(null)

    const handleTaskToggle = useCallback((fullCompositeId: string, title: string, wasCompleted: boolean) => {
        if (!wasCompleted) {
            // Task is being completed - show confetti
            setConfettiTaskId(fullCompositeId)
            setTimeout(() => setConfettiTaskId(null), 600)
        }
        ctx.toggleTask?.(fullCompositeId, title)
    }, [ctx])

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
                                            const canComplete = ctx.interactive && permissions.stakeholderCanComplete

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={cn(
                                                        'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors',
                                                        canComplete && 'cursor-pointer hover:bg-muted/30'
                                                    )}
                                                    onClick={() =>
                                                        canComplete && handleTaskToggle(fullCompositeId, task.title, isCompleted)
                                                    }
                                                >
                                                    {/* Checkbox with confetti */}
                                                    <div className="relative shrink-0">
                                                        <div
                                                            className={cn(
                                                                'size-5 rounded border-2 flex items-center justify-center transition-colors',
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
                                                        <MiniConfetti isActive={confettiTaskId === fullCompositeId} />
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
    const [confettiTaskId, setConfettiTaskId] = useState<string | null>(null)

    const handleTaskToggle = useCallback((taskId: string, title: string, wasCompleted: boolean) => {
        if (!wasCompleted) {
            setConfettiTaskId(taskId)
            setTimeout(() => setConfettiTaskId(null), 600)
        }
        ctx.toggleTask?.(taskId, title)
    }, [ctx])

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
                            onClick={() => canComplete && handleTaskToggle(taskId, task.title, isCompleted)}
                        >
                            <div className="pt-0.5 relative">
                                <div className={cn(
                                    "size-4 rounded border-2 flex items-center justify-center transition-colors",
                                    isCompleted ? "bg-primary border-primary" : "bg-white border-muted"
                                )}>
                                    {isCompleted && <Check className="size-3 text-white stroke-[3px]" />}
                                </div>
                                <MiniConfetti isActive={confettiTaskId === taskId} />
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

    const formatFileSize = (bytes: number | null | undefined): string => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

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
                                        <p className="text-sm font-medium truncate">{file.original_name || file.name || 'Unnamed file'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.file_size_bytes ?? file.size)}
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

interface ContactBlockContent {
    name?: string
    title?: string
    email?: string
    phone?: string
    avatarUrl?: string
    avatarStoragePath?: string
}

function ContactBlock({ content }: { content: ContactBlockContent }) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(content.avatarUrl || null)
    
    const initials = content.name
        ? content.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    // Fetch signed URL if we have a avatarStoragePath (same pattern as MediaBlock)
    useEffect(() => {
        async function fetchSignedUrl() {
            if (!content.avatarStoragePath) return
            
            // If we already have an avatarUrl that works, use it
            if (content.avatarUrl) {
                setAvatarUrl(content.avatarUrl)
                return
            }

            try {
                const supabase = createClient()
                const { data, error } = await supabase.storage
                    .from('project-files')
                    .createSignedUrl(content.avatarStoragePath, 3600) // 1 hour

                if (!error && data) {
                    setAvatarUrl(data.signedUrl)
                }
            } catch (error) {
                console.error('Failed to fetch signed URL for avatar:', error)
            }
        }

        fetchSignedUrl()
    }, [content.avatarStoragePath, content.avatarUrl])

    return (
        <BlockContainer>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Avatar className="size-16 border-2 border-background">
                    <AvatarImage src={avatarUrl || undefined} className="object-cover" />
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
// Timeline Block
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

function TimelineBlock({ content }: { content: TimelineBlockContent }) {
    const phases = content.phases || []
    const showDates = content.showDates ?? true

    if (phases.length === 0) {
        return (
            <BlockContainer
                title={content.title}
                description={content.description}
            >
                <div className="text-center p-5 rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">No phases added yet</p>
                </div>
            </BlockContainer>
        )
    }

    return (
        <BlockContainer
            title={content.title}
            description={content.description}
        >
            {/* Horizontal scroll container */}
            <div className="overflow-x-auto">
                <div className="flex justify-center min-w-min py-1">
                    {phases.map((phase, index) => (
                        <TimelinePhaseCard 
                            key={phase.id} 
                            phase={phase} 
                            showDate={showDates}
                            isFirst={index === 0}
                            isLast={index === phases.length - 1}
                        />
                    ))}
                </div>
            </div>
        </BlockContainer>
    )
}

function TimelinePhaseCard({ 
    phase, 
    showDate,
    isFirst,
    isLast 
}: { 
    phase: TimelinePhase
    showDate: boolean
    isFirst: boolean
    isLast: boolean
}) {
    const getStatusStyles = () => {
        switch (phase.status) {
            case 'completed':
                return {
                    iconBg: 'bg-emerald-100 text-emerald-600',
                    connector: 'bg-emerald-400',
                    border: 'border-emerald-200',
                    glow: '',
                }
            case 'current':
                return {
                    iconBg: 'bg-primary/10 text-primary',
                    connector: 'bg-primary/30',
                    border: 'border-primary/30',
                    glow: 'ring-2 ring-primary/20',
                }
            case 'upcoming':
                return {
                    iconBg: 'bg-muted text-muted-foreground',
                    connector: 'bg-muted',
                    border: 'border-muted',
                    glow: '',
                }
        }
    }

    const styles = getStatusStyles()

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'd MMM')
        } catch {
            return dateString
        }
    }

    return (
        <div className="relative flex flex-col items-center shrink-0 px-4">
            {/* Connector line - positioned at card center height */}
            <div 
                className="absolute top-[65px] h-0.5 z-0"
                style={{
                    left: isFirst ? '50%' : '-16px',
                    right: isLast ? '50%' : '-16px',
                }}
            >
                <div className={cn("w-full h-full", styles.connector)} />
            </div>

            {/* Phase card - fixed height for consistency */}
            {phase.description ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "relative z-10 flex flex-col items-center justify-between w-[120px] h-[130px] py-4 px-3 rounded-lg bg-white border cursor-help",
                            styles.border,
                            styles.glow
                        )}>
                            {/* Info icon indicator */}
                            <Info className="absolute top-2 right-2 size-3.5 text-muted-foreground/50" />
                            
                            {/* Status icon */}
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                styles.iconBg
                            )}>
                                {phase.status === 'completed' && <Check className="size-5" />}
                                {phase.status === 'current' && <ArrowRight className="size-5" />}
                                {phase.status === 'upcoming' && <Circle className="size-4" />}
                            </div>

                            {/* Date - always reserve space */}
                            <span className="text-xs text-muted-foreground shrink-0">
                                {showDate && phase.date ? formatDate(phase.date) : '\u00A0'}
                            </span>

                            {/* Title at bottom */}
                            <span className={cn(
                                "text-sm font-medium text-center line-clamp-2",
                                phase.status === 'upcoming' && 'text-muted-foreground'
                            )}>
                                {phase.title || 'Untitled'}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-sm">{phase.description}</p>
                    </TooltipContent>
                </Tooltip>
            ) : (
                <div className={cn(
                    "relative z-10 flex flex-col items-center justify-between w-[120px] h-[130px] py-4 px-3 rounded-lg bg-white border",
                    styles.border,
                    styles.glow
                )}>
                    {/* Status icon */}
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        styles.iconBg
                    )}>
                        {phase.status === 'completed' && <Check className="size-5" />}
                        {phase.status === 'current' && <ArrowRight className="size-5" />}
                        {phase.status === 'upcoming' && <Circle className="size-4" />}
                    </div>

                    {/* Date - always reserve space */}
                    <span className="text-xs text-muted-foreground shrink-0">
                        {showDate && phase.date ? formatDate(phase.date) : '\u00A0'}
                    </span>

                    {/* Title at bottom */}
                    <span className={cn(
                        "text-sm font-medium text-center line-clamp-2",
                        phase.status === 'upcoming' && 'text-muted-foreground'
                    )}>
                        {phase.title || 'Untitled'}
                    </span>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// Next Task Block
// ============================================================================

interface NextTaskBlockProps {
    blockId: string
    content: NextTaskBlockContent
    allBlocks?: Block[]  // All blocks in the space for resolving action plans
}

function NextTaskBlock({ blockId, content }: NextTaskBlockProps) {
    const ctx = useContext(BlockContext)
    const [fetchedBlocks, setFetchedBlocks] = useState<Block[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showConfetti, setShowConfetti] = useState(false)
    const [useDarkText, setUseDarkText] = useState(false)
    
    const layoutStyle = content.layoutStyle || 'light'
    const showProgress = content.showProgress ?? true
    const showMilestoneName = content.showMilestoneName ?? true
    const sortMode = content.sortMode || 'smart'

    // Calculate if brand color is light (needs dark text) or dark (needs light text)
    useEffect(() => {
        if (layoutStyle !== 'bold') return
        
        // Get the computed primary color from CSS variable
        const computedStyle = getComputedStyle(document.documentElement)
        const primaryHsl = computedStyle.getPropertyValue('--primary').trim()
        
        if (primaryHsl) {
            // Parse HSL values (format: "h s% l%" e.g. "262 83% 58%")
            const hslMatch = primaryHsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%?\s+(\d+(?:\.\d+)?)%?/)
            if (hslMatch) {
                const lightness = parseFloat(hslMatch[3])
                // If lightness > 60%, use dark text; otherwise use light text
                setUseDarkText(lightness > 60)
            }
        }
    }, [layoutStyle])

    // Text colors based on brand color brightness
    const textColor = useDarkText ? 'text-black' : 'text-white'
    const textColorMuted = useDarkText ? 'text-black/70' : 'text-white/70'
    const textColorSubtle = useDarkText ? 'text-black/60' : 'text-white/60'
    const bgOverlay = useDarkText ? 'bg-black/10' : 'bg-white/10'
    const bgOverlayHover = useDarkText ? 'bg-black/20' : 'bg-white/20'
    const borderColor = useDarkText ? 'border-black/30' : 'border-white/50'
    const borderColorHover = useDarkText ? 'border-black/50' : 'border-white'

    // Get action plan blocks - combine context blocks (same page) with database fetch (other pages)
    // If actionPlanBlockIds is empty/undefined or is "all", fetch ALL action plans for the space
    useEffect(() => {
        async function fetchActionPlans() {
            // Handle both new format (actionPlanBlockIds) and legacy format (actionPlanIds)
            // Legacy format used 'all' string, new format uses empty array
            const rawBlockIds: unknown = content.actionPlanBlockIds || (content as any).actionPlanIds
            const blockIds: string[] = rawBlockIds === 'all' ? [] : (Array.isArray(rawBlockIds) ? rawBlockIds : [])
            const selectAll = !blockIds.length
            
            // Start with blocks from context (blocks on the same page in editor mode)
            let foundBlocks: Block[] = []
            let missingIds: string[] = selectAll ? [] : [...(Array.isArray(blockIds) ? blockIds : [])]

            if (ctx.allBlocks) {
                const contextBlocks = selectAll
                    ? ctx.allBlocks.filter(b => b.type === 'action_plan')
                    : ctx.allBlocks.filter(
                        b => b.type === 'action_plan' && Array.isArray(blockIds) && blockIds.includes(b.id)
                    )
                foundBlocks = contextBlocks
                
                // Find which IDs are still missing (might be on other pages)
                if (!selectAll && Array.isArray(blockIds)) {
                    const foundIds = new Set(contextBlocks.map(b => b.id))
                    missingIds = blockIds.filter((id: string) => !foundIds.has(id))
                }
            }

            // NOTE: We always fetch from DB to get page_slug, even when blocks are found in context

            // Fetch blocks from database (for blocks on other pages or in portal mode)
            try {
                const supabase = createClient()
                
                // Helper to transform blocks with page slug
                // Supabase returns page as object for singular relations
                const getPageSlug = (page: any): string | undefined => {
                    if (!page) return undefined
                    if (Array.isArray(page)) return page[0]?.slug
                    return page.slug
                }
                
                const transformBlocks = (blocks: any[]): Block[] => 
                    blocks.map(b => ({
                        id: b.id,
                        type: b.type,
                        content: b.content,
                        sort_order: b.sort_order,
                        page_slug: getPageSlug(b.page)
                    }))
                
                if (selectAll) {
                    // Fetch all action plans for the space via pages
                    if (ctx.spaceId) {
                        const { data: pages } = await supabase
                            .from('pages')
                            .select('id')
                            .eq('space_id', ctx.spaceId)
                        
                        if (pages && pages.length > 0) {
                            const pageIds = pages.map(p => p.id)
                            const { data: dbBlocks } = await supabase
                                .from('blocks')
                                .select('id, type, content, sort_order, page:pages(slug)')
                                .eq('type', 'action_plan')
                                .in('page_id', pageIds)
                            
                            // Use DB blocks (with page_slug) and merge content from context blocks
                            // This ensures we have page_slug while keeping fresh content from context
                            const dbBlocksMap = new Map((dbBlocks || []).map(b => [b.id, b]))
                            const mergedBlocks: Block[] = []
                            
                            // First, add context blocks with page_slug from DB
                            for (const ctxBlock of foundBlocks) {
                                const dbBlock = dbBlocksMap.get(ctxBlock.id)
                                mergedBlocks.push({
                                    ...ctxBlock,
                                    page_slug: getPageSlug(dbBlock?.page)
                                })
                                dbBlocksMap.delete(ctxBlock.id) // Remove from map so we don't add it again
                            }
                            
                            // Then add remaining DB blocks (not in context)
                            for (const dbBlock of dbBlocksMap.values()) {
                                mergedBlocks.push(transformBlocks([dbBlock])[0])
                            }
                            
                            setFetchedBlocks(mergedBlocks)
                        } else {
                            setFetchedBlocks(foundBlocks)
                        }
                    } else {
                        setFetchedBlocks(foundBlocks)
                    }
                } else {
                    // Fetch specific IDs - also need to get page_slug for context blocks
                    const allBlockIds = [...new Set([...foundBlocks.map(b => b.id), ...missingIds])]
                    const { data: dbBlocks } = await supabase
                        .from('blocks')
                        .select('id, type, content, sort_order, page:pages(slug)')
                        .eq('type', 'action_plan')
                        .in('id', allBlockIds)
                    
                    // Merge: use context block content but add page_slug from DB
                    const dbBlocksMap = new Map((dbBlocks || []).map(b => [b.id, b]))
                    const mergedBlocks: Block[] = []
                    
                    for (const ctxBlock of foundBlocks) {
                        const dbBlock = dbBlocksMap.get(ctxBlock.id)
                        mergedBlocks.push({
                            ...ctxBlock,
                            page_slug: getPageSlug(dbBlock?.page)
                        })
                        dbBlocksMap.delete(ctxBlock.id)
                    }
                    
                    // Add remaining DB blocks
                    for (const dbBlock of dbBlocksMap.values()) {
                        mergedBlocks.push(transformBlocks([dbBlock])[0])
                    }
                    
                    setFetchedBlocks(mergedBlocks)
                }
            } catch (error) {
                console.error('Failed to fetch action plan blocks:', error)
                setFetchedBlocks(foundBlocks)
            } finally {
                setIsLoading(false)
            }
        }

        fetchActionPlans()
    }, [ctx.spaceId, ctx.allBlocks, content.actionPlanBlockIds])

    // Use fetched blocks for all operations
    const allBlocks = fetchedBlocks

    // Resolve next task using smart priority algorithm
    const resolveNextTask = (): ResolvedTask | null => {
        if (!allBlocks.length) return null

        const allTasks: ResolvedTask[] = []

        for (const block of allBlocks) {
            const actionPlanContent = block.content as ActionPlanContent
            const milestones = actionPlanContent.milestones || []

            for (const milestone of milestones) {
                for (const task of milestone.tasks || []) {
                    const compositeId = `${block.id}-${milestone.id}-${task.id}`
                    const status = ctx.tasks?.[compositeId] || 'pending'

                    // Skip completed tasks
                    if (status === 'completed') continue

                    // Calculate priority based on sort mode
                    let priority = 0
                    if (sortMode === 'smart' || sortMode === 'due_date') {
                        if (task.dueDate) {
                            const dueDate = new Date(task.dueDate)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            dueDate.setHours(0, 0, 0, 0)
                            
                            const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                            
                            if (daysDiff < 0) {
                                // Overdue: negative priority (highest)
                                priority = daysDiff - 1000
                            } else if (daysDiff === 0) {
                                // Due today
                                priority = -500
                            } else {
                                // Future: positive priority based on days
                                priority = daysDiff
                            }
                        } else {
                            // No due date: lower priority
                            priority = sortMode === 'smart' ? 10000 + milestone.sortOrder * 100 + (milestone.tasks?.indexOf(task) || 0) : 10000
                        }
                    } else {
                        // Order mode: priority by sort order
                        priority = (block.sort_order || 0) * 10000 + milestone.sortOrder * 100 + (milestone.tasks?.indexOf(task) || 0)
                    }

                    allTasks.push({
                        blockId: block.id,
                        milestoneId: milestone.id,
                        milestoneTitle: milestone.title,
                        taskId: task.id,
                        compositeId,
                        pageSlug: block.page_slug,
                        task: {
                            id: task.id,
                            title: task.title,
                            description: task.description,
                            dueDate: task.dueDate,
                            assignee: task.assignee,
                            quickAction: task.quickAction,
                        },
                        priority,
                    })
                }
            }
        }

        // Sort by priority (lower = higher priority)
        allTasks.sort((a, b) => a.priority - b.priority)

        return allTasks[0] || null
    }

    // Calculate progress stats
    const getProgressStats = () => {
        let total = 0
        let completed = 0

        for (const block of allBlocks) {
            const actionPlanContent = block.content as ActionPlanContent
            const milestones = actionPlanContent.milestones || []

            for (const milestone of milestones) {
                for (const task of milestone.tasks || []) {
                    total++
                    const compositeId = `${block.id}-${milestone.id}-${task.id}`
                    if (ctx.tasks?.[compositeId] === 'completed') {
                        completed++
                    }
                }
            }
        }

        return { total, completed, remaining: total - completed }
    }

    const nextTask = resolveNextTask()
    const progress = getProgressStats()

    // Handle task completion
    const handleComplete = async () => {
        if (!nextTask || !ctx.toggleTask) return
        
        setShowConfetti(true)
        ctx.toggleTask(nextTask.compositeId, nextTask.task.title)
        
        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 2000)
    }

    // Check if task is overdue or due today
    const getDueStatus = (dueDate?: string) => {
        if (!dueDate) return null
        const date = new Date(dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        date.setHours(0, 0, 0, 0)
        
        const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff < 0) return 'overdue'
        if (daysDiff === 0) return 'today'
        return 'upcoming'
    }

    // Loading state
    if (isLoading) {
        if (layoutStyle === 'bold') {
            return (
                <div className="bg-primary rounded-lg p-5">
                    {(content.title || content.description) && (
                        <div className="mb-4">
                            {content.title && <h3 className={cn("text-lg font-semibold", textColor)}>{content.title}</h3>}
                            {content.description && <p className={cn("text-sm mt-1", textColorMuted)}>{content.description}</p>}
                        </div>
                    )}
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className={cn("size-6 animate-spin", textColorMuted)} />
                    </div>
                </div>
            )
        }
        return (
            <BlockContainer title={content.title} description={content.description}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            </BlockContainer>
        )
    }

    // No action plans found - only show if no action plans exist at all
    if (allBlocks.length === 0) {
        if (layoutStyle === 'bold') {
            return (
                <div className="bg-primary rounded-lg p-5">
                    {(content.title || content.description) && (
                        <div className="mb-4">
                            {content.title && <h3 className={cn("text-lg font-semibold", textColor)}>{content.title}</h3>}
                            {content.description && <p className={cn("text-sm mt-1", textColorMuted)}>{content.description}</p>}
                        </div>
                    )}
                    <div className={cn("text-center py-6 px-4 rounded-lg", bgOverlay)}>
                        <p className={cn("text-sm", textColorMuted)}>
                            No action plans found
                        </p>
                    </div>
                </div>
            )
        }
        return (
            <BlockContainer title={content.title} description={content.description}>
                <div className="text-center py-6 px-4 rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                        No action plans found
                    </p>
                </div>
            </BlockContainer>
        )
    }

    // All tasks completed
    if (!nextTask && progress.total > 0) {
        if (layoutStyle === 'bold') {
            return (
                <div className="bg-primary rounded-lg p-5">
                    {(content.title || content.description) && (
                        <div className="mb-4">
                            {content.title && <h3 className={cn("text-lg font-semibold", textColor)}>{content.title}</h3>}
                            {content.description && <p className={cn("text-sm mt-1", textColorMuted)}>{content.description}</p>}
                        </div>
                    )}
                    <div className={cn("relative overflow-hidden rounded-xl p-6 text-center", bgOverlay)}>
                        <div className="flex flex-col items-center gap-3">
                            <div className={cn("size-12 rounded-full flex items-center justify-center", bgOverlayHover)}>
                                <PartyPopper className={cn("size-6", textColor)} />
                            </div>
                            <div>
                                <p className={cn("font-semibold text-lg", textColor)}>All tasks completed!</p>
                                <p className={cn("text-sm mt-1", textColorMuted)}>{progress.completed} of {progress.total} tasks done</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
        return (
            <BlockContainer title={content.title} description={content.description}>
                <div className="relative overflow-hidden rounded-xl p-6 text-center bg-emerald-50 border border-emerald-200">
                    <div className="flex flex-col items-center gap-3">
                        <div className="size-12 rounded-full flex items-center justify-center bg-emerald-100">
                            <PartyPopper className="size-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-lg text-emerald-700">All tasks completed!</p>
                            <p className="text-sm mt-1 text-emerald-600">{progress.completed} of {progress.total} tasks done</p>
                        </div>
                    </div>
                </div>
            </BlockContainer>
        )
    }

    // No tasks at all
    if (!nextTask) {
        if (layoutStyle === 'bold') {
            return (
                <div className="bg-primary rounded-lg p-5">
                    {(content.title || content.description) && (
                        <div className="mb-4">
                            {content.title && <h3 className={cn("text-lg font-semibold", textColor)}>{content.title}</h3>}
                            {content.description && <p className={cn("text-sm mt-1", textColorMuted)}>{content.description}</p>}
                        </div>
                    )}
                    <div className={cn("text-center py-6 px-4 rounded-lg", bgOverlay)}>
                        <p className={cn("text-sm", textColorMuted)}>
                            No tasks found in the selected action plans.
                        </p>
                    </div>
                </div>
            )
        }
        return (
            <BlockContainer title={content.title} description={content.description}>
                <div className="text-center py-6 px-4 rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                        No tasks found in the selected action plans.
                    </p>
                </div>
            </BlockContainer>
        )
    }

    const dueStatus = getDueStatus(nextTask.task.dueDate)

    // For Bold style, render the entire block with brand color
    // Text color is #FFFFFF (white) or #000000 (black) based on brand color brightness
    if (layoutStyle === 'bold') {
        return (
            <div className="bg-primary rounded-lg p-5 relative overflow-hidden">
                {/* Confetti animation overlay */}
                {showConfetti && (
                    <div className={cn("absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm animate-in fade-in duration-300", useDarkText ? "bg-white/50" : "bg-black/30")}>
                        <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                            <PartyPopper className={cn("size-10", textColor)} />
                            <span className={cn("text-lg font-semibold", textColor)}>Great job!</span>
                        </div>
                    </div>
                )}

                {/* Block title & description */}
                {(content.title || content.description) && (
                    <div className="mb-4">
                        {content.title && (
                            <h3 className={cn("text-lg font-semibold", textColor)}>
                                {content.title}
                            </h3>
                        )}
                        {content.description && (
                            <p className={cn("text-sm mt-1", textColorMuted)}>
                                {content.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Progress indicator */}
                {showProgress && progress.total > 0 && (
                    <div className={cn("text-xs mb-3", textColorMuted)}>
                        {progress.remaining} of {progress.total} tasks remaining
                    </div>
                )}

                {/* Milestone name */}
                {showMilestoneName && nextTask.milestoneTitle && (
                    <div className={cn("text-xs font-medium mb-2 uppercase tracking-wide", textColorSubtle)}>
                        {nextTask.milestoneTitle}
                    </div>
                )}

                {/* Task card content */}
                <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {ctx.interactive && (
                        <button
                            onClick={handleComplete}
                            className={cn(
                                "shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110",
                                borderColor,
                                `hover:${borderColorHover}`,
                                `hover:${bgOverlayHover}`
                            )}
                        >
                            <Check className={cn("size-3.5 opacity-0 hover:opacity-100 transition-opacity", textColor)} />
                        </button>
                    )}

                    {/* Task details */}
                    <div className="flex-1 min-w-0">
                        <h4 className={cn("font-semibold text-base leading-tight", textColor)}>
                            {nextTask.task.title}
                        </h4>

                        {nextTask.task.description && (
                            <p className={cn("text-sm mt-1 line-clamp-2", textColorMuted)}>
                                {nextTask.task.description}
                            </p>
                        )}

                        {/* Meta row: due date, assignee */}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {/* Due date */}
                            {nextTask.task.dueDate && (
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs font-medium",
                                    dueStatus === 'overdue' && textColor,
                                    dueStatus === 'today' && textColor,
                                    dueStatus === 'upcoming' && textColorMuted
                                )}>
                                    {dueStatus === 'overdue' && <AlertCircle className="size-3.5" />}
                                    {dueStatus === 'today' && <Clock className="size-3.5" />}
                                    {dueStatus === 'upcoming' && <CalendarIcon className="size-3.5" />}
                                    <span>
                                        {dueStatus === 'overdue' && 'Overdue: '}
                                        {dueStatus === 'today' && 'Due today'}
                                        {dueStatus === 'upcoming' && format(new Date(nextTask.task.dueDate), 'd MMM')}
                                        {dueStatus === 'overdue' && format(new Date(nextTask.task.dueDate), 'd MMM')}
                                    </span>
                                </div>
                            )}

                            {/* Assignee */}
                            {nextTask.task.assignee && (
                                <div className="flex items-center gap-1.5">
                                    <Avatar className="size-5">
                                        <AvatarImage src={nextTask.task.assignee.avatarUrl} />
                                        <AvatarFallback className={cn("text-[10px]", bgOverlayHover, textColor)}>
                                            {getInitials(nextTask.task.assignee.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={cn("text-xs", textColorMuted)}>
                                        {nextTask.task.assignee.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Quick action button */}
                        {nextTask.task.quickAction && (
                            <div className="mt-3">
                                <button
                                    onClick={() => {
                                        if (nextTask.task.quickAction?.type === 'link' && nextTask.task.quickAction.url) {
                                            window.open(nextTask.task.quickAction.url, '_blank')
                                        }
                                    }}
                                    className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors", bgOverlayHover, textColor, `hover:${useDarkText ? 'bg-black/30' : 'bg-white/30'}`)}
                                >
                                    <Zap className="size-3" />
                                    {nextTask.task.quickAction.title}
                                </button>
                            </div>
                        )}

                        {/* View Task button */}
                        {/* View Task button */}
                        {ctx.interactive && nextTask.pageSlug && ctx.spaceId && (
                            <div className="mt-4 pt-3 border-t border-white/20">
                                <Link
                                    href={`/space/${ctx.spaceId}/shared/${nextTask.pageSlug}#block-${nextTask.blockId}`}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                        bgOverlayHover, textColor, 
                                        useDarkText ? "hover:bg-black/30" : "hover:bg-white/30"
                                    )}
                                >
                                    <Eye className="size-4" />
                                    View Task
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Light style - uses BlockContainer with normal styling
    return (
        <BlockContainer
            title={content.title}
            description={content.description}
        >
            <div className="relative overflow-hidden rounded-xl transition-all bg-white border border-grey-200 p-5">
                {/* Confetti animation overlay */}
                {showConfetti && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                            <PartyPopper className="size-10 text-emerald-500" />
                            <span className="text-lg font-semibold text-emerald-600">Great job!</span>
                        </div>
                    </div>
                )}

                {/* Progress indicator */}
                {showProgress && progress.total > 0 && (
                    <div className="text-xs mb-3 text-muted-foreground">
                        {progress.remaining} of {progress.total} tasks remaining
                    </div>
                )}

                {/* Milestone name */}
                {showMilestoneName && nextTask.milestoneTitle && (
                    <div className="text-xs font-medium mb-2 uppercase tracking-wide text-muted-foreground">
                        {nextTask.milestoneTitle}
                    </div>
                )}

                {/* Task card content */}
                <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {ctx.interactive && (
                        <button
                            onClick={handleComplete}
                            className="shrink-0 size-6 rounded-full border-2 border-grey-300 flex items-center justify-center transition-all hover:scale-110 hover:border-primary hover:bg-primary/10"
                        >
                            <Check className="size-3.5 text-primary opacity-0 hover:opacity-100 transition-opacity" />
                        </button>
                    )}

                    {/* Task details */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base leading-tight text-grey-900">
                            {nextTask.task.title}
                        </h4>

                        {nextTask.task.description && (
                            <p className="text-sm mt-1 line-clamp-2 text-muted-foreground">
                                {nextTask.task.description}
                            </p>
                        )}

                        {/* Meta row: due date, assignee */}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {/* Due date */}
                            {nextTask.task.dueDate && (
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs font-medium",
                                    dueStatus === 'overdue' && "text-red-600",
                                    dueStatus === 'today' && "text-amber-600",
                                    dueStatus === 'upcoming' && "text-muted-foreground"
                                )}>
                                    {dueStatus === 'overdue' && <AlertCircle className="size-3.5" />}
                                    {dueStatus === 'today' && <Clock className="size-3.5" />}
                                    {dueStatus === 'upcoming' && <CalendarIcon className="size-3.5" />}
                                    <span>
                                        {dueStatus === 'overdue' && 'Overdue: '}
                                        {dueStatus === 'today' && 'Due today'}
                                        {dueStatus === 'upcoming' && format(new Date(nextTask.task.dueDate), 'd MMM')}
                                        {dueStatus === 'overdue' && format(new Date(nextTask.task.dueDate), 'd MMM')}
                                    </span>
                                </div>
                            )}

                            {/* Assignee */}
                            {nextTask.task.assignee && (
                                <div className="flex items-center gap-1.5">
                                    <Avatar className="size-5">
                                        <AvatarImage src={nextTask.task.assignee.avatarUrl} />
                                        <AvatarFallback className="text-[10px] bg-grey-100 text-grey-600">
                                            {getInitials(nextTask.task.assignee.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                        {nextTask.task.assignee.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Quick action button */}
                        {nextTask.task.quickAction && (
                            <div className="mt-3">
                                <QuickActionPill 
                                    quickAction={nextTask.task.quickAction}
                                    onClick={() => {
                                        if (nextTask.task.quickAction?.type === 'link' && nextTask.task.quickAction.url) {
                                            window.open(nextTask.task.quickAction.url, '_blank')
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* View Task button */}
                        {ctx.interactive && nextTask.pageSlug && ctx.spaceId && (
                            <div className="mt-4 pt-3 border-t border-grey-100">
                                <Link
                                    href={`/space/${ctx.spaceId}/shared/${nextTask.pageSlug}#block-${nextTask.blockId}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                                >
                                    <Eye className="size-4" />
                                    View Task
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BlockContainer>
    )
}

// ============================================================================
// Action Plan Progress Block
// ============================================================================

interface ActionPlanProgressBlockProps {
    blockId: string
    content: ActionPlanProgressContent
}

function ActionPlanProgressBlock({ blockId, content }: ActionPlanProgressBlockProps) {
    const ctx = useContext(BlockContext)
    const [fetchedBlocks, setFetchedBlocks] = useState<Block[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const viewMode = content.viewMode || 'multiple'
    const showUpcomingTasks = content.showUpcomingTasks ?? true
    const maxUpcomingTasks = content.maxUpcomingTasks ?? 3

    // Get action plan blocks - combine context blocks (same page) with database fetch (other pages)
    // If actionPlanBlockIds is empty/undefined or is "all", fetch ALL action plans for the space
    useEffect(() => {
        async function fetchActionPlans() {
            // Handle empty or undefined actionPlanBlockIds - means select all
            const rawBlockIds = content.actionPlanBlockIds
            const blockIds = Array.isArray(rawBlockIds) ? rawBlockIds : []
            const selectAll = !blockIds.length
            
            // Start with blocks from context (blocks on the same page in editor mode)
            let foundBlocks: Block[] = []
            let missingIds: string[] = selectAll ? [] : [...(Array.isArray(blockIds) ? blockIds : [])]

            if (ctx.allBlocks) {
                const contextBlocks = selectAll
                    ? ctx.allBlocks.filter(b => b.type === 'action_plan')
                    : ctx.allBlocks.filter(
                        b => b.type === 'action_plan' && Array.isArray(blockIds) && blockIds.includes(b.id)
                    )
                foundBlocks = contextBlocks
                
                // Find which IDs are still missing (might be on other pages)
                if (!selectAll && Array.isArray(blockIds)) {
                    const foundIds = new Set(contextBlocks.map(b => b.id))
                    missingIds = blockIds.filter((id: string) => !foundIds.has(id))
                }
            }

            // If we have specific IDs and found all from context, we're done
            if (!selectAll && missingIds.length === 0) {
                setFetchedBlocks(foundBlocks)
                setIsLoading(false)
                return
            }

            // Fetch blocks from database (for blocks on other pages or in portal mode)
            try {
                const supabase = createClient()
                
                if (selectAll) {
                    // Fetch all action plans for the space via pages
                    if (ctx.spaceId) {
                        const { data: pages } = await supabase
                            .from('pages')
                            .select('id')
                            .eq('space_id', ctx.spaceId)
                        
                        if (pages && pages.length > 0) {
                            const pageIds = pages.map(p => p.id)
                            const { data: dbBlocks } = await supabase
                                .from('blocks')
                                .select('id, type, content, sort_order')
                                .eq('type', 'action_plan')
                                .in('page_id', pageIds)
                            
                            // Merge and dedupe with context blocks
                            const contextIds = new Set(foundBlocks.map(b => b.id))
                            const uniqueDbBlocks = (dbBlocks || []).filter(b => !contextIds.has(b.id))
                            setFetchedBlocks([...foundBlocks, ...uniqueDbBlocks])
                        } else {
                            setFetchedBlocks(foundBlocks)
                        }
                    } else {
                        setFetchedBlocks(foundBlocks)
                    }
                } else {
                    // Fetch specific IDs
                    const { data: dbBlocks } = await supabase
                        .from('blocks')
                        .select('id, type, content, sort_order')
                        .eq('type', 'action_plan')
                        .in('id', missingIds)
                    
                    const allFoundBlocks = [...foundBlocks, ...(dbBlocks || [])]
                    setFetchedBlocks(allFoundBlocks)
                }
            } catch (error) {
                console.error('Failed to fetch action plan blocks:', error)
                setFetchedBlocks(foundBlocks)
            } finally {
                setIsLoading(false)
            }
        }

        fetchActionPlans()
    }, [ctx.spaceId, ctx.allBlocks, content.actionPlanBlockIds])

    // Use fetched blocks for all operations
    const allBlocks = fetchedBlocks

    // Calculate progress for a single action plan
    const calculatePlanProgress = (block: Block) => {
        const actionPlanContent = block.content as ActionPlanContent
        const milestones = actionPlanContent.milestones || []
        let total = 0
        let completed = 0

        for (const milestone of milestones) {
            for (const task of milestone.tasks || []) {
                total++
                const compositeId = `${block.id}-${milestone.id}-${task.id}`
                if (ctx.tasks?.[compositeId] === 'completed') {
                    completed++
                }
            }
        }

        return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
    }

    // Get upcoming tasks for a single action plan
    const getUpcomingTasks = (block: Block) => {
        const actionPlanContent = block.content as ActionPlanContent
        const milestones = actionPlanContent.milestones || []
        const tasks: Array<{
            title: string
            dueDate?: string
            milestoneName: string
        }> = []

        for (const milestone of milestones) {
            for (const task of milestone.tasks || []) {
                const compositeId = `${block.id}-${milestone.id}-${task.id}`
                if (ctx.tasks?.[compositeId] !== 'completed') {
                    tasks.push({
                        title: task.title,
                        dueDate: task.dueDate,
                        milestoneName: milestone.title,
                    })
                }
            }
        }

        // Sort by due date (soonest first, no date last)
        tasks.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })

        return tasks.slice(0, maxUpcomingTasks)
    }

    // Get next due date for a plan
    const getNextDueDate = (block: Block) => {
        const tasks = getUpcomingTasks(block)
        const taskWithDate = tasks.find(t => t.dueDate)
        if (!taskWithDate?.dueDate) return null

        const date = new Date(taskWithDate.dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        date.setHours(0, 0, 0, 0)

        const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff < 0) return { text: 'Overdue', isOverdue: true }
        if (daysDiff === 0) return { text: 'Today', isOverdue: false }
        if (daysDiff === 1) return { text: 'Tomorrow', isOverdue: false }
        return { text: format(date, 'd MMM'), isOverdue: false }
    }

    // Loading state
    if (isLoading) {
        return (
            <BlockContainer title={content.title} description={content.description}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            </BlockContainer>
        )
    }

    // Empty state - only show if no action plans exist at all
    if (allBlocks.length === 0) {
        return (
            <BlockContainer title={content.title} description={content.description}>
                <div className="text-center py-8 bg-muted/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                        No action plans found
                    </p>
                </div>
            </BlockContainer>
        )
    }

    // Single mode - show milestones from one action plan
    if (viewMode === 'single' && allBlocks.length > 0) {
        const block = allBlocks[0]
        const actionPlanContent = block.content as ActionPlanContent
        const milestones = actionPlanContent.milestones || []
        const overallProgress = calculatePlanProgress(block)

        return (
            <BlockContainer title={content.title} description={content.description}>
                {/* Overall progress bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Overall progress</span>
                        <span>{overallProgress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${overallProgress.percentage}%` }}
                        />
                    </div>
                </div>

                {/* Milestones list */}
                <div className="space-y-3">
                    {milestones.map((milestone) => {
                        let milestoneTotal = 0
                        let milestoneCompleted = 0

                        for (const task of milestone.tasks || []) {
                            milestoneTotal++
                            const compositeId = `${block.id}-${milestone.id}-${task.id}`
                            if (ctx.tasks?.[compositeId] === 'completed') {
                                milestoneCompleted++
                            }
                        }

                        const milestonePercentage = milestoneTotal > 0 
                            ? Math.round((milestoneCompleted / milestoneTotal) * 100) 
                            : 0

                        const upcomingTasks = (milestone.tasks || [])
                            .filter(task => {
                                const compositeId = `${block.id}-${milestone.id}-${task.id}`
                                return ctx.tasks?.[compositeId] !== 'completed'
                            })
                            .slice(0, maxUpcomingTasks)

                        return (
                            <Tooltip key={milestone.id}>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-default">
                                        <CircularProgress
                                            value={milestonePercentage}
                                            size={32}
                                            strokeWidth={3}
                                            className="shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {milestone.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {milestoneCompleted} of {milestoneTotal} tasks
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {milestonePercentage}%
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                {showUpcomingTasks && upcomingTasks.length > 0 && (
                                    <TooltipContent side="right" className="max-w-xs p-3 bg-popover text-popover-foreground">
                                        <div className="space-y-2.5">
                                            <div className="text-xs font-medium opacity-70">
                                                Upcoming tasks
                                            </div>
                                            {upcomingTasks.map((task, idx) => (
                                                <div key={idx} className="flex items-start gap-2">
                                                    <Circle className="size-3 mt-0.5 opacity-40" />
                                                    <div>
                                                        <div className="text-sm font-medium">{task.title}</div>
                                                        {task.dueDate && (
                                                            <div className="text-xs opacity-60">
                                                                {format(new Date(task.dueDate), 'd MMM')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )
                    })}
                </div>
            </BlockContainer>
        )
    }

    // Multiple mode - show cards for each action plan
    return (
        <BlockContainer title={content.title} description={content.description}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allBlocks.map((block) => {
                    const actionPlanContent = block.content as ActionPlanContent
                    const progress = calculatePlanProgress(block)
                    const upcomingTasks = getUpcomingTasks(block)
                    const nextDue = getNextDueDate(block)

                    return (
                        <Tooltip key={block.id}>
                            <TooltipTrigger asChild>
                                <div className="p-4 rounded-lg border border-grey-200 hover:border-grey-300 hover:bg-grey-50/50 transition-all cursor-default">
                                    <div className="flex items-start gap-3">
                                        <div className="relative shrink-0">
                                            <CircularProgress
                                                value={progress.percentage}
                                                size={40}
                                                strokeWidth={3}
                                            />
                                            {progress.percentage < 100 && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                                                    {progress.percentage}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {actionPlanContent.title || 'Action Plan'}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {progress.completed} of {progress.total} tasks
                                            </div>
                                            {nextDue && (
                                                <div className={cn(
                                                    "flex items-center gap-1 text-xs mt-1.5",
                                                    nextDue.isOverdue ? "text-red-600" : "text-muted-foreground"
                                                )}>
                                                    <Circle className={cn(
                                                        "size-2",
                                                        nextDue.isOverdue ? "fill-red-500 text-red-500" : "fill-primary text-primary"
                                                    )} />
                                                    Next due: {nextDue.text}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            {showUpcomingTasks && upcomingTasks.length > 0 && (
                                <TooltipContent side="bottom" className="max-w-xs p-3 bg-popover text-popover-foreground">
                                    <div className="space-y-2.5">
                                        <div className="text-xs font-medium opacity-70">
                                            Next {upcomingTasks.length} upcoming task{upcomingTasks.length !== 1 ? 's' : ''}
                                        </div>
                                        {upcomingTasks.map((task, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <Circle className="size-3 mt-0.5 opacity-40" />
                                                <div>
                                                    <div className="text-sm font-medium">{task.title}</div>
                                                    {task.dueDate && (
                                                        <div className="text-xs opacity-60">
                                                            {format(new Date(task.dueDate), 'd MMM')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TooltipContent>
                            )}
                        </Tooltip>
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
export type { BlockInteractionContext, NextTaskBlockContent, ActionPlanProgressContent }
