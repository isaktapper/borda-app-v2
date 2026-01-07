'use client'

import { cn } from '@/lib/utils'
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
import { Mail, Phone, Calendar as CalendarIcon, FileUp, ListChecks, Check, Loader2, Download, Trash2, FileText, FileSpreadsheet, Image as ImageIcon, File } from 'lucide-react'
import { format } from 'date-fns'
import { usePortal } from './portal-context'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'
import { uploadFile as saveFileToDb, logFileDownload } from '@/app/portal/actions'

interface Block {
    id: string
    type: string
    content: any
}

export function PortalBlockRenderer({ block }: { block: Block }) {
    switch (block.type) {
        case 'text':
            return <TextRenderer content={block.content} />
        case 'task':
            return <TaskRenderer blockId={block.id} content={block.content} />
        case 'file_upload':
            return <FileUploadRenderer blockId={block.id} content={block.content} />
        case 'file_download':
            return <FileDownloadRenderer content={block.content} />
        case 'form':
            return <FormRenderer blockId={block.id} content={block.content} />
        case 'embed':
            return <EmbedRenderer content={block.content} />
        case 'contact':
            return <ContactCardRenderer content={block.content} />
        case 'divider':
            return <DividerRenderer content={block.content} />
        default:
            return null
    }
}

function TextRenderer({ content }: { content: any }) {
    // Handle new HTML format
    if (content.html) {
        return (
            <div
                className="prose prose-sm max-w-none portal-text-content"
                dangerouslySetInnerHTML={{ __html: content.html }}
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
            {content.text}
        </div>
    )
}

function TaskRenderer({ blockId, content }: { blockId: string; content: any }) {
    const { state, toggleTask } = usePortal()
    const tasks = content.tasks || []

    if (tasks.length === 0) {
        return (
            <div className="border rounded-lg p-5 mb-4 bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">Inga uppgifter</p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg p-5 mb-4 bg-white/90 backdrop-blur-sm space-y-2">
            {tasks.map((task: any) => {
                const taskId = `${blockId}-${task.id}`
                const status = state.tasks[taskId] || 'pending'
                const isCompleted = status === 'completed'

                return (
                    <div
                        key={task.id}
                        className={cn(
                            "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                            isCompleted ? "bg-muted/20" : "hover:bg-muted/30"
                        )}
                        onClick={() => toggleTask(taskId, task.title)}
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
                            <div className="flex items-center gap-2 min-w-0">
                                {task.description ? (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={cn(
                                            "text-sm font-medium",
                                            isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                        )}>
                                            {task.title}
                                        </span>
                                        <div className="group/tooltip relative">
                                            <div className="size-4 rounded-full bg-muted/50 flex items-center justify-center cursor-help">
                                                <span className="text-[10px] text-muted-foreground">i</span>
                                            </div>
                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-10">
                                                <div className="bg-popover text-popover-foreground border rounded-lg p-3 shadow-md max-w-xs">
                                                    <p className="text-xs">{task.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                    )}>
                                        {task.title}
                                    </span>
                                )}
                            </div>
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
    )
}

function FileUploadRenderer({ blockId, content }: { blockId: string; content: any }) {
    const { state, projectId, addFile, removeFile } = usePortal()
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const files = state.files[blockId] || []

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 12)}.${fileExt}`
            const storagePath = `portal/${projectId}/${blockId}/${fileName}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(storagePath, file)

            if (uploadError) throw uploadError
            setProgress(70)

            const result = await saveFileToDb(
                blockId,
                projectId,
                file.name,
                file.type,
                file.size,
                storagePath
            )

            if (result.error) throw new Error(result.error)

            addFile(blockId, result.file)
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
        <div className="space-y-3 mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-dashed rounded-lg p-5 hover:border-primary/40 transition-colors relative">
                <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={onUpload}
                    disabled={isUploading}
                    accept={content.acceptedTypes?.join(',')}
                />

                <div className="text-center space-y-3">
                    <div className="mx-auto size-12 rounded-lg bg-primary/5 flex items-center justify-center">
                        {isUploading ? (
                            <Loader2 className="size-6 text-primary animate-spin" />
                        ) : (
                            <FileUp className="size-6 text-primary" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-semibold text-base">{content.label || 'Ladda upp fil'}</h4>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {content.description || 'Klicka här eller dra och släpp filen'}
                        </p>
                    </div>
                    {isUploading && (
                        <div className="max-w-xs mx-auto space-y-2">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-xs font-medium text-primary">Laddar upp...</p>
                        </div>
                    )}
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Uppladdade filer ({files.length})</p>
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-white/90 backdrop-blur-sm border rounded-lg hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-8 rounded bg-primary/5 flex items-center justify-center shrink-0">
                                        <FileUp className="size-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB • {format(new Date(file.created_at), 'd MMM yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(blockId, file.id)}
                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function FileDownloadRenderer({ content }: { content: any }) {
    const { projectId } = usePortal()
    const files = content.files || []

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return FileText
        if (type.includes('word') || type.includes('document')) return FileText
        if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return FileSpreadsheet
        if (type.includes('image')) return ImageIcon
        return File
    }

    const getFileIconColor = (type: string): string => {
        if (type.includes('pdf')) return 'text-red-500 bg-red-50'
        if (type.includes('word') || type.includes('document')) return 'text-blue-500 bg-blue-50'
        if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return 'text-green-500 bg-green-50'
        if (type.includes('image')) return 'text-purple-500 bg-purple-50'
        return 'text-muted-foreground bg-muted'
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const handleDownload = async (file: any) => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase.storage
                .from('project-files')
                .createSignedUrl(file.storagePath, 3600)

            if (error) throw error

            // Log the download activity
            await logFileDownload(projectId, file.id, file.name)

            // Open in new tab to trigger download
            window.open(data.signedUrl, '_blank')
        } catch (error) {
            console.error('Download error:', error)
            alert('Kunde inte ladda ner filen')
        }
    }

    if (files.length === 0 && !content.title && !content.description) {
        return null
    }

    return (
        <div className="space-y-3 mb-4">
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

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file: any) => {
                        const Icon = getFileIcon(file.type)
                        const iconColor = getFileIconColor(file.type)

                        return (
                            <div
                                key={file.id}
                                className="flex items-center gap-3 p-3 bg-white/90 backdrop-blur-sm border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
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
            )}

            {files.length === 0 && (content.title || content.description) && (
                <div className="text-center p-5 rounded-lg border border-dashed bg-muted/10">
                    <p className="text-sm text-muted-foreground">Inga filer uppladdade än</p>
                </div>
            )}
        </div>
    )
}

function FormRenderer({ blockId, content }: { blockId: string; content: any }) {
    const { state, updateResponse } = usePortal()
    const [savingId, setSavingId] = useState<string | null>(null)
    const questions = content.questions || []

    const handleChange = async (questionId: string, newValue: any) => {
        setSavingId(questionId)
        const responseKey = `${blockId}-${questionId}`
        await updateResponse(responseKey, newValue)
        setSavingId(null)
    }

    if (questions.length === 0) {
        return (
            <div className="border rounded-lg p-5 mb-4 bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">Inga frågor</p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg p-5 mb-4 bg-white/90 backdrop-blur-sm space-y-4">
            {questions.map((question: any) => {
                const responseKey = `${blockId}-${question.id}`
                const value = state.responses[responseKey] || {}
                const isSaving = savingId === question.id

                return (
                    <div key={question.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <h4 className="font-medium text-sm text-foreground">
                                {question.question}
                                {question.required && <span className="text-destructive ml-1">*</span>}
                            </h4>
                            {isSaving && <Loader2 className="size-3 text-primary animate-spin shrink-0" />}
                        </div>

                        <div>
                            {question.type === 'text' && (
                                <Input
                                    placeholder="Ditt svar..."
                                    value={value.text || ''}
                                    onChange={(e) => updateResponse(responseKey, { text: e.target.value })}
                                    onBlur={() => handleChange(question.id, { text: value.text })}
                                    className="h-9 text-sm"
                                />
                            )}
                            {question.type === 'textarea' && (
                                <Textarea
                                    placeholder="Skriv ett längre svar..."
                                    value={value.text || ''}
                                    onChange={(e) => updateResponse(responseKey, { text: e.target.value })}
                                    onBlur={() => handleChange(question.id, { text: value.text })}
                                    className="min-h-[80px] text-sm"
                                />
                            )}
                            {question.type === 'select' && (
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
                            )}
                            {question.type === 'multiselect' && (
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {(question.options || []).map((o: string) => {
                                        const isChecked = (value.selected || []).includes(o)
                                        return (
                                            <div
                                                key={o}
                                                className={cn(
                                                    "flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer",
                                                    isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                                                )}
                                                onClick={() => {
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
                                <Input
                                    type="date"
                                    value={value.date || ''}
                                    onChange={(e) => handleChange(question.id, { date: e.target.value })}
                                    className="h-9 text-sm"
                                />
                            )}
                        </div>

                        {(value.text || value.selected || value.date) && !isSaving && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Check className="size-3" />
                                <span>Sparat</span>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function EmbedRenderer({ content }: { content: any }) {
    if (!content.url) return null

    const getEmbedUrl = (url: string) => {
        if (url.includes('loom.com/share/')) return url.replace('loom.com/share/', 'loom.com/embed/')
        if (url.includes('youtube.com/watch?v=')) return `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`
        if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('/').pop()}`
        return url
    }

    return (
        <div className="rounded-lg border overflow-hidden bg-black aspect-video mb-4">
            <iframe
                src={getEmbedUrl(content.url)}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    )
}

function ContactCardRenderer({ content }: { content: any }) {
    const initials = content.name ? content.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'

    return (
        <div className="bg-white/90 backdrop-blur-sm border rounded-lg p-5 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Avatar className="size-16 border-2 border-background">
                    <AvatarImage src={content.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
                    <div className="space-y-0.5">
                        <h4 className="text-lg font-semibold text-foreground truncate">{content.name || 'Ange ett namn...'}</h4>
                        {content.title && (
                            <p className="text-sm text-muted-foreground">
                                {content.title}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                        {content.email && (
                            <a href={`mailto:${content.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                                <Mail className="size-4" />
                                <span className="truncate">{content.email}</span>
                            </a>
                        )}
                        {content.phone && (
                            <a href={`tel:${content.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                <Phone className="size-4" />
                                <span>{content.phone}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DividerRenderer({ content }: { content: any }) {
    if (content.style === 'space') {
        return <div className="h-8" />
    }
    return (
        <div className="py-6 flex items-center gap-3 mb-4">
            <div className="h-px bg-border flex-1" />
            <div className="size-1 bg-muted-foreground/30 rounded-full" />
            <div className="h-px bg-border flex-1" />
        </div>
    )
}
