'use client'

import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Mail, Phone, Calendar as CalendarIcon, ExternalLink, FileUp, ListChecks, Check, Loader2, Download, Trash2, X, FileText, FileSpreadsheet, Image as ImageIcon, File } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { usePortal } from './portal-context'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'
import { uploadFile as saveFileToDb } from '@/app/portal/actions'

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
        case 'question':
            return <QuestionRenderer blockId={block.id} content={block.content} />
        case 'checklist':
            return <ChecklistRenderer blockId={block.id} content={block.content} />
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
    const status = state.tasks[blockId] || 'pending'
    const isCompleted = status === 'completed'

    return (
        <div
            className={cn(
                "group relative border-2 rounded-2xl p-6 transition-all duration-300 mb-6 cursor-pointer",
                isCompleted
                    ? "bg-emerald-50/30 border-emerald-100 shadow-sm"
                    : "bg-white border-muted/50 hover:border-primary/20 shadow-sm hover:shadow-md"
            )}
            onClick={() => toggleTask(blockId)}
        >
            <div className="flex items-start gap-5">
                <div className="pt-1">
                    <div className={cn(
                        "size-6 rounded-lg border-2 flex items-center justify-center transition-colors shadow-inner",
                        isCompleted ? "bg-emerald-500 border-emerald-500" : "bg-white border-muted"
                    )}>
                        {isCompleted && <Check className="size-4 text-white stroke-[3px]" />}
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                        <h4 className={cn(
                            "font-bold text-lg tracking-tight transition-all",
                            isCompleted ? "text-emerald-900/40 line-through decoration-emerald-500/30" : "text-foreground"
                        )}>
                            {content.title || 'Namnlös uppgift'}
                        </h4>
                        <Badge
                            variant="outline"
                            className={cn(
                                "transition-colors font-bold tracking-wider text-[10px] uppercase",
                                isCompleted
                                    ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                                    : "bg-amber-50 border-amber-100 text-amber-700"
                            )}
                        >
                            {isCompleted ? 'Klar' : 'Väntar'}
                        </Badge>
                    </div>
                    {(content.description || content.dueDate) && !isCompleted && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                            {content.description && (
                                <p className="text-muted-foreground text-sm leading-relaxed">{content.description}</p>
                            )}
                            {content.dueDate && (
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 bg-muted/50 w-fit px-2 py-1 rounded-md">
                                    <CalendarIcon className="size-3" />
                                    <span>Deadline: {format(new Date(content.dueDate), 'd MMMM, yyyy', { locale: sv })}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
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
            alert(`Max ${content.maxFiles} fil(er) tillåtna`)
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
            alert('Kunde inte ladda upp filen: ' + error.message)
            setIsUploading(false)
            setProgress(0)
        }
    }

    return (
        <div className="space-y-4 mb-8">
            <div className="bg-white border-2 border-dashed border-muted rounded-2xl p-8 hover:border-primary/30 transition-colors group relative overflow-hidden">
                <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={onUpload}
                    disabled={isUploading}
                    accept={content.acceptedTypes?.join(',')}
                />

                <div className="text-center space-y-4">
                    <div className="mx-auto size-14 rounded-full bg-primary/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                        {isUploading ? (
                            <Loader2 className="size-7 text-primary animate-spin" />
                        ) : (
                            <FileUp className="size-7 text-primary" />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <h4 className="font-bold text-lg tracking-tight">{content.label || 'Ladda upp fil'}</h4>
                        <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                            {content.description || 'Klicka här eller dra och släpp filen för att ladda upp den.'}
                        </p>
                    </div>
                    {isUploading && (
                        <div className="max-w-xs mx-auto space-y-2 animate-in fade-in duration-300">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Laddar upp...</p>
                        </div>
                    )}
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Uppladdade filer ({files.length})</p>
                    <div className="grid gap-2">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                                        <FileUp className="size-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate pr-4">{file.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB • {format(new Date(file.created_at), 'd MMM yyyy', { locale: sv })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity pr-1">
                                    <button
                                        onClick={() => removeFile(blockId, file.id)}
                                        className="p-2 hover:bg-destructive/5 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function FileDownloadRenderer({ content }: { content: any }) {
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
        <div className="space-y-6 mb-8">
            {(content.title || content.description) && (
                <div className="space-y-2">
                    {content.title && (
                        <h4 className="font-bold text-xl tracking-tight text-foreground">{content.title}</h4>
                    )}
                    {content.description && (
                        <p className="text-sm text-muted-foreground/70 leading-relaxed">{content.description}</p>
                    )}
                </div>
            )}

            {files.length > 0 && (
                <div className="grid gap-3">
                    {files.map((file: any) => {
                        const Icon = getFileIcon(file.type)
                        const iconColor = getFileIconColor(file.type)

                        return (
                            <div
                                key={file.id}
                                className="group flex items-center gap-4 p-4 bg-white border-2 border-muted/50 rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                                onClick={() => handleDownload(file)}
                            >
                                <div className={cn("p-3 rounded-lg shrink-0", iconColor)}>
                                    <Icon className="size-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <div className="shrink-0 p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Download className="size-5" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {files.length === 0 && (content.title || content.description) && (
                <div className="text-center p-8 rounded-xl border-2 border-dashed bg-muted/10">
                    <p className="text-sm text-muted-foreground italic">Inga filer uppladdade än</p>
                </div>
            )}
        </div>
    )
}

function QuestionRenderer({ blockId, content }: { blockId: string; content: any }) {
    const { state, updateResponse } = usePortal()
    const value = state.responses[blockId] || {}
    const [saving, setSaving] = useState(false)

    const handleChange = async (newValue: any) => {
        setSaving(true)
        await updateResponse(blockId, newValue)
        setSaving(false)
    }

    return (
        <div className="bg-white border-2 border-muted/50 rounded-2xl p-8 shadow-sm mb-8 space-y-6 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/5 group-hover:bg-primary/20 transition-colors" />

            <div className="flex items-start justify-between gap-4">
                <h4 className="font-bold text-xl tracking-tight text-foreground leading-snug">
                    {content.question || 'Ställ en fråga...'}
                    {content.required && <span className="text-destructive ml-1">*</span>}
                </h4>
                {saving && <Loader2 className="size-4 text-primary animate-spin mt-1" />}
            </div>

            <div className="space-y-4">
                {content.type === 'text' && (
                    <Input
                        placeholder="Ditt svar..."
                        value={value.text || ''}
                        onChange={(e) => updateResponse(blockId, { text: e.target.value })}
                        onBlur={() => handleChange({ text: value.text })}
                        className="h-12 rounded-xl border-2 focus-visible:ring-primary/20"
                    />
                )}
                {content.type === 'textarea' && (
                    <Textarea
                        placeholder="Skriv ett längre svar..."
                        value={value.text || ''}
                        onChange={(e) => updateResponse(blockId, { text: e.target.value })}
                        onBlur={() => handleChange({ text: value.text })}
                        className="min-h-[120px] rounded-xl border-2 focus-visible:ring-primary/20"
                    />
                )}
                {content.type === 'select' && (
                    <Select
                        value={value.selected || ''}
                        onValueChange={(val) => handleChange({ selected: val })}
                    >
                        <SelectTrigger className="h-12 rounded-xl border-2">
                            <SelectValue placeholder="Välj ett alternativ..." />
                        </SelectTrigger>
                        <SelectContent>
                            {(content.options || []).map((o: string) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {content.type === 'multiselect' && (
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        {(content.options || []).map((o: string) => {
                            const isChecked = (value.selected || []).includes(o)
                            return (
                                <div
                                    key={o}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                        isChecked ? "border-primary/40 bg-primary/5" : "border-muted/50 hover:border-muted-foreground/30 bg-muted/5"
                                    )}
                                    onClick={() => {
                                        const current = value.selected || []
                                        const next = isChecked ? current.filter((v: string) => v !== o) : [...current, o]
                                        handleChange({ selected: next })
                                    }}
                                >
                                    <div className={cn(
                                        "size-5 rounded border-2 flex items-center justify-center",
                                        isChecked ? "bg-primary border-primary" : "bg-white border-muted-foreground/20"
                                    )}>
                                        {isChecked && <Check className="size-3.5 text-white stroke-[3px]" />}
                                    </div>
                                    <span className={cn("text-sm font-bold", isChecked ? "text-primary" : "text-muted-foreground pr-8")}>{o}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
                {content.type === 'date' && (
                    <div className="relative">
                        <Input
                            type="date"
                            value={value.date || ''}
                            onChange={(e) => handleChange({ date: e.target.value })}
                            className="h-12 rounded-xl border-2 focus-visible:ring-primary/20"
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 pr-1">
                <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-opacity duration-300",
                    value.text || value.selected || value.date ? "opacity-30" : "opacity-0"
                )}>
                    <Check className="size-3" />
                    Sparat
                </div>
            </div>
        </div>
    )
}

function ChecklistRenderer({ blockId, content }: { blockId: string; content: any }) {
    const { state, updateResponse } = usePortal()
    const response = state.responses[blockId] || { checked: [] }
    const checkedIds = response.checked || []

    const toggleItem = async (itemId: string) => {
        const next = checkedIds.includes(itemId)
            ? checkedIds.filter((id: string) => id !== itemId)
            : [...checkedIds, itemId]

        await updateResponse(blockId, { checked: next })
    }

    return (
        <div className="bg-white border-2 border-muted/50 rounded-2xl p-8 shadow-sm mb-8 space-y-6 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors" />

            {content.title && (
                <div className="flex items-center gap-3">
                    <ListChecks className="size-5 text-emerald-600/50" />
                    <h4 className="font-bold text-xl tracking-tight text-foreground">{content.title}</h4>
                </div>
            )}

            <div className="grid gap-3">
                {(content.items || []).map((item: any) => {
                    const isChecked = checkedIds.includes(item.id)
                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                isChecked ? "border-emerald-200 bg-emerald-50/20" : "border-muted/50 hover:border-muted-foreground/20 bg-muted/5"
                            )}
                            onClick={() => toggleItem(item.id)}
                        >
                            <div className={cn(
                                "size-6 rounded-lg border-2 flex items-center justify-center transition-colors shadow-inner shrink-0",
                                isChecked ? "bg-emerald-500 border-emerald-500" : "bg-white border-muted"
                            )}>
                                {isChecked && <Check className="size-4 text-white stroke-[3px]" />}
                            </div>
                            <span className={cn(
                                "text-sm font-bold transition-all",
                                isChecked ? "text-emerald-900/40 line-through decoration-emerald-500/30" : "text-foreground"
                            )}>
                                {item.label || 'Ny punkt...'}
                            </span>
                        </div>
                    )
                })}
            </div>
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
        <div className="rounded-2xl border-2 border-muted/50 overflow-hidden bg-black aspect-video shadow-xl mb-10 group relative">
            <iframe
                src={getEmbedUrl(content.url)}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white text-[10px] font-bold uppercase tracking-widest border border-white/20 hover:bg-black/70 transition-colors"
                >
                    Öppna extern länk
                    <ExternalLink className="size-3" />
                </a>
            </div>
        </div>
    )
}

function ContactCardRenderer({ content }: { content: any }) {
    const initials = content.name ? content.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'

    return (
        <Card className="p-8 border-2 bg-white shadow-sm hover:shadow-xl transition-all duration-500 mb-10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 scale-150">
                <Mail className="size-32" />
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 relative">
                <Avatar className="size-28 border-4 border-background shadow-2xl group-hover:scale-105 transition-transform duration-500">
                    <AvatarImage src={content.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/5 to-primary/20 text-primary text-3xl font-extrabold tracking-tighter transition-colors group-hover:bg-primary/10">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="space-y-4 flex-1 min-w-0 text-center sm:text-left">
                    <div className="space-y-1">
                        <h4 className="text-3xl font-black tracking-tight text-foreground truncate pr-4">{content.name || 'Ange ett namn...'}</h4>
                        {content.title && (
                            <p className="text-sm font-bold uppercase tracking-widest text-primary/60">
                                {content.title}
                            </p>
                        )}
                    </div>

                    <div className="h-px bg-muted w-20 mx-auto sm:ml-0" />

                    <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-3 pt-2">
                        {content.email && (
                            <a href={`mailto:${content.email}`} className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground hover:text-primary transition-colors pr-2">
                                <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                    <Mail className="size-4" />
                                </div>
                                <span className="truncate">{content.email}</span>
                            </a>
                        )}
                        {content.phone && (
                            <a href={`tel:${content.phone}`} className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                                <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                    <Phone className="size-4" />
                                </div>
                                <span>{content.phone}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}

function DividerRenderer({ content }: { content: any }) {
    if (content.style === 'space') {
        return <div className="h-16" />
    }
    return (
        <div className="py-12 flex items-center gap-4">
            <div className="h-px bg-muted flex-1" />
            <div className="size-1 bg-muted rounded-full" />
            <div className="size-1.5 bg-muted/50 rounded-full" />
            <div className="size-1 bg-muted rounded-full" />
            <div className="h-px bg-muted flex-1" />
        </div>
    )
}
