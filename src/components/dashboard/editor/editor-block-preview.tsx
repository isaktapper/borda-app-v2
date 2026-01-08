'use client'

import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, Phone, Calendar as CalendarIcon, FileUp, Check, Download, FileText, FileSpreadsheet, Image as ImageIcon, File } from 'lucide-react'
import { format } from 'date-fns'

interface Block {
    id: string
    type: string
    content: any
    sort_order: number
}

/**
 * EditorBlockPreview - Renders blocks exactly as they appear in the portal
 * but without interactive functionality (non-editable preview)
 */
export function EditorBlockPreview({ block }: { block: Block }) {
    switch (block.type) {
        case 'text':
            return <TextPreview content={block.content} />
        case 'task':
            return <TaskPreview content={block.content} />
        case 'file_upload':
            return <FileUploadPreview content={block.content} />
        case 'file_download':
            return <FileDownloadPreview content={block.content} />
        case 'form':
            return <FormPreview content={block.content} />
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

// Text Block - Matches portal rendering
function TextPreview({ content }: { content: any }) {
    if (content.html) {
        return (
            <div
                className="prose prose-sm max-w-none portal-text-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html) }}
            />
        )
    }

    // Backward compatibility with old { variant, text } format
    return (
        <div className={cn(
            "text-foreground/90 leading-relaxed max-w-none",
            content.variant === 'h1' && "text-4xl font-extrabold tracking-tight mb-6 text-foreground",
            content.variant === 'h2' && "text-2xl font-bold tracking-tight mt-12 mb-6 text-foreground",
            content.variant === 'h3' && "text-xl font-semibold mt-8 mb-4 text-foreground",
            content.variant === 'p' && "text-base mb-4 text-muted-foreground/80"
        )}>
            {content.text || <span className="text-muted-foreground/50 italic">Empty text block</span>}
        </div>
    )
}

// Task Block - Matches portal styling
function TaskPreview({ content }: { content: any }) {
    const tasks = content.tasks || []

    if (tasks.length === 0) {
        return (
            <div className="border rounded-lg p-5 bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">No tasks added yet</p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg p-5 bg-white/90 dark:bg-card backdrop-blur-sm space-y-2">
            {tasks.map((task: any) => (
                <div
                    key={task.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                >
                    <div className="pt-0.5">
                        <div className="size-4 rounded border-2 border-muted bg-white dark:bg-background" />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-foreground">
                                {task.title || 'Untitled task'}
                            </span>
                            {task.description && (
                                <div className="size-4 rounded-full bg-muted/50 flex items-center justify-center">
                                    <span className="text-[10px] text-muted-foreground">i</span>
                                </div>
                            )}
                        </div>
                        {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                <CalendarIcon className="size-3" />
                                <span>{format(new Date(task.dueDate), 'd MMM')}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// File Upload Block - Matches portal styling
function FileUploadPreview({ content }: { content: any }) {
    return (
        <div className="bg-white/90 dark:bg-card backdrop-blur-sm border border-dashed rounded-lg p-5">
            <div className="text-center space-y-3">
                <div className="mx-auto size-12 rounded-lg bg-primary/5 flex items-center justify-center">
                    <FileUp className="size-6 text-primary" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-base">{content.label || 'Upload file'}</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {content.description || 'Click here or drag and drop your file'}
                    </p>
                </div>
            </div>
        </div>
    )
}

// File Download Block - Matches portal styling
function FileDownloadPreview({ content }: { content: any }) {
    const files = content.files || []

    const getFileIcon = (type: string) => {
        if (type?.includes('pdf')) return FileText
        if (type?.includes('word') || type?.includes('document')) return FileText
        if (type?.includes('excel') || type?.includes('spreadsheet') || type?.includes('csv')) return FileSpreadsheet
        if (type?.includes('image')) return ImageIcon
        return File
    }

    const getFileIconColor = (type: string): string => {
        if (type?.includes('pdf')) return 'text-red-500 bg-red-50 dark:bg-red-950'
        if (type?.includes('word') || type?.includes('document')) return 'text-blue-500 bg-blue-50 dark:bg-blue-950'
        if (type?.includes('excel') || type?.includes('spreadsheet') || type?.includes('csv')) return 'text-green-500 bg-green-50 dark:bg-green-950'
        if (type?.includes('image')) return 'text-purple-500 bg-purple-50 dark:bg-purple-950'
        return 'text-muted-foreground bg-muted'
    }

    const formatFileSize = (bytes: number): string => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="space-y-3">
            {(content.title || content.description) && (
                <div className="space-y-1">
                    {content.title && (
                        <h4 className="font-semibold text-base text-foreground">{content.title}</h4>
                    )}
                    {content.description && (
                        <p className="text-sm text-muted-foreground">{content.description}</p>
                    )}
                </div>
            )}

            {files.length > 0 ? (
                <div className="space-y-2">
                    {files.map((file: any) => {
                        const Icon = getFileIcon(file.type)
                        const iconColor = getFileIconColor(file.type)

                        return (
                            <div
                                key={file.id}
                                className="flex items-center gap-3 p-3 bg-white/90 dark:bg-card backdrop-blur-sm border rounded-lg"
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
        </div>
    )
}

// Form Block - Matches portal styling
function FormPreview({ content }: { content: any }) {
    const questions = content.questions || []

    if (questions.length === 0) {
        return (
            <div className="border rounded-lg p-5 bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">No questions added yet</p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg p-5 bg-white/90 dark:bg-card backdrop-blur-sm space-y-4">
            {questions.map((question: any) => (
                <div key={question.id} className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">
                        {question.question || 'Untitled question'}
                        {question.required && <span className="text-destructive ml-1">*</span>}
                    </h4>

                    <div>
                        {question.type === 'text' && (
                            <div className="h-9 bg-muted/30 rounded border px-3 flex items-center">
                                <span className="text-sm text-muted-foreground">Short answer...</span>
                            </div>
                        )}
                        {question.type === 'textarea' && (
                            <div className="min-h-[80px] bg-muted/30 rounded border p-3">
                                <span className="text-sm text-muted-foreground">Long answer...</span>
                            </div>
                        )}
                        {question.type === 'select' && (
                            <div className="h-9 bg-muted/30 rounded border px-3 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Select an option...</span>
                                <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        )}
                        {question.type === 'multiselect' && (
                            <div className="grid sm:grid-cols-2 gap-2">
                                {(question.options || ['Option 1', 'Option 2']).slice(0, 4).map((o: string, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border"
                                    >
                                        <div className="size-4 rounded border-2 border-muted bg-white dark:bg-background shrink-0" />
                                        <span className="text-sm font-medium">{o}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {question.type === 'date' && (
                            <div className="h-9 bg-muted/30 rounded border px-3 flex items-center gap-2">
                                <CalendarIcon className="size-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Select date...</span>
                            </div>
                        )}
                        {!question.type && (
                            <div className="h-9 bg-muted/30 rounded border" />
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// Embed Block - Matches portal styling
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
        <div className="rounded-lg border overflow-hidden bg-black aspect-video">
            <iframe
                src={getEmbedUrl(content.url)}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    )
}

// Contact Card Block - Matches portal styling
function ContactPreview({ content }: { content: any }) {
    const initials = content.name
        ? content.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    return (
        <div className="bg-white/90 dark:bg-card backdrop-blur-sm border rounded-lg p-5">
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
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="size-4" />
                                <span className="truncate">{content.email}</span>
                            </div>
                        )}
                        {content.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="size-4" />
                                <span>{content.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Divider Block - Matches portal styling
function DividerPreview({ content }: { content: any }) {
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

